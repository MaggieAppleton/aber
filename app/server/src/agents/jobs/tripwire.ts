import { runAgent } from '../run.js';
import { agentTools } from '../tools.js';
import { TRIPWIRE_TOOLS, type AgentDatabase, type ToolLayer, type RunContext, type ProviderName } from '../types.js';
import { embedText } from '../adapters.js';
import { fakeTripwireModel } from '../fixtures.js';
import { promptFor } from '../prompts.js';
import { readTool, compactTheory, compactSignal, signalCandidates, type Row } from './context.js';
import { rankTheories } from './rank.js';
import { tool, type LanguageModel } from 'ai';
import { projectedModelOutput } from '../projection.js';

export async function checkTripwire(db: AgentDatabase, layer: ToolLayer, signalId: string, options: RunContext & { provider?: ProviderName; theoryId?: string; tripwireVersion?: number; model?: LanguageModel } = {}) {
  const signal = await readTool<Row | null>(layer, 'getSignal', { id: signalId }, 'tripwire');
  if (!signal || signal.discardedAt || signal.discarded_at || signal.mergedIntoId || signal.merged_into_id || signal.deletedByDumpId || signal.deleted_by_dump_id) return;
  const target = options.theoryId ? await readTool<Row | null>(layer, 'getTheory', { id: options.theoryId }, 'tripwire') : null;
  const targetVersion = target?.tripwireVersion ?? target?.tripwire_version;
  if (options.theoryId && (!target || target.status !== 'held' || !target.tripwire || target.discardedAt || target.discarded_at || target.mergedIntoId || target.merged_into_id || (options.tripwireVersion !== undefined && options.tripwireVersion !== targetVersion))) return;
  const embedding = await embedText(db, signal.gist.slice(0, 6500), options);
  const candidates = target
    ? [target]
    : await rankTheories(db, signalCandidates(await readTool(layer, 'listTripwires', { text: signal.gist, embedding, limit: 100 }, 'tripwire')), embedding, 'tripwire', 10, options);
  const theories = candidates.filter(theory => theory?.tripwire && theory.status === 'held' && !(theory.suggestions ?? []).some((suggestion: Row) => {
    const payload = suggestion.payload ?? {};
    return suggestion.kind === 'challenge' && (payload.signal_id ?? payload.signalId) === signalId && (payload.tripwire_version ?? payload.tripwireVersion) === (theory.tripwire_version ?? theory.tripwireVersion);
  }));
  return runAgent(db, {
    job: 'tripwire', ...promptFor('tripwire'), maxSteps: 5, maxInputTokens: 99_000, provider: options.provider,
    ...(options.model ? { model: options.model } : process.env.AGENT_MODE === 'fake' ? { model: fakeTripwireModel(signal, theories) } : {}),
    tools: runId => {
      const tools = agentTools(layer, TRIPWIRE_TOOLS, 'tripwire', runId, options.dumpId, { db, ctx: options });
      if (target) tools.proposeChallenge = tool({
        description: 'Propose a hit for this job’s one theory and captured tripwire version only.',
        inputSchema: layer.schemas.proposeChallenge,
        toModelOutput: projectedModelOutput,
        execute: async raw => {
          const input = raw as Row;
          if (input.theoryId !== target.id || input.signalId !== signalId || (input.tripwireVersion !== undefined && input.tripwireVersion !== targetVersion)) return { error: { name: 'TripwireScopeError', message: 'This lookback item is limited to its signal, theory and tripwire version.' } };
          try {
            const actor = { kind: 'agent' as const, job: 'tripwire', runId, dumpId: options.dumpId };
            const current = await layer.call('getTheory', { id: target.id }, actor) as Row | null;
            if (!current || current.status !== 'held' || !current.tripwire || current.discardedAt || current.discarded_at || current.mergedIntoId || current.merged_into_id) return { error: { name: 'TripwireScopeError', message: 'The watched theory is no longer active.' } };
            return await layer.call('proposeChallenge', { ...input, tripwireVersion: targetVersion }, actor);
          }
          catch (error) { return { error: { name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : String(error) } }; }
        },
      });
      return tools;
    },
  }, { prompt: JSON.stringify({ signal: compactSignal(signal), theories: theories.map(theory => {
    // Decisions for this exact signal were checked above. Other signals' history
    // must not grow every child request as a large lookback completes.
    const { evidence: _evidence, suggestions: _suggestions, ...condition } = compactTheory(theory);
    return condition;
  }) }) }, options);
}
