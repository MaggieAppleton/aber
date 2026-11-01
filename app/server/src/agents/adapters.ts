import { ulid } from 'ulid';
import { embed } from 'ai';
import { MockEmbeddingModelV4 } from 'ai/test';
import { embeddingModel } from './models.js';
import { assertBudget } from './run.js';
import type { AgentDatabase, RunContext } from './types.js';

type AdapterResult<T> = { value: T; inputTokens?: number; outputTokens?: number; costUsd?: number; trace?: unknown[] };

export async function recordedAdapter<T>(db: AgentDatabase, job: string, model: string, ctx: RunContext, task: (report: (stats: Omit<AdapterResult<never>, 'value'>) => void) => Promise<AdapterResult<T>>): Promise<T> {
  const now = ctx.now ?? (() => new Date());
  const runId = ulid();
  const provider = process.env.AGENT_MODE === 'fake' ? 'fake' : 'openai';
  db.prepare('INSERT INTO agent_runs (id,job_id,job,attempt,provider,model,prompt_version,status,started_at,trace_json,cost_usd) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(runId, ctx.jobId ?? null, job, ctx.attempt ?? 1, provider, model, 'adapter-v1', 'running', now().toISOString(), '[]', 0);
  try {
    assertBudget(db, now());
    const output = await task(stats => {
      db.prepare('UPDATE agent_runs SET input_tokens=?,output_tokens=?,cost_usd=?,trace_json=? WHERE id=?')
        .run(stats.inputTokens ?? 0, stats.outputTokens ?? 0, provider === 'fake' ? 0 : stats.costUsd ?? 0, JSON.stringify(stats.trace ?? []), runId);
      assertBudget(db, now());
    });
    db.prepare("UPDATE agent_runs SET status='done',input_tokens=?,output_tokens=?,cost_usd=?,trace_json=?,finished_at=? WHERE id=?")
      .run(output.inputTokens ?? 0, output.outputTokens ?? 0, provider === 'fake' ? 0 : output.costUsd ?? 0, JSON.stringify(output.trace ?? []), now().toISOString(), runId);
    return output.value;
  } catch (error) {
    db.prepare("UPDATE agent_runs SET status='failed',error=?,finished_at=? WHERE id=?")
      .run(error instanceof Error ? error.message : String(error), now().toISOString(), runId);
    throw error;
  }
}

function syntheticEmbedding(text: string): number[] {
  const vector = Array.from({ length: 64 }, () => 0);
  for (const word of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    let hash = 0;
    for (const char of word) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    vector[hash % vector.length]! += 1;
  }
  const norm = Math.hypot(...vector) || 1;
  return vector.map(value => value / norm);
}

export async function embedText(db: AgentDatabase, text: string, ctx: RunContext = {}): Promise<number[]> {
  // Image-only captures have no textual query until the vision model creates a gist.
  // An empty vector leaves initial candidates unranked; providers reject empty input.
  if (!text.trim()) return [];
  if (Buffer.byteLength(text) > 28_000) throw new Error('Embedding text exceeds the safe per-request limit');
  return recordedAdapter(db, 'embedding', 'text-embedding-3-small', ctx, async () => {
    const result = await embed({
      model: process.env.AGENT_MODE === 'fake'
        ? new MockEmbeddingModelV4({ doEmbed: async ({ values }) => ({ embeddings: values.map(syntheticEmbedding), usage: { tokens: values.join(' ').split(/\s+/).length }, warnings: [] }) })
        : embeddingModel,
      value: text, maxRetries: 0, abortSignal: ctx.signal,
    });
    return { value: result.embedding, inputTokens: result.usage.tokens, costUsd: result.usage.tokens * 0.02 / 1_000_000, trace: [{ type: 'embedding', characters: text.length, dimensions: result.embedding.length }] };
  });
}
