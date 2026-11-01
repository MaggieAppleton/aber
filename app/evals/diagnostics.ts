import { wrapLanguageModel } from 'ai';
import { choiceFor } from '../server/src/agents/models.js';
import type { AgentJob, ProviderName } from '../server/src/agents/types.js';

type Row = Record<string, any>;
export interface ToolFailure { runId: string; job: string; toolName: string; input: unknown; message: string }
export interface ModelContext { candidateTheoryIds?: string[]; candidateTheories?: { id: string; claim: string; status: string; editableDraftRelationships?: boolean }[]; signal?: { id: string; gist: string } }

/** Observe the provider-bound parameters without changing them or adding calls. */
export function observeContext(job: string, provider: ProviderName, context: ModelContext): () => void {
  if (provider === 'fake') return () => {};
  const choice = choiceFor(job as AgentJob, provider);
  const original = choice.model;
  if (typeof original === 'string') throw new Error('Eval model must be a provider object');
  choice.model = wrapLanguageModel({ model: original, middleware: {
    transformParams: async ({ params }) => {
      if (!context.candidateTheoryIds) for (const message of params.prompt) {
        if (message.role !== 'user') continue;
        for (const part of message.content) {
          if (part.type !== 'text') continue;
          try {
            const input = JSON.parse(part.text) as Row;
            if (Array.isArray(input.theories)) {
              context.candidateTheories = input.theories.map((theory: Row) => ({ id: theory.id, claim: theory.claim, status: theory.status, ...(typeof theory.editableDraftRelationships === 'boolean' ? { editableDraftRelationships: theory.editableDraftRelationships } : {}) }));
              context.candidateTheoryIds = context.candidateTheories!.map(theory => theory.id);
              if (input.signal) context.signal = { id: input.signal.id, gist: input.signal.gist };
            }
          } catch { /* Non-JSON conversational text is not the job context. */ }
        }
      }
      return params;
    },
  } });
  return () => { choice.model = original; };
}

export function traceDiagnostics(rows: Row[], job: string) {
  const authorityErrors: ToolFailure[] = [];
  const toolErrors: ToolFailure[] = [];
  const toolCalls: { runId: string; job: string; toolName: string; input: unknown }[] = [];
  const assistantTexts: { runId: string; job: string; text: string; finishedAt: string }[] = [];
  for (const run of rows) {
    let steps: Row[];
    try { steps = JSON.parse(run.trace_json ?? '[]'); } catch { continue; }
    for (const step of steps) {
      if (step.text) assistantTexts.push({ runId: run.id, job: run.job, text: step.text, finishedAt: run.finished_at ?? run.started_at });
      const calls = new Map<string, Row>((step.toolCalls ?? []).map((call: Row) => [call.toolCallId, call]));
      for (const call of calls.values()) toolCalls.push({ runId: run.id, job: run.job, toolName: call.toolName, input: call.input });
      const results = [...(step.toolResults ?? []), ...(step.content ?? []).filter((part: Row) => part.type === 'tool-error')];
      for (const result of results) {
        const error = result.output?.error ?? result.error;
        if (!error) continue;
        const call = calls.get(result.toolCallId);
        const message = typeof error === 'string' ? error : error.message ?? JSON.stringify(error);
        const failure = { runId: run.id, job: run.job, toolName: result.toolName ?? call?.toolName ?? 'unknown', input: result.input ?? call?.input, message };
        toolErrors.push(failure);
        if (error.name === 'AuthorityError' || /\bAuthorityError\b/.test(message)) authorityErrors.push(failure);
      }
      if (step.type === 'error' && /\bAuthorityError\b/.test(step.message ?? '')) authorityErrors.push({ runId: run.id, job: run.job, toolName: 'run', input: null, message: step.message });
    }
  }
  const texts = assistantTexts.filter(item => item.job === job).sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  const runs = rows.map(run => ({ runId: run.id, job: run.job, provider: run.provider, model: run.model, promptVersion: run.prompt_version, status: run.status, error: run.error, inputTokens: run.input_tokens, outputTokens: run.output_tokens, costUsd: run.cost_usd }));
  return { authorityErrors, toolErrors, toolCalls, lastAssistantText: texts.at(-1)?.text ?? '', assistantTexts, runs };
}
