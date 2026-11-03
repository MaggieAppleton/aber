import { generateText, streamText, stepCountIs, convertToModelMessages } from 'ai';
import type { LanguageModel, StepResult, Tool, UIMessage } from 'ai';
import { ulid } from 'ulid';
import { z } from 'zod';
import { modelFor, tokenCost, choiceFor } from './models.js';
import type { AgentDatabase, AgentInput, AgentSpec, ChatInput, RunContext, RunResult, ProviderName } from './types.js';
import { projectToolMessages } from './projection.js';
import { reserveSpend } from './spend-budget.js';

export class BudgetExceededError extends Error {
  constructor() { super('Daily agent spend cap reached; queued work waits until tomorrow'); this.name = 'BudgetExceededError'; }
}

export function daySpend(db: AgentDatabase, now = new Date()): number {
  const start = `${now.toISOString().slice(0, 10)}T00:00:00.000Z`;
  return (db.prepare('SELECT COALESCE(SUM(cost_usd),0) AS cost FROM agent_runs WHERE started_at>=?').get(start) as { cost: number }).cost;
}

export function spendCap(): number {
  const cap = Number(process.env.DAILY_SPEND_CAP_USD ?? 5);
  return Number.isFinite(cap) && cap >= 0 ? cap : 5;
}

export function assertBudget(db: AgentDatabase, now = new Date()): void {
  if (daySpend(db, now) >= spendCap()) throw new BudgetExceededError();
}

/** A conservative byte bound (plus framing) keeps even unusual Unicode <100k tokens. */
export function assertInputLimit(system: string, input: unknown, tools: Record<string, Tool>, max = 99_000): number {
  let imageAllowance = 0;
  const serialised = JSON.stringify(input, (key, value) => {
    if (value && typeof value === 'object' && value.type === 'file' && typeof value.mediaType === 'string' && value.mediaType.startsWith('image/')) {
      imageAllowance += 10_000; return { type: 'file', mediaType: value.mediaType, data: '[bounded image]' };
    }
    if (key === 'image') { imageAllowance += 10_000; return '[bounded image]'; }
    return value;
  });
  const schemaBytes = Object.entries(tools).reduce((total, [name, definition]) => {
    try { return total + Buffer.byteLength(JSON.stringify({ name, description: definition.description, input: z.toJSONSchema(definition.inputSchema as z.ZodType, { unrepresentable: 'any' }) })) + 256; }
    catch { return total + 2000; }
  }, 0);
  const bytes = Buffer.byteLength(system + serialised) + schemaBytes + imageAllowance + 4096;
  if (bytes >= Math.min(max, 100_000)) {
    const messages = Array.isArray(input) ? input : [];
    const sizes = messages.map(message => ({ role: message.role, bytes: Buffer.byteLength(JSON.stringify(message)) }));
    throw new Error(`Agent input exceeds its ${Math.min(max, 100_000)} token safety bound (${Buffer.byteLength(serialised)} context bytes, ${schemaBytes} schema bytes; messages ${JSON.stringify(sizes)}); narrow the context`);
  }
  return bytes;
}

function modelId(model: LanguageModel): string { return typeof model === 'string' ? model : model.modelId; }

function openRun(db: AgentDatabase, spec: AgentSpec, input: unknown, ctx: RunContext) {
  const runId = ulid();
  const now = ctx.now ?? (() => new Date());
  const provider: ProviderName = spec.provider ?? (process.env.AGENT_MODE === 'fake' ? 'fake' : spec.modelConfig?.provider ?? 'openai');
  const pricing = spec.modelConfig;
  if (pricing && (![pricing.inputPerMillion, pricing.outputPerMillion].every(rate => Number.isFinite(rate) && rate >= 0)
    || (provider !== 'fake' && provider !== pricing.provider))) throw new Error('Invalid agent model configuration or provider pricing');
  const model = spec.model ?? (process.env.AGENT_MODE !== 'fake' ? pricing?.model : undefined) ?? modelFor(spec.job, provider);
  if (typeof model === 'string') throw new Error('Agent models must be provider objects, never Gateway model strings');
  const tools = spec.tools(runId);
  db.prepare('INSERT INTO agent_runs (id,job_id,job,attempt,provider,model,prompt_version,status,started_at,trace_json,cost_usd) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(runId, ctx.jobId ?? null, spec.job, ctx.attempt ?? 1, provider, modelId(model), spec.promptVersion, 'running', now().toISOString(), '[]', 0);
  let inputTokens = 0, outputTokens = 0, cachedInputTokens = 0;
  const trace: unknown[] = pricing ? [{ type: 'model_config', provider: pricing.provider, inputPerMillion: pricing.inputPerMillion, outputPerMillion: pricing.outputPerMillion }] : [];
  let reservation: ReturnType<typeof reserveSpend> | undefined;
  let terminal: { status: 'done' | 'failed'; error: string | null; finishedAt: string } | undefined;
  const cost = (input: number, output: number) => provider === 'fake' ? 0 : pricing
    ? (input * pricing.inputPerMillion + output * pricing.outputPerMillion) / 1_000_000
    : tokenCost(spec.job, input, output, provider);
  const snapshot = () => ({ runId, inputTokens, outputTokens, costUsd: cost(inputTokens, outputTokens), trace });
  const persist = (status: 'running' | 'done' | 'failed', error: string | null = null) => {
    const nextTerminal = terminal ?? (status === 'running' ? undefined : { status, error, finishedAt: now().toISOString() });
    const stats = snapshot();
    // Later SDK steps may report usage after failure; keep its first terminal state.
    db.prepare('UPDATE agent_runs SET input_tokens=?,output_tokens=?,cached_input_tokens=?,cost_usd=?,status=?,error=?,trace_json=?,finished_at=? WHERE id=?')
      .run(inputTokens, outputTokens, cachedInputTokens, stats.costUsd, nextTerminal?.status ?? status, nextTerminal?.error ?? error, JSON.stringify(trace), nextTerminal?.finishedAt ?? null, runId);
    terminal = nextTerminal;
  };
  const fail = (error: unknown) => {
    if (terminal) return;
    reservation?.unknown(); reservation = undefined;
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    trace.push({ type: 'error', message });
    persist('failed', message);
  };
  const step = (result: StepResult<Record<string, Tool>>) => {
    inputTokens += result.usage.inputTokens ?? 0;
    outputTokens += result.usage.outputTokens ?? 0;
    cachedInputTokens += result.usage.inputTokenDetails.cacheReadTokens ?? 0;
    const entry = { step: trace.length + 1, text: result.text, toolCalls: result.toolCalls, toolResults: result.toolResults, content: result.content, usage: result.usage, finishReason: result.finishReason };
    trace.push(JSON.parse(JSON.stringify(entry, (key, value) => {
      if (['trace_json', 'traceJson', 'embedding'].includes(key)) return '[stored separately]';
      return value;
    })));
    persist('running');
    const pending = reservation; reservation = undefined;
    if (result.usage.inputTokens === undefined || result.usage.outputTokens === undefined) pending?.unknown();
    else pending?.settle(cost(result.usage.inputTokens, result.usage.outputTokens));
    if ((result.usage.inputTokens ?? 0) >= Math.min(spec.maxInputTokens, 100_000)) throw new Error('Provider reported input over the 100k safety limit');
  };
  const prepare = (messages: unknown, dispatch = false) => {
    const inputUpperBound = assertInputLimit(spec.system, messages, tools, spec.maxInputTokens);
    assertBudget(db, now());
    if (dispatch) {
      if (reservation) throw new Error('Previous model step has not reported its billable usage');
      reservation = reserveSpend(cost(inputUpperBound, spec.maxOutputTokens ?? 4000));
    }
  };
  try { prepare(input); } catch (error) { fail(error); throw error; }
  return { runId, model, tools, step, prepare, snapshot, persist, fail, now, isRunning: () => !terminal };
}

export async function runAgent(db: AgentDatabase, spec: AgentSpec, input: AgentInput, ctx: RunContext = {}): Promise<RunResult> {
  const run = openRun(db, spec, input, ctx);
  try {
    const result = await generateText({
      model: run.model, system: spec.system, ...input, tools: run.tools,
      stopWhen: stepCountIs(spec.maxSteps), maxOutputTokens: spec.maxOutputTokens ?? 4000, maxRetries: 0, abortSignal: ctx.signal,
      toolCallConcurrency: 1,
      prepareStep: ({ messages }) => { const projected = projectToolMessages(messages); run.prepare(projected, true); return { messages: projected }; },
      onStepFinish: run.step,
    });
    run.persist('done');
    return { ...run.snapshot(), text: result.text };
  } catch (error) { run.fail(error); throw error; }
}

export async function streamAgent(db: AgentDatabase, spec: AgentSpec, input: ChatInput, ctx: RunContext & { onReply: (parts: UIMessage['parts'], runId: string) => unknown | Promise<unknown> }): Promise<Response> {
  const run = openRun(db, spec, input, ctx);
  try {
    const messages = await convertToModelMessages(input.messages, { tools: run.tools, ignoreIncompleteToolCalls: true });
    const result = streamText({
      model: run.model, system: spec.system, messages, tools: run.tools,
      stopWhen: stepCountIs(spec.maxSteps), maxOutputTokens: spec.maxOutputTokens ?? 4000, maxRetries: 0, abortSignal: ctx.signal,
      toolCallConcurrency: 1,
      prepareStep: ({ messages: current }) => { const projected = projectToolMessages(current); run.prepare(projected, true); return { messages: projected }; },
      onStepFinish: run.step,
      onError: ({ error }) => { run.fail(error); },
      onAbort: () => { run.fail(new Error('Chat stream aborted')); },
    });
    return result.toUIMessageStreamResponse({
      originalMessages: input.messages,
      generateMessageId: ulid,
      sendReasoning: false,
      onFinish: async ({ responseMessage, isAborted, isCancelled, outcome }) => {
        if (!run.isRunning()) return;
        if (isAborted || isCancelled || ctx.signal?.aborted || outcome.status !== 'completed') {
          run.fail(outcome.status === 'failed' ? outcome.error ?? new Error('Chat stream failed') : new Error('Chat stream aborted before completion'));
          return;
        }
        try {
          await ctx.onReply(responseMessage.parts, run.runId);
          if (ctx.signal?.aborted) run.fail(new Error('Chat stream aborted'));
          else run.persist('done');
        } catch (error) { run.fail(error); throw error; }
      },
      onError: error => error instanceof Error ? error.message : 'Agent request failed',
    });
  } catch (error) { run.fail(error); throw error; }
}

export { modelFor, choiceFor };
