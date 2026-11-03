import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';
import { TypeSafeClient, type Questions, type SystemOneRequest, type SystemOneResult } from '@typesafe-ai/sdk';
import { recordedAdapter } from './adapters.js';
import { BudgetExceededError, daySpend, spendCap } from './run.js';
import type { AgentDatabase, AgentJob, RunContext } from './types.js';

export const JEV_MODEL = 'jev-1.14.0';
export const JEV_INPUT_PER_MILLION = 0.042;
export type JevMode = 'off' | 'shadow' | 'on';
export type JevJob = Exclude<AgentJob, 'transcribe'>;
export type JevRequest = SystemOneRequest<Questions> & { model: string };
export type JevResult<Q extends Questions> = SystemOneResult<Q> & { runId: string; latencyMs: number };
type Script = (request: JevRequest) => unknown | Promise<unknown>;
const scripts = new AsyncLocalStorage<Script>();
const reservations = new WeakMap<AgentDatabase, number>();

export function jevMode(job: JevJob): JevMode {
  const value = process.env[`JEV_${job.toUpperCase()}_MODE`] ?? process.env.JEV_MODE ?? (job === 'near_dup' ? 'off' : 'on');
  if (value !== 'off' && value !== 'shadow' && value !== 'on') throw new Error(`Invalid Jev mode for ${job}: ${value}`);
  return value;
}

/** Test/eval responses are scoped to this async execution, never shared across captures. */
export function withJevScript<T>(script: Script, task: () => T): T {
  return scripts.run(script, task);
}

export function fakeChoice(criteria: Record<string, unknown>, selected: string, probability = 0.99) {
  const keys = Object.keys(criteria);
  if (!keys.includes(selected) || keys.length < 2) throw new Error('Fake choice must select an available option from at least two criteria');
  return {
    type: 'choice' as const, choice: selected,
    confidence: (probability - 1 / keys.length) / (1 - 1 / keys.length),
    probabilities: Object.fromEntries(keys.map(key => [key, key === selected ? probability : (1 - probability) / (keys.length - 1)])),
  };
}

function uncertainScript(request: JevRequest): unknown {
  return {
    model: request.model,
    answers: Object.fromEntries(Object.entries(request.questions).map(([id, question]) => {
      if (question.type === 'noul') return [id, { type: 'noul', noul: 0.5 }];
      if (question.type === 'choice') {
        const keys = Object.keys(question.criteria);
        return [id, { type: 'choice', choice: keys[0], confidence: 0, probabilities: Object.fromEntries(keys.map(key => [key, 1 / keys.length])) }];
      }
      throw new Error('Aber Jev fake supports Choice and Noul questions only');
    })),
    usage: { input_tokens: Buffer.byteLength(JSON.stringify(request)), output_tokens: 0 },
  };
}

function probability(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateResult<Q extends Questions>(value: unknown, questions: Q): SystemOneResult<Q> {
  if (!record(value) || typeof value.model !== 'string' || !record(value.answers) || !record(value.usage)) throw new Error('Invalid Jev response envelope');
  const usage = value.usage;
  for (const key of ['input_tokens', 'output_tokens'] as const) {
    if (!(key in usage) || typeof usage[key] !== 'number' || !Number.isSafeInteger(usage[key]) || usage[key] < 0) throw new Error(`Jev response missing valid ${key}; billable usage is unknown`);
  }
  const answers: Record<string, unknown> = value.answers;
  for (const [id, question] of Object.entries(questions)) {
    const answer = answers[id];
    if (!answer || typeof answer !== 'object' || !('type' in answer) || answer.type !== question.type) throw new Error(`Jev response missing or mismatched answer: ${id}`);
    if (question.type === 'noul') {
      if (!('noul' in answer) || !probability(answer.noul)) throw new Error(`Invalid Jev Noul: ${id}`);
    } else if (question.type === 'choice') {
      if (!('choice' in answer) || typeof answer.choice !== 'string' || !(answer.choice in question.criteria)
        || !('confidence' in answer) || !probability(answer.confidence)
        || !('probabilities' in answer) || !record(answer.probabilities)) throw new Error(`Invalid Jev Choice: ${id}`);
      const distribution: Record<string, unknown> = answer.probabilities;
      const keys = Object.keys(question.criteria);
      if (Object.keys(distribution).length !== keys.length || keys.some(key => !probability(distribution[key]))) throw new Error(`Invalid Jev distribution: ${id}`);
      const probabilities = keys.map(key => Number(distribution[key]));
      // The service rounds returned probabilities/confidence to two decimals.
      // Allow only the resulting aggregate rounding error, not arbitrary drift.
      if (Math.abs(probabilities.reduce((sum, p) => sum + p, 0) - 1) > keys.length * 0.005 + 0.0001
        || Number(distribution[answer.choice]) < Math.max(...probabilities)) throw new Error(`Inconsistent Jev distribution: ${id}`);
      const expectedConfidence = keys.length === 1 ? 1 : (Math.max(...probabilities) - 1 / keys.length) / (1 - 1 / keys.length);
      const roundingTolerance = keys.length === 1 ? 0.0051 : 0.005 + 0.005 * keys.length / (keys.length - 1) + 0.0001;
      if (Math.abs(answer.confidence - expectedConfidence) > roundingTolerance) throw new Error(`Inconsistent Jev confidence: ${id}`);
    } else throw new Error('Aber Jev adapter supports text Choice and Noul questions only');
  }
  // The untrusted SDK/fake boundary is checked above; preserve inferred per-question answer types.
  return {
    model: value.model, answers: value.answers as SystemOneResult<Q>['answers'],
    usage: { input_tokens: Number(usage.input_tokens), output_tokens: Number(usage.output_tokens) },
  };
}

export function recordJevPolicy(db: AgentDatabase, runId: string, policy: Record<string, unknown>): void {
  const row = db.prepare('SELECT trace_json FROM agent_runs WHERE id=?').get(runId) as { trace_json: string } | undefined;
  if (!row) throw new Error(`Missing Jev run ${runId}`);
  const trace: unknown[] = JSON.parse(row.trace_json);
  trace.push({ type: 'jev_policy', ...policy });
  db.prepare('UPDATE agent_runs SET trace_json=? WHERE id=?').run(JSON.stringify(trace), runId);
}

export async function askJev<Q extends Questions>(db: AgentDatabase, job: JevJob, request: {
  state: SystemOneRequest<Q>['state']; questions: Q; questionVersion: string; policyVersion: string;
}, ctx: RunContext = {}): Promise<JevResult<Q>> {
  const model = process.env.JEV_MODEL ?? JEV_MODEL;
  if (!/^jev-\d+\.\d+\.\d+$/.test(model)) throw new Error('JEV_MODEL must be a pinned version, not a moving alias');
  const input = { model, state: request.state, questions: request.questions };
  const bytes = Buffer.byteLength(JSON.stringify(input));
  if (!Object.keys(request.questions).length) throw new Error('Jev needs at least one question');
  if (bytes + 4096 >= 60_000 || Object.values(request.questions).some(question => Buffer.byteLength(JSON.stringify({ state: request.state, question })) + 4096 >= 28_000)) throw new Error('Jev input exceeds its conservative text context bound; narrow the state');
  const fake = process.env.AGENT_MODE === 'fake';
  const reservedCost = fake ? 0 : (bytes + 4096) * JEV_INPUT_PER_MILLION / 1_000_000;
  const pending = reservations.get(db) ?? 0;
  if (daySpend(db, ctx.now?.()) + pending + reservedCost >= spendCap()) throw new BudgetExceededError();
  reservations.set(db, pending + reservedCost);
  try {
    return await recordedAdapter(db, job, model, ctx, async (report, runId) => {
      const started = performance.now();
      const metadata = { type: 'jev', mode: jevMode(job), questionVersion: request.questionVersion, policyVersion: request.policyVersion, requestedModel: model, state: input.state, questions: input.questions };
      report({ trace: [metadata] });
      ctx.signal?.throwIfAborted();
      const raw: unknown = fake
        ? await (scripts.getStore() ?? uncertainScript)(input)
        : await new TypeSafeClient({
          apiKey: process.env.TYPESAFE_API_KEY, baseURL: 'https://api.typesafe.ai', defaultModel: model,
          retry: { maxRetries: 0 }, timeout: 15_000, logLevel: 'off',
        }).systemOne(input, { signal: ctx.signal });
      const latencyMs = performance.now() - started;
      // Retain the raw response even when validation fails; it is not safe to act on it.
      const envelope = raw && typeof raw === 'object' ? raw : {};
      const usage = 'usage' in envelope && envelope.usage && typeof envelope.usage === 'object' ? envelope.usage : {};
      const knownInput = 'input_tokens' in usage && typeof usage.input_tokens === 'number' && Number.isSafeInteger(usage.input_tokens) && usage.input_tokens >= 0 ? usage.input_tokens : undefined;
      const knownOutput = 'output_tokens' in usage && typeof usage.output_tokens === 'number' && Number.isSafeInteger(usage.output_tokens) && usage.output_tokens >= 0 ? usage.output_tokens : undefined;
      report({
        inputTokens: knownInput, outputTokens: knownOutput,
        costUsd: knownInput === undefined ? undefined : knownInput * JEV_INPUT_PER_MILLION / 1_000_000,
        model: 'model' in envelope && typeof envelope.model === 'string' ? envelope.model : model,
        trace: [{ ...metadata, response: raw, latencyMs, ...(knownInput === undefined ? { costUnknown: true } : {}) }],
      });
      const result = validateResult(raw, request.questions);
      const inputTokens = result.usage.input_tokens!;
      const stats = {
        inputTokens, outputTokens: result.usage.output_tokens!, costUsd: inputTokens * JEV_INPUT_PER_MILLION / 1_000_000,
        model: result.model, trace: [{ ...metadata, response: result, latencyMs }],
      };
      report(stats);
      if (result.model !== model) throw new Error(`Jev resolved ${result.model} instead of pinned ${model}; policy requires re-evaluation`);
      return { value: { ...result, runId, latencyMs }, ...stats };
    }, { provider: 'typesafe', promptVersion: request.questionVersion, costUpperBoundUsd: reservedCost });
  } finally {
    reservations.set(db, Math.max(0, (reservations.get(db) ?? 0) - reservedCost));
  }
}
