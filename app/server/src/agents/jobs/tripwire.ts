import { BudgetExceededError, runAgent } from '../run.js';
import { agentTools } from '../tools.js';
import { TRIPWIRE_TOOLS, type AgentDatabase, type ToolLayer, type RunContext, type ProviderName } from '../types.js';
import { embedText } from '../adapters.js';
import { fakeTripwireModel } from '../fixtures.js';
import { promptFor } from '../prompts.js';
import { readTool, compactTheory, compactSignal, signalCandidates, type Row } from './context.js';
import { rankTheories } from './rank.js';
import { tool, type LanguageModel } from 'ai';
import { projectedModelOutput } from '../projection.js';
import { jevMode, recordJevPolicy } from '../jev.js';
import { EvaluationBudgetExceededError } from '../spend-budget.js';
import { judgeTripwirePair, tripwireSignalContext, TRIPWIRE_POLICY_VERSION } from './tripwire-jev.js';

const version = (theory: Row) => theory.tripwireVersion ?? theory.tripwire_version;
const active = (row: Row | null): row is Row => !!row && !row.discardedAt && !row.discarded_at && !row.mergedIntoId && !row.merged_into_id && !row.deletedByDumpId && !row.deleted_by_dump_id;
const fingerprint = (signal: Row) => JSON.stringify([tripwireSignalContext(signal), signal.updatedAt ?? signal.updated_at]);
const alreadyChecked = (theory: Row, signalId: string) => (theory.suggestions ?? []).some((suggestion: Row) => {
  const payload = suggestion.payload ?? {};
  return suggestion.kind === 'challenge' && (payload.signal_id ?? payload.signalId) === signalId && (payload.tripwire_version ?? payload.tripwireVersion) === version(theory);
});

async function freshPair(layer: ToolLayer, signal: Row, theory: Row) {
  const currentSignal = await readTool<Row | null>(layer, 'getSignal', { id: signal.id }, 'tripwire');
  const current = await readTool<Row | null>(layer, 'getTheory', { id: theory.id }, 'tripwire');
  if (!active(currentSignal) || fingerprint(currentSignal) !== fingerprint(signal)) return 'Signal changed or is no longer active.';
  if (!active(current) || current.status !== 'held' || !current.tripwire) return 'The watched theory is no longer active.';
  if (version(current) !== version(theory) || current.tripwire !== theory.tripwire) return 'Tripwire version changed';
  if (alreadyChecked(current, signal.id)) return 'This signal and tripwire version already have a challenge decision.';
}

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
  const theories = candidates.filter(theory => active(theory) && theory.tripwire && theory.status === 'held' && !alreadyChecked(theory, signalId));
  const mode = jevMode('tripwire');
  const baselineTheories = theories;
  if (mode !== 'off') {
    for (const theory of theories) {
      let judgment = await judgeTripwirePair(db, signal, theory, options);
      if (mode === 'on') {
        try {
          const stale = await freshPair(layer, signal, theory);
          if (stale) judgment = { ...judgment, action: 'skip', reason: stale };
        } catch (error) {
          if (error instanceof BudgetExceededError || error instanceof EvaluationBudgetExceededError) throw error;
          judgment = { ...judgment, action: 'abstain', reason: `freshness-check-failed: ${error instanceof Error ? error.message : String(error)}` };
        }
        if (judgment.action === 'fallback' && judgment.baselineRequired) {
          // Unsupported arithmetic/relative conditions retain the original baseline
          // semantics, but its authority and context are restricted to this pair.
          const result = await runAgent(db, {
            job: 'tripwire', ...promptFor('tripwire'), maxSteps: 5, maxInputTokens: 28_000, provider: options.provider,
            ...(options.model ? { model: options.model } : process.env.AGENT_MODE === 'fake' ? { model: fakeTripwireModel(signal, [theory]) } : {}),
            tools: runId => {
              const tools = agentTools(layer, ['proposeChallenge'], 'tripwire', runId, options.dumpId, { db, ctx: options });
              if (tools.proposeChallenge) tools.proposeChallenge = tool({
                description: 'Propose a hit only for this exact signal, theory and captured tripwire version.',
                inputSchema: layer.schemas.proposeChallenge,
                toModelOutput: projectedModelOutput,
                execute: async raw => {
                  const input = raw as Row;
                  if (input.theoryId !== theory.id || input.signalId !== signalId || (input.tripwireVersion !== undefined && input.tripwireVersion !== version(theory))) return { error: { name: 'TripwireScopeError', message: 'Fallback is restricted to its original signal/theory/version pair.' } };
                  const stale = await freshPair(layer, signal, theory);
                  if (stale) return { error: { name: 'TripwireScopeError', message: stale } };
                  return layer.call('proposeChallenge', { ...input, tripwireVersion: version(theory) }, { kind: 'agent', job: 'tripwire', runId, dumpId: options.dumpId });
                },
              });
              return tools;
            },
          }, { prompt: JSON.stringify({ signal: tripwireSignalContext(signal), theories: [{ id: theory.id, tripwire: theory.tripwire, tripwireVersion: version(theory) }] }) }, options);
          recordJevPolicy(db, result.runId, { policyVersion: TRIPWIRE_POLICY_VERSION, signalId, theoryId: theory.id, tripwireVersion: version(theory), mode, action: 'fallback_agent', fallback: true, reason: `pair-scoped-baseline: ${judgment.reason}`, sourceRunId: judgment.runId });
          judgment = { ...judgment, usedFallback: true, reason: `pair-scoped-baseline: ${judgment.reason}` };
        } else if (judgment.action === 'fallback') {
          judgment = { ...judgment, action: 'abstain' };
        }
        if (judgment.action === 'propose') {
          try {
            if (!layer.names.includes('proposeChallenge') || layer.definitions?.proposeChallenge?.who === 'person') throw new Error('proposeChallenge is not an allowed agent tool');
            await layer.call('proposeChallenge', {
              theoryId: theory.id, signalId, tripwireVersion: version(theory),
              why: `Watched condition: ${theory.tripwire}\nThe saved observation reports: ${signal.gist}`,
              reasoning: JSON.stringify({ policyVersion: TRIPWIRE_POLICY_VERSION, reason: judgment.reason, comparison: judgment.comparison }),
            }, { kind: 'agent', job: 'tripwire', runId: judgment.runId, ...(options.dumpId ? { dumpId: options.dumpId } : {}) });
          } catch (error) {
            if (error instanceof BudgetExceededError || error instanceof EvaluationBudgetExceededError) throw error;
            judgment = { ...judgment, action: 'abstain', reason: `proposeChallenge failed: ${error instanceof Error ? error.message : String(error)}` };
          }
        }
      }
      const { runId, ...decision } = judgment;
      const policy = { policyVersion: TRIPWIRE_POLICY_VERSION, signalId, theoryId: theory.id, tripwireVersion: version(theory), mode, ...decision, fallback: mode === 'shadow' || judgment.usedFallback === true, ...(mode === 'shadow' ? { action: 'shadow', wouldAction: judgment.action, reason: `shadow-baseline-unchanged: ${judgment.reason}` } : {}) };
      recordJevPolicy(db, runId, policy);
    }
    // On-mode uncertainty is resolved by the bounded check fallback, never by
    // re-running the entire tool-using capture against a generative model.
    if (mode === 'on' || !baselineTheories.length) return;
  }
  const result = await runAgent(db, {
    job: 'tripwire', ...promptFor('tripwire'), maxSteps: 5, maxInputTokens: 99_000, provider: options.provider,
    ...(options.model ? { model: options.model } : process.env.AGENT_MODE === 'fake' ? { model: fakeTripwireModel(signal, baselineTheories) } : {}),
    tools: runId => {
      const tools = agentTools(layer, TRIPWIRE_TOOLS, 'tripwire', runId, options.dumpId, { db, ctx: options });
      if (tools.proposeChallenge && target) tools.proposeChallenge = tool({
        description: 'Propose a hit only for this signal and a supplied theory at its captured tripwire version.',
        inputSchema: layer.schemas.proposeChallenge,
        toModelOutput: projectedModelOutput,
        execute: async raw => {
          const input = raw as Row;
          const watched = baselineTheories.find(theory => theory.id === input.theoryId);
          if (!watched || input.signalId !== signalId || (input.tripwireVersion !== undefined && input.tripwireVersion !== version(watched))) return { error: { name: 'TripwireScopeError', message: 'This item is limited to its signal, theories and captured tripwire versions.' } };
          try {
            const actor = { kind: 'agent' as const, job: 'tripwire', runId, dumpId: options.dumpId };
            const stale = await freshPair(layer, signal, watched);
            if (stale) return { error: { name: 'TripwireScopeError', message: stale } };
            return await layer.call('proposeChallenge', { ...input, tripwireVersion: version(watched) }, actor);
          }
          catch (error) {
            if (error instanceof BudgetExceededError || error instanceof EvaluationBudgetExceededError) throw error;
            return { error: { name: error instanceof Error ? error.name : 'Error', message: error instanceof Error ? error.message : String(error) } };
          }
        },
      });
      return tools;
    },
  }, { prompt: JSON.stringify({ signal: compactSignal(signal), theories: baselineTheories.map(theory => {
    // Decisions for this exact signal were checked above. Other signals' history
    // must not grow every child request as a large lookback completes.
    const { evidence: _evidence, suggestions: _suggestions, ...condition } = compactTheory(theory);
    return condition;
  }) }) }, options);
  return result;
}
