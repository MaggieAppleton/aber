import { runAgent } from '../run.js';
import { agentTools } from '../tools.js';
import { EVIDENCE_TOOLS, type AgentDatabase, type ToolLayer, type RunContext, type ProviderName } from '../types.js';
import { embedText } from '../adapters.js';
import { fakeEvidenceModel } from '../fixtures.js';
import { promptFor } from '../prompts.js';
import { readTool, compactTheory, compactSignal, signalCandidates, type Row } from './context.js';
import { rankTheories } from './rank.js';

export async function linkEvidence(db: AgentDatabase, layer: ToolLayer, signalId: string, options: RunContext & { provider?: ProviderName } = {}) {
  const signal = await readTool<Row | null>(layer, 'getSignal', { id: signalId }, 'link_evidence');
  if (!signal || signal.discardedAt || signal.discarded_at || signal.mergedIntoId || signal.merged_into_id) return;
  const embedding = await embedText(db, `${signal.gist}\n${signal.note ?? ''}`.slice(0, 6500), options);
  const candidates = await rankTheories(db, signalCandidates(await readTool(layer, 'similarTheories', { text: signal.gist, embedding, limit: 100 }, 'link_evidence')), embedding, 'claim', 8, options);
  const theories = (await Promise.all(candidates.map(item => readTool<Row>(layer, 'getTheory', { id: item.id }, 'link_evidence')))).filter(theory =>
    !(theory.evidence ?? []).some((evidence: Row) => (evidence.signalId ?? evidence.signal_id) === signalId)
    && !(theory.suggestions ?? []).some((suggestion: Row) => suggestion.kind === 'evidence' && (suggestion.payload?.signal_id ?? suggestion.payload?.signalId) === signalId));
  return runAgent(db, {
    job: 'link_evidence', ...promptFor('link-evidence'), maxSteps: 6, maxInputTokens: 99_000, provider: options.provider,
    ...(process.env.AGENT_MODE === 'fake' ? { model: fakeEvidenceModel(signal, theories) } : {}),
    tools: runId => agentTools(layer, EVIDENCE_TOOLS, 'link_evidence', runId, options.dumpId, { db, ctx: options }),
  }, { prompt: JSON.stringify({ signal: compactSignal(signal), theories: theories.map(compactTheory) }) }, options);
}
