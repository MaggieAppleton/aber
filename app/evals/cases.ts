import { createDatabase } from '../server/src/db/index.js';
import { seed } from '../server/src/seed.js';
import { createTools } from '../server/src/tools/index.js';
import { processDump } from '../server/src/agents/jobs/process-dump.js';
import { linkEvidence } from '../server/src/agents/jobs/link-evidence.js';
import { checkTripwire } from '../server/src/agents/jobs/tripwire.js';
import type { ProviderName } from '../server/src/agents/types.js';
import { dumpFixtures, evidenceFixtures, tripwireFixtures } from './fixtures/synthetic.js';
import { observeContext, traceDiagnostics, type ModelContext } from './diagnostics.js';
import { novelEvidenceFixtures, novelEvidenceProvenance } from './fixtures/novel-evidence-v1.js';
import { processingCases } from './processing.js';

export type EvalCase = { id: string; job: string; fixture?: { version: string; text: string; expected: Record<string, unknown>; provenance: string; [key: string]: unknown }; run: (provider: ProviderName) => Promise<EvalResult> };
export interface EvalResult { id: string; job: string; provider: ProviderName; pass: boolean; checks: Record<string, boolean>; inputTokens: number; outputTokens: number; costUsd: number; error?: string; diagnostics: ReturnType<typeof traceDiagnostics> & ModelContext & Record<string, unknown> }
const person = { kind: 'person' as const, id: 'maggie' };

function world() {
  const db = createDatabase(); seed(db); const tools = createTools(db);
  db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES('fixture-setup','process_dump','synthetic','fixture','v1','done',?)").run(new Date().toISOString());
  const actor = { kind: 'agent' as const, job: 'process_dump', runId: 'fixture-setup' };
  const capture = (text: string, urls: readonly string[] = []) => tools.call('captureDump', { text, urls }, person);
  const signal = (gist: string, url?: string) => { const dump = capture('Synthetic setup material.'); return tools.call('createSignal', { gist, dumpId: dump.id, sources: url ? [{ url }] : [{ ownObservation: true }] }, actor); };
  return { db, tools, capture, signal, details: {} as Record<string, unknown> };
}

async function evaluate(id: string, job: string, provider: ProviderName, action: (state: ReturnType<typeof world>) => Promise<Record<string, boolean>>): Promise<EvalResult> {
  const state = world();
  const context: ModelContext = {};
  const restoreModel = observeContext(job, provider, context);
  try {
    let checks: Record<string, boolean> = {}; let error: string | undefined;
    try { checks = await action(state); } catch (caught) { error = caught instanceof Error ? caught.message : String(caught); checks.completed = false; }
    const rows = state.db.prepare("SELECT * FROM agent_runs WHERE provider NOT IN ('seed','synthetic') ORDER BY started_at,id").all() as Record<string, any>[];
    checks.noAuthorityErrors = rows.every(row => !row.trace_json?.includes('AuthorityError'));
    const diagnostics = { ...traceDiagnostics(rows, job), ...context, ...state.details };
    return { id, job, provider, checks, pass: Object.values(checks).every(Boolean), inputTokens: rows.reduce((sum, row) => sum + (row.input_tokens ?? 0), 0), outputTokens: rows.reduce((sum, row) => sum + (row.output_tokens ?? 0), 0), costUsd: rows.reduce((sum, row) => sum + (row.cost_usd ?? 0), 0), diagnostics, ...(error ? { error } : {}) };
  } finally { restoreModel(); state.db.close(); }
}

export function cases(): EvalCase[] {
  return [
    ...dumpFixtures.map(fixture => ({ id: fixture.id, job: 'process_dump', run: (provider: ProviderName) => evaluate(fixture.id, 'process_dump', provider, async ({ db, tools, capture, signal }) => {
      if ('setup' in fixture) {
        const original = signal(fixture.setup === 'duplicate' ? 'Lab Aurora cuts its small-model price by half on 1 November.' : 'A previously saved observation.', fixture.setup === 'repeat' ? 'https://example.org/eval/repeat' : fixture.setup === 'tombstone' ? 'https://example.org/eval/discarded' : 'https://example.org/eval/same-finding-a');
        if (fixture.setup === 'tombstone') tools.call('discardSignal', { id: original.id }, person);
      }
      const before = (db.prepare('SELECT COUNT(*) n FROM signals').get() as { n: number }).n;
      const dump = capture(fixture.text, 'urls' in fixture ? fixture.urls : []);
      await processDump(db, tools, dump.id, { provider, articleFetcher: async () => null });
      const produced = tools.call('getDump', { id: dump.id }, person).signals as Record<string, any>[];
      const checks: Record<string, boolean> = { signalCount: produced.length >= fixture.count[0] && produced.length <= fixture.count[1] };
      if ('theme' in fixture) checks.filing = produced.every(item => tools.call('getSignal', { id: item.id }, person).themes.includes(fixture.theme));
      if ('delta' in fixture) checks.noDuplicate = (db.prepare('SELECT COUNT(*) n FROM signals').get() as { n: number }).n - before === fixture.delta;
      if ('merge' in fixture) checks.mergeDecision = !!db.prepare('SELECT 1 FROM merges WHERE dump_id=? AND undone_at IS NULL').get(dump.id) === fixture.merge;
      return checks;
    }) })),
    ...[...evidenceFixtures, ...novelEvidenceFixtures].map(fixture => ({ id: fixture.id, job: 'link_evidence', ...('version' in fixture ? { fixture: { version: fixture.version, text: fixture.gist, expected: { theoryId: fixture.theoryId, stance: fixture.stance }, provenance: novelEvidenceProvenance } } : {}), run: (provider: ProviderName) => evaluate(fixture.id, 'link_evidence', provider, async ({ db, signal, tools, details }) => {
      const observation = signal(fixture.gist); await linkEvidence(db, tools, observation.id, { provider });
      const theory = tools.call('getTheory', { id: fixture.theoryId }, person);
      details.expected = { theoryId: fixture.theoryId, claim: theory.claim, status: theory.status, signalId: observation.id, gist: fixture.gist, stance: fixture.stance };
      details.actualProposals = (db.prepare("SELECT target_id,payload_json,reasoning,status FROM suggestions WHERE kind='evidence'").all() as Record<string, any>[]).map(item => ({ theoryId: item.target_id, payload: JSON.parse(item.payload_json), reasoning: item.reasoning, status: item.status })).filter(item => item.payload.signal_id === observation.id);
      details.actualEvidence = db.prepare('SELECT theory_id,stance,note FROM evidence WHERE signal_id=?').all(observation.id);
      const suggestions = db.prepare("SELECT payload_json FROM suggestions WHERE kind='evidence' AND target_id=?").all(fixture.theoryId) as { payload_json: string }[];
      return { stance: suggestions.some(item => { const value = JSON.parse(item.payload_json); return value.signal_id === observation.id && value.stance === fixture.stance; }) };
    }) })),
    ...tripwireFixtures.map(fixture => ({ id: fixture.id, job: 'tripwire', run: (provider: ProviderName) => evaluate(fixture.id, 'tripwire', provider, async ({ db, signal, tools }) => {
      const observation = signal(fixture.gist); await checkTripwire(db, tools, observation.id, { provider, theoryId: 't3' });
      const hits = db.prepare("SELECT payload_json FROM suggestions WHERE kind='challenge' AND target_id='t3'").all() as { payload_json: string }[];
      return { hitDecision: hits.some(item => JSON.parse(item.payload_json).signal_id === observation.id) === fixture.hit };
    }) })),
    ...processingCases(),
  ];
}
