import { performance } from 'node:perf_hooks';
import { createDatabase } from '../server/src/db/index.js';
import { seed } from '../server/src/seed.js';
import { createTools } from '../server/src/tools/index.js';
import { linkEvidence } from '../server/src/agents/jobs/link-evidence.js';
import { checkTripwire } from '../server/src/agents/jobs/tripwire.js';
import { nearDuplicateDecision } from '../server/src/agents/jobs/near-duplicate.js';
import { processDump } from '../server/src/agents/jobs/process-dump.js';
import { createChatResponse } from '../server/src/agents/chat.js';
import { choiceFor } from '../server/src/agents/models.js';
import type { ProviderName } from '../server/src/agents/types.js';
import type { EvalCase, EvalResult } from './cases.js';
import { traceDiagnostics } from './diagnostics.js';
import { retainEvaluation, type Row } from './jev-observation.js';
import { jevFixtures, JEV_FIXTURE_VERSION, jevFixtureProvenance, type JevFixture } from './fixtures/jev-v1.js';
import { jevV2Fixtures, JEV_V2_FIXTURE_VERSION, jevV2FixtureProvenance } from './fixtures/jev-v2.js';

const person = { kind: 'person' as const, id: 'maggie' };
const jobs = { evidence: 'link_evidence', tripwire: 'tripwire', duplicate: 'near_dup', filing: 'process_dump', chat: 'chat' };

async function evaluate(fixture: JevFixture, provider: ProviderName): Promise<EvalResult> {
  const db = createDatabase(); seed(db);
  const tools = createTools(db);
  const job = jobs[fixture.workflow];
  const started = performance.now();
  let error: string | undefined;
  try {
    db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES('fixture-setup','process_dump','synthetic','fixture','jev-e2e-v1','done',?)").run(new Date().toISOString());
    const actor = { kind: 'agent' as const, job: 'process_dump', runId: 'fixture-setup' };
    const makeSignal = (gist: string) => {
      const dump = tools.call('captureDump', { text: gist }, person);
      return tools.call('createSignal', { dumpId: dump.id, gist, sources: [{ ownObservation: true }] }, actor);
    };
    try {
      if (fixture.workflow === 'evidence') await linkEvidence(db, tools, makeSignal(fixture.text).id, { provider });
      if (fixture.workflow === 'tripwire') {
        if (fixture.watch) db.prepare("INSERT INTO theories(id,owner_id,claim,status,authorship,tripwire,tripwire_version,created_at,created_by,updated_at,updated_by) SELECT ?,owner_id,claim,'held','mine',?,1,created_at,created_by,updated_at,updated_by FROM theories WHERE id='t3'").run(fixture.watch.id, fixture.watch.tripwire);
        await checkTripwire(db, tools, makeSignal(fixture.text).id, { provider, theoryId: fixture.watch?.id ?? 't3' });
      }
      if (fixture.workflow === 'duplicate') {
        const first = makeSignal(fixture.prior!);
        const second = makeSignal(fixture.text);
        const decision = await nearDuplicateDecision(db, first, second, {}, provider, fixture.expected.merge);
        if (decision.sameFinding) {
          // Use the real write boundary and the real judgement's run, never invent a policy-only merge.
          const run = db.prepare("SELECT id FROM agent_runs WHERE job='near_dup' AND provider NOT IN ('seed','synthetic') ORDER BY rowid DESC LIMIT 1").get() as Row;
          tools.call('mergeNearDuplicateSignals', { survivorId: first.id, absorbedId: second.id, reasoning: decision.reasoning }, { kind: 'agent', job: 'process_dump', runId: run.id });
        }
      }
      if (fixture.workflow === 'filing') {
        const dump = tools.call('captureDump', { text: fixture.text }, person);
        await processDump(db, tools, dump.id, { provider, articleFetcher: async () => null });
      }
      if (fixture.workflow === 'chat') {
        const response = await createChatResponse(db, tools, {
          messages: [...(fixture.chat?.history ?? []), { id: 'eval-user', role: 'user', parts: [{ type: 'text', text: fixture.text }] }],
          context: fixture.chat?.context ?? [{ kind: 'theory', id: 't3', label: 'Agents keep context across months of sessions' }],
        });
        await response.text();
        if (provider !== 'fake') {
          // Chat's public endpoint currently defaults its run label to OpenAI.
          // The serial eval adapter selected the actual provider model. Retain
          // the original label as audit metadata rather than misreport Claude.
          const selected = choiceFor('chat', provider).model;
          if (typeof selected === 'string') throw new Error('Expected an explicit chat provider model');
          const runs = db.prepare("SELECT id,provider,model,trace_json FROM agent_runs WHERE job='chat' AND provider NOT IN ('seed','synthetic')").all() as Row[];
          for (const run of runs) {
            const actualProvider = run.model === 'chat-shortcut-v1' ? 'local' : run.model === selected.modelId ? provider : run.provider;
            if (actualProvider === run.provider) continue;
            const trace = JSON.parse(run.trace_json);
            trace.push({ type: 'eval_provider_identity', originalProvider: run.provider, actualProvider, model: run.model, reason: 'Eval-only explicit model selection; local shortcuts do not call a text provider.' });
            db.prepare('UPDATE agent_runs SET provider=?,trace_json=? WHERE id=?').run(actualProvider, JSON.stringify(trace), run.id);
          }
        }
      }
    } catch (caught) { error = caught instanceof Error ? `${caught.name}: ${caught.message}` : String(caught); }
    const runs = db.prepare("SELECT * FROM agent_runs WHERE provider NOT IN ('seed','synthetic') ORDER BY started_at,id").all() as Row[];
    const diagnostics = traceDiagnostics(runs, job);
    const checks = {
      completed: !error && !runs.some(run => run.status === 'failed' && !JSON.parse(run.trace_json ?? '[]').some((event: Row) => event.type === 'jev')),
      noAuthorityErrors: diagnostics.authorityErrors.length === 0,
    };
    return {
      id: fixture.id, job, provider, pass: Object.values(checks).every(Boolean), checks,
      inputTokens: runs.reduce((n, row) => n + (row.input_tokens ?? 0), 0),
      outputTokens: runs.reduce((n, row) => n + (row.output_tokens ?? 0), 0),
      costUsd: runs.reduce((n, row) => n + (row.cost_usd ?? 0), 0),
      diagnostics: { ...diagnostics, durationMs: performance.now() - started, expected: fixture.expected, split: fixture.split, category: fixture.category },
      ...(error ? { error } : {}),
    };
  } finally { try { retainEvaluation(db); } finally { db.close(); } }
}

export function jevCases(version: 'v1' | 'v2' = 'v1'): EvalCase[] {
  const fixtures = version === 'v2' ? jevV2Fixtures : jevFixtures;
  return fixtures.map(fixture => ({
    id: fixture.id, job: jobs[fixture.workflow],
    fixture: {
      version: version === 'v2' ? JEV_V2_FIXTURE_VERSION : JEV_FIXTURE_VERSION,
      text: fixture.text, expected: fixture.expected,
      provenance: version === 'v2' ? jevV2FixtureProvenance : jevFixtureProvenance,
      evaluationRole: version === 'v1' ? 'previously-evaluated-regression' : fixture.split === 'dev' ? 'development' : 'fresh-held-out',
      split: fixture.split, category: fixture.category, prior: fixture.prior, watch: fixture.watch, chat: fixture.chat,
    },
    run: provider => evaluate(fixture, provider),
  }));
}
