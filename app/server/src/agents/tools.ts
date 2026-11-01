import { tool } from 'ai';
import type { Tool } from 'ai';
import type { AgentJob, ToolLayer, AgentDatabase, RunContext } from './types.js';
import { modelProjection } from './projection.js';
import { embedText } from './adapters.js';
import { rankTheories } from './jobs/rank.js';
import { signalCandidates } from './jobs/context.js';

const descriptions: Record<string, string> = {
  getDump: 'Read captured text, attachments and transcript for a dump. The initial job context already includes this dump; read again only to resolve missing information.',
  lookupSignals: 'Check exact saved URLs and discarded tombstones. Use the results already supplied in initial context; do not repeat identical lookups.',
  similarSignals: 'Find existing observations relevant to text. Same-topic results are candidates, not proof of the same event. Initial context already includes top matches.',
  similarTheories: 'Retrieve at most eight theories by semantic similarity to text, with their current claims and evidence.',
  listTripwires: 'Retrieve at most ten current held theories by semantic similarity between text and their exact tripwire condition.',
  createSignal: 'Create one factual observation with its captured dump and all source URLs. Exact repeats attach their origin; discarded tombstones refuse creation.',
  reply: 'Save the concise answer and generative UI parts for this dump after all filing and drafts are complete.',
};

/** Allow-listing is deliberate: adding a person tool to the registry cannot expose it. */
export function agentTools(layer: ToolLayer, names: readonly string[], job: AgentJob, runId: string, dumpId?: string, semantic?: { db: AgentDatabase; ctx?: RunContext }): Record<string, Tool> {
  return Object.fromEntries(names.filter(name => layer.names.includes(name) && layer.definitions?.[name]?.who !== 'person').map(name => [name, tool({
    description: descriptions[name] ?? layer.definitions?.[name]?.description ?? `Aber ${name}. Changes obey object ownership.`,
    inputSchema: layer.schemas[name],
    toModelOutput: ({ output }) => ({ type: 'json', value: modelProjection(output, name) as any }),
    execute: async input => {
      try {
        if (semantic && (name === 'similarTheories' || name === 'listTripwires')) {
          const value = input as { text?: string; limit?: number };
          const vector = await embedText(semantic.db, (value.text ?? '').slice(0, 6500), semantic.ctx);
          const candidates = await layer.call(name, { ...value, limit: 100 }, { kind: 'agent', job, runId, dumpId });
          return await rankTheories(semantic.db, signalCandidates(candidates), vector, name === 'listTripwires' ? 'tripwire' : 'claim', Math.min(value.limit ?? 100, name === 'listTripwires' ? 10 : 8), semantic.ctx ?? {});
        }
        return await layer.call(name, input, { kind: 'agent', job, runId, ...(dumpId ? { dumpId } : {}) });
      } catch (error) {
        // Keeping errors in the conversation lets the model recover, and preserves
        // authority violations as inspectable tool results in the run trace.
        return { error: { name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : String(error) } };
      }
    },
  })]));
}
