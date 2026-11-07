import { wrapLanguageModel, type LanguageModel } from 'ai';
import { createDatabase, type Database } from '../server/src/db/index.js';
import { seed } from '../server/src/seed.js';
import { createTools } from '../server/src/tools/index.js';
import { saveTranscript } from '../server/src/tools/dumps.js';
import { getObject } from '../server/src/tools/queries.js';
import { processDump } from '../server/src/agents/jobs/process-dump.js';
import { choiceFor } from '../server/src/agents/models.js';
import type { ProviderName } from '../server/src/agents/types.js';
import type { EvalCase, EvalResult } from './cases.js';
import { traceDiagnostics } from './diagnostics.js';
import { processingFixtures, processingProvenance, type ProcessingFixture } from './fixtures/processing-v2.js';
import { processingReplay } from './processing-replay.js';
import { scoreProcessing, type ProcessingSnapshot } from './processing-score.js';
import { retainEvaluation } from './jev-observation.js';
type Row = Record<string, any>;
const person = { kind: 'person' as const, id: 'maggie' };
const rows = (db: Database, sql: string, ...args: unknown[]) => db.prepare(sql).all(...args) as Row[];
// Preserve complete held prose, confidence history, accepted evidence and person-owned objects.
const heldSnapshot = (db: Database) => JSON.stringify({
  theories: rows(db, "SELECT * FROM theories WHERE status='held' ORDER BY id"),
  themes: rows(db, "SELECT * FROM themes WHERE status='mine' ORDER BY id"),
  prototypes: rows(db, 'SELECT * FROM prototypes WHERE draft=0 ORDER BY id'),
  stances: rows(db, 'SELECT * FROM stances ORDER BY id'),
  evidence: rows(db, "SELECT e.* FROM evidence e JOIN theories t ON t.id=e.theory_id WHERE t.status='held' ORDER BY e.id"),
});

export async function evaluateProcessing(fixture: ProcessingFixture, provider: ProviderName, options: {
  configuredPipeline?: boolean;
  /** Fixed offline adapter tests only; the local CLI never supplies a model. */
  model?: LanguageModel;
} = {}): Promise<EvalResult> {
  const db = createDatabase(); seed(db); const tools = createTools(db);
  const details: Record<string, unknown> = { evaluationMode: provider === 'fake' ? 'scripted-replay: scorer/plumbing only, not model accuracy' : 'live-provider' };
  let checks: Record<string, boolean> = {}; let error: string | undefined;
  try {
    let setupSignalId: string | undefined;
    if (fixture.setup) {
      db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES('fixture-setup','process_dump','synthetic','fixture','v2','done',?)").run(new Date().toISOString());
      const prior = tools.call('captureDump', { text: 'Synthetic independent fixture setup.' }, person);
      const actor = { kind: 'agent' as const, job: 'process_dump', runId: 'fixture-setup' };
      const signal = tools.call('createSignal', { dumpId: prior.id, gist: fixture.setup.gist, sources: [{ url: fixture.setup.url }] }, actor);
      tools.call('fileSignal', { signalId: signal.id, themeId: 'memory' }, actor);
      setupSignalId = signal.id;
    }
    const heldBefore = heldSnapshot(db);
    const capture = { text: fixture.text, urls: fixture.urls, ...(fixture.transcript ? { media: [{ id: 'eval-voice-media', path: 'eval-only-not-playable.wav', mime: 'audio/wav', bytes: 0, sha256: options.configuredPipeline ? 'local-transcript-no-audio' : 'synthetic-transcript-no-audio' }] } : {}) };
    const dump = tools.call('captureDump', capture, person);
    if (fixture.transcript) saveTranscript(db, { dumpId: dump.id, mediaId: 'eval-voice-media', text: fixture.transcript, provider: options.configuredPipeline ? 'local-input' : 'synthetic', model: 'authored-transcript-v2' });
    let providerInput = '';
    const underlying = options.model ?? (provider === 'fake' && !options.configuredPipeline
      ? processingReplay(fixture, dump.id, setupSignalId) : choiceFor('process_dump', provider).model);
    if (typeof underlying === 'string') throw new Error('Eval requires a model object');
    // Eval-only observation of the actual provider-bound request; no production hook or extra call.
    const observe = (underlying: Exclude<LanguageModel, string>) => wrapLanguageModel({ model: underlying, middleware: { transformParams: async ({ params }) => {
      if (!providerInput) for (const message of params.prompt) {
        if (message.role !== 'user') continue;
        for (const part of message.content) if (part.type === 'text') {
          try { const input = JSON.parse(part.text); if (input.dump) providerInput = [input.dump.text, ...(input.dump.transcripts ?? []).map((item: Row) => item.text), ...(input.dump.attachments ?? []).map((item: Row) => item.fetched?.text ?? '')].join('\n'); } catch { /* not JSON context */ }
        }
      }
      return params;
    } } });
    const restore: (() => void)[] = [];
    try {
      if (options.configuredPipeline && !options.model && provider !== 'fake') {
        // Observe configured choices in place: processDump still chooses its own model/pricing.
        for (const job of ['process_dump', 'link_evidence'] as const) {
          const choice = choiceFor(job, provider); const original = choice.model;
          if (typeof original === 'string') throw new Error('Eval requires a model object');
          choice.model = observe(original); restore.push(() => { choice.model = original; });
        }
      }
      await processDump(db, tools, dump.id, { provider, ...(!options.configuredPipeline || options.model ? { model: observe(underlying) } : {}), articleFetcher: async url => fixture.article?.url === url ? { ...fixture.article, byline: options.configuredPipeline ? 'Local input' : 'Synthetic fixture', siteName: options.configuredPipeline ? 'Local eval' : 'Eval v2', fetchedAt: options.configuredPipeline ? new Date().toISOString() : '2026-11-01T00:00:00.000Z' } : null });
    } catch (caught) { error = caught instanceof Error ? caught.message : String(caught); }
    finally { restore.reverse().forEach(task => task()); }
    const result = tools.call('getDump', { id: dump.id }, person);
    const runRows = rows(db, "SELECT * FROM agent_runs WHERE provider NOT IN ('seed','synthetic') ORDER BY started_at,id");
    const diagnostics = traceDiagnostics(runRows, 'process_dump');
    const state: ProcessingSnapshot = {
      signals: result.signals.map((item: Row) => {
        const value = tools.call('getSignal', { id: item.id }, person);
        return { id: value.id, gist: value.gist, note: value.note, themes: value.themes, sources: value.sources.map((source: Row) => ({ url: source.url, ownObservation: source.ownObservation })), origins: value.origins.map((origin: Row) => origin.dump_id), fetched: value.fetched ?? [] };
      }),
      drafts: result.drafts.map((item: Row) => {
        const value = getObject(db, item.kind, item.id)!;
        return { id: value.id, kind: item.kind, text: value.claim ?? value.name, draft: !!value.draft, createdBy: value.created_by, themes: value.themes ?? [], theories: value.theories ?? [], ...(item.kind === 'theory' ? { horizon: value.horizon } : {}) };
      }),
      revisions: rows(db, "SELECT target_id,status,payload_json FROM suggestions WHERE dump_id=? AND kind='revision'", dump.id).map(item => ({ targetId: item.target_id, status: item.status, text: JSON.stringify(JSON.parse(item.payload_json)) })),
      merges: result.merges.filter((item: Row) => !item.undone_at).map((item: Row) => ({ survivorId: item.survivor_id, absorbedId: item.absorbed_id })),
      themeNames: Object.fromEntries(rows(db, 'SELECT id,name FROM themes').map(item => [item.id, item.name])),
      heldBefore, heldAfter: heldSnapshot(db), providerInput, dumpId: dump.id, setupSignalId,
      noAuthorityErrors: diagnostics.authorityErrors.length === 0 && runRows.every(item => !item.trace_json?.includes('AuthorityError')),
    };
    checks = scoreProcessing(fixture, state, { localInput: options.configuredPipeline });
    if (options.configuredPipeline) details.runtimeModels = runRows.map(row => ({ job: row.job, provider: row.provider, model: row.model }));
    if (error) checks.completed = false;
    details.actual = state;
    details.expected = fixture.expected;
    return { id: fixture.id, job: 'process_dump', provider, checks, pass: Object.values(checks).every(Boolean), inputTokens: runRows.reduce((n, row) => n + (row.input_tokens ?? 0), 0), outputTokens: runRows.reduce((n, row) => n + (row.output_tokens ?? 0), 0), costUsd: runRows.reduce((n, row) => n + (row.cost_usd ?? 0), 0), diagnostics: { ...diagnostics, ...details }, ...(error ? { error } : {}) };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    const runRows = rows(db, "SELECT * FROM agent_runs WHERE provider NOT IN ('seed','synthetic') ORDER BY started_at,id");
    const diagnostics = traceDiagnostics(runRows, 'process_dump');
    return { id: fixture.id, job: 'process_dump', provider, pass: false, checks: { completed: false, noAuthorityErrors: diagnostics.authorityErrors.length === 0 }, inputTokens: runRows.reduce((n, row) => n + (row.input_tokens ?? 0), 0), outputTokens: runRows.reduce((n, row) => n + (row.output_tokens ?? 0), 0), costUsd: runRows.reduce((n, row) => n + (row.cost_usd ?? 0), 0), error: message, diagnostics: { ...diagnostics, ...details } };
  } finally { try { retainEvaluation(db); } finally { db.close(); } }
}

export function processingCases(): EvalCase[] {
  return processingFixtures.map(fixture => ({ id: fixture.id, job: 'process_dump', fixture: { version: fixture.version, text: fixture.text, expected: fixture.expected, provenance: processingProvenance, ...(fixture.transcript ? { transcript: fixture.transcript } : {}), ...(fixture.article ? { article: fixture.article } : {}), urls: fixture.urls, ...(fixture.setup ? { setup: fixture.setup } : {}) }, run: provider => evaluateProcessing(fixture, provider) }));
}
