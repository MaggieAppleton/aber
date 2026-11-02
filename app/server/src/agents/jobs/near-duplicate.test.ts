import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createDatabase, migrate, type Database } from '../../db/index.js';
import { createTools } from '../../tools/index.js';
import { withJevScript, JEV_MODEL } from '../jev.js';
import { BudgetExceededError } from '../run.js';
import { EvaluationBudgetExceededError } from '../spend-budget.js';
import * as agentRunner from '../run.js';
import { scriptedModel } from '../scripted-model.js';
import { processDump } from './process-dump.js';
import { nearDuplicateDecision, nearDuplicateQuestions, NEAR_DUP_POLICY, NEAR_DUP_QUESTION_VERSION, NEAR_DUP_FOCUSED_VERSION } from './near-duplicate.js';
import { z } from 'zod';

let db: Database;
const first = { id: 'a', gist: 'Atlas announced a 50% inference price cut on 1 October.' };
const person = { kind: 'person' as const, id: 'maggie' };
const response = (same = 0.99, difference = 0.01) => ({
  model: JEV_MODEL,
  answers: { sameSpecificFinding: { type: 'noul', noul: same }, materialDifference: { type: 'noul', noul: difference } },
  usage: { input_tokens: 100, output_tokens: 0 },
});
const policies = () => (db.prepare("SELECT trace_json FROM agent_runs WHERE job='near_dup' ORDER BY rowid").all() as { trace_json: string }[])
  .flatMap(row => JSON.parse(row.trace_json)).filter(event => event.type === 'jev_policy');
const baselineCount = () => (db.prepare("SELECT COUNT(*) n FROM agent_runs WHERE prompt_version IN ('near-duplicate-v1',?)").get(NEAR_DUP_FOCUSED_VERSION) as { n: number }).n;
const decide = (second = first, fakeDecision = true) => nearDuplicateDecision(db, first, second, {}, undefined, fakeDecision);

beforeEach(() => {
  db = createDatabase(); migrate(db);
  vi.stubEnv('AGENT_MODE', 'fake'); vi.stubEnv('DAILY_SPEND_CAP_USD', '5');
  vi.stubEnv('JEV_MODE', 'off'); vi.stubEnv('JEV_NEAR_DUP_MODE', 'on');
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Tests must not use the network'); }));
});
afterEach(() => { db.close(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('asks two independent Nouls and gates an exact duplicate without the baseline', async () => {
  await withJevScript(request => {
    expect(request.state).toMatchObject({ first, second: first });
    expect(request.questions).toEqual(nearDuplicateQuestions);
    expect(Object.values(request.questions).map(q => q.type)).toEqual(['noul', 'noul']);
    return response();
  }, async () => expect(await decide()).toMatchObject({ sameFinding: true, reasoning: expect.stringContaining(NEAR_DUP_POLICY.version) }));
  expect(baselineCount()).toBe(0);
  expect(policies()).toEqual([expect.objectContaining({
    pair: { first, second: first }, questionVersion: NEAR_DUP_QUESTION_VERSION, policyVersion: NEAR_DUP_POLICY.version,
    action: 'merge', fallback: false, reason: expect.stringContaining('material difference=0.01'),
  })]);
});

it.each([
  ['topic decoy', 'Atlas released a reasoning benchmark.', 0.01, 0.99],
  ['near-miss date', 'Atlas announced a price cut on 1 November.', 0.02, 0.5],
  ['material difference', 'The same Atlas announcement excludes batch inference and raises its prices.', 0.99, 0.98],
])('rejects %s even when the baseline would approve', async (_label, gist, same, difference) => {
  await withJevScript(() => response(same, difference), async () => {
    expect((await decide({ id: 'b', gist })).sameFinding).toBe(false);
  });
  expect(baselineCount()).toBe(0);
  expect(policies()).toEqual([expect.objectContaining({ action: 'no_merge', fallback: false })]);
});

it.each([[0.979, 0.01], [0.99, 0.021], [0.5, 0.5]])('falls back for uncertain margins %s/%s', async (same, difference) => {
  await withJevScript(() => response(same, difference), async () => expect((await decide()).sameFinding).toBe(true));
  expect(baselineCount()).toBe(1);
  expect(policies()).toEqual([expect.objectContaining({ action: 'merge', observedAction: 'fallback', fallback: true, reason: expect.stringContaining('Uncertain') })]);
});

it.each([
  [0.5, 0.01, ['sameSpecificFinding']],
  [0.99, 0.5, ['materialDifference']],
  [0.5, 0.5, ['sameSpecificFinding', 'materialDifference']],
])('verifies only unresolved conditions for %s/%s in one bounded fallback', async (same, difference, unresolved) => {
  const runner = vi.spyOn(agentRunner, 'runAgent');
  await withJevScript(() => response(same as number, difference as number), async () => {
    expect((await decide()).sameFinding).toBe(true);
  });
  expect(runner).toHaveBeenCalledTimes(1);
  const spec = runner.mock.calls[0]![1];
  expect(spec).toMatchObject({ promptVersion: NEAR_DUP_FOCUSED_VERSION, maxSteps: 2 });
  expect(spec.system).toContain('unknown for missing or ambiguous evidence');
  const schema = z.toJSONSchema(spec.tools('schema-check').verifyConditions!.inputSchema as z.ZodType);
  expect(Object.keys(schema.properties!)).toEqual([...(unresolved as string[]), 'reasoning']);
  expect(schema.additionalProperties).toBe(false);
  for (const key of ['sameSpecificFinding', 'materialDifference']) {
    expect(spec.system.includes(`${key}:`)).toBe((unresolved as string[]).includes(key));
  }
  expect(policies()[0]).toMatchObject({ unresolved, fallback: true, observedAction: 'fallback' });
});

it.each([[0.01, 0.5], [0.01, 0.99], [0.5, 0.99], [0.99, 0.99]])('a settled negative %s/%s makes the other judgment irrelevant', async (same, difference) => {
  await withJevScript(() => response(same, difference), async () => expect((await decide()).sameFinding).toBe(false));
  expect(baselineCount()).toBe(0);
  expect(policies()[0]).toMatchObject({ action: 'no_merge', fallback: false });
});

it('cannot merge when focused verification rejects an unresolved material distinction', async () => {
  await withJevScript(() => response(0.99, 0.5), async () => expect((await decide(first, false)).sameFinding).toBe(false));
  expect(policies()[0]).toMatchObject({ action: 'no_merge', unresolved: ['materialDifference'], fallback: true });
});

it('retains the development denominator false merge: same event never overrides a material veto', async () => {
  const original = agentRunner.runAgent;
  const runner = vi.spyOn(agentRunner, 'runAgent').mockImplementation(async (database, spec, input, context) => {
    expect(Object.keys(spec.tools('schema-check'))).toEqual(['verifyConditions']);
    return original(database, {
      ...spec,
      model: scriptedModel([{ calls: [{
        toolName: 'verifyConditions',
        input: {
          sameSpecificFinding: 'yes', materialDifference: 'yes',
          reasoning: 'Both identify the Elm trial, but reviewer minutes per change and additional changes per hour are materially different outcomes; reviewer time was not measured.',
        },
      }] }]),
    }, input, context);
  });
  const a = { id: 'denominator-a', gist: 'The Elm trial saved reviewers 30 minutes per change.' };
  const b = { id: 'denominator-b', gist: 'The Elm trial generated 30 additional changes per hour; reviewer time was not measured.' };
  await withJevScript(() => response(0.37, 0.84), async () => {
    expect((await nearDuplicateDecision(db, a, b)).sameFinding).toBe(false);
  });
  expect(runner).toHaveBeenCalledTimes(1);
  expect(policies()[0]).toMatchObject({
    action: 'no_merge', observedAction: 'fallback', unresolved: ['sameSpecificFinding', 'materialDifference'],
    focusedJudgments: { sameSpecificFinding: 'yes', materialDifference: 'yes' },
  });
});

it.each([
  ['yes', 'no', true], ['yes', 'yes', false], ['yes', 'unknown', false],
  ['no', 'no', false], ['no', 'yes', false], ['no', 'unknown', false],
  ['unknown', 'no', false], ['unknown', 'yes', false], ['unknown', 'unknown', false],
])('code combines focused same=%s and difference=%s without generative merge authority', async (same, difference, expected) => {
  const original = agentRunner.runAgent;
  vi.spyOn(agentRunner, 'runAgent').mockImplementation((database, spec, input, context) => original(database, {
    ...spec,
    model: scriptedModel([{ calls: [{
      toolName: 'verifyConditions',
      input: { sameSpecificFinding: same, materialDifference: difference, reasoning: 'Independent fixture answers.' },
    }] }]),
  }, input, context));
  await withJevScript(() => response(0.37, 0.84), async () => {
    expect((await decide()).sameFinding).toBe(expected);
  });
  expect(policies()[0]).toMatchObject({ focusedJudgments: { sameSpecificFinding: same, materialDifference: difference } });
});

it.each([
  [0.99, 0.5, { materialDifference: 'no' }, true],
  [0.99, 0.5, { materialDifference: 'yes' }, false],
  [0.99, 0.5, { materialDifference: 'unknown' }, false],
  [0.5, 0.01, { sameSpecificFinding: 'yes' }, true],
  [0.5, 0.01, { sameSpecificFinding: 'no' }, false],
  [0.5, 0.01, { sameSpecificFinding: 'unknown' }, false],
])('preserves settled judgments when only one condition is verified: %s/%s %j', async (same, difference, answers, expected) => {
  const original = agentRunner.runAgent;
  vi.spyOn(agentRunner, 'runAgent').mockImplementation((database, spec, input, context) => original(database, {
    ...spec,
    model: scriptedModel([{ calls: [{ toolName: 'verifyConditions', input: { ...answers, reasoning: 'Only the unresolved field is answered.' } }] }]),
  }, input, context));
  await withJevScript(() => response(same as number, difference as number), async () => {
    expect((await decide()).sameFinding).toBe(expected);
  });
  expect(policies()[0]).toMatchObject({
    focusedJudgments: {
      sameSpecificFinding: same === 0.99 ? 'yes' : (answers as Record<string, string>).sameSpecificFinding,
      materialDifference: difference === 0.01 ? 'no' : (answers as Record<string, string>).materialDifference,
    },
  });
});

it('cannot merge when focused verification omits its tool call', async () => {
  const original = agentRunner.runAgent;
  vi.spyOn(agentRunner, 'runAgent').mockImplementation((database, spec, input, context) => original(database, {
    ...spec, model: scriptedModel([{ text: 'These could be the same trial.' }]),
  }, input, context));
  await withJevScript(() => response(0.99, 0.5), async () => expect((await decide()).sameFinding).toBe(false));
  expect(policies()[0]).toMatchObject({ focusedJudgments: { sameSpecificFinding: 'yes', materialDifference: 'unknown' } });
});

it('keeps full note and source evidence, including conflicting results and publication dates', async () => {
  const second = {
    id: 'b', gist: first.gist, note: 'The result excludes batch inference.',
    sources: [{ url: 'https://example.org/report', text: 'Batch inference prices rose.', published_at: '2026-10-03', own_observation: 1 }],
    fetched: [{ url: 'https://example.org/report', title: 'The same announcement', text: 'Batch inference prices rose.', fetchedAt: '2026-10-04' }],
  };
  await withJevScript(request => {
    expect(request.state).toMatchObject({
      second: { note: second.note, sources: [{ text: 'Batch inference prices rose.', publishedAt: '2026-10-03', ownObservation: true }], fetched: second.fetched },
    });
    return response(0.99, 0.99);
  }, async () => expect((await decide(second)).sameFinding).toBe(false));
});

it.each([
  [0.98, 0.02, true],
  [0.01, 0.99, false],
])('applies the same policy with first/second reversed for %s/%s', async (same, difference, expected) => {
  const second = { id: 'b', gist: 'A separate trial measured batch inference prices.' };
  await withJevScript(request => {
    expect(request.state).toMatchObject({ first: second, second: first });
    return response(same as number, difference as number);
  }, async () => expect((await nearDuplicateDecision(db, second, first)).sameFinding).toBe(expected));
  expect(baselineCount()).toBe(0);
});

it('includes the provisional threshold boundaries and uses the existing fake fallback by default', async () => {
  await withJevScript(() => response(0.98, 0.02), async () => expect((await decide()).sameFinding).toBe(true));
  expect(baselineCount()).toBe(0);
  expect((await decide(first, false)).sameFinding).toBe(false);
  expect(baselineCount()).toBe(1);
});

it('keeps Jev off by default and the existing checker unchanged', async () => {
  vi.stubEnv('JEV_NEAR_DUP_MODE', 'off');
  const script = vi.fn(() => response());
  await withJevScript(script, async () => expect((await decide()).sameFinding).toBe(true));
  expect(script).not.toHaveBeenCalled(); expect(baselineCount()).toBe(1);
  expect(policies()[0]).toMatchObject({ action: 'merge', fallback: false, mode: 'off' });
});

it.each(['on', 'shadow'])('records provider errors explicitly before baseline fallback in %s', async mode => {
  vi.stubEnv('JEV_NEAR_DUP_MODE', mode);
  const runner = vi.spyOn(agentRunner, 'runAgent');
  await withJevScript(() => { throw new Error('fixture outage'); }, async () => expect((await decide()).sameFinding).toBe(true));
  expect(db.prepare("SELECT status,error FROM agent_runs WHERE prompt_version=?").get(NEAR_DUP_QUESTION_VERSION)).toMatchObject({ status: 'failed', error: 'fixture outage' });
  expect(policies()).toEqual([expect.objectContaining({ fallback: true, action: 'merge', jevError: 'Error: fixture outage' })]);
  expect(runner.mock.calls[0]![1].promptVersion).toBe(mode === 'shadow' ? 'near-duplicate-v1' : NEAR_DUP_FOCUSED_VERSION);
  if (mode === 'on') expect(policies()[0]).toMatchObject({ unresolved: ['sameSpecificFinding', 'materialDifference'] });
});

it('never treats malformed probabilities as approval and records the error', async () => {
  await withJevScript(() => response(2, 0), async () => expect((await decide(first, false)).sameFinding).toBe(false));
  expect(policies()[0]).toMatchObject({ fallback: true, action: 'no_merge', jevError: expect.stringContaining('Invalid Jev Noul') });
});

it('falls back without truncating oversized evidence or calling Jev', async () => {
  const script = vi.fn(() => response());
  await withJevScript(script, async () => {
    expect((await decide({ ...first, gist: 'Evidence '.repeat(2_000) }, false)).sameFinding).toBe(false);
  });
  expect(script).not.toHaveBeenCalled();
  expect(policies()[0]).toMatchObject({ fallback: true, jevError: expect.stringContaining('conservative bound') });
});

it.each([new BudgetExceededError(), new EvaluationBudgetExceededError()])('propagates %s without generative fallback', async error => {
  await expect(withJevScript(() => { throw error; }, () => decide())).rejects.toBe(error);
  expect(baselineCount()).toBe(0);
});

it.each([new BudgetExceededError(), new EvaluationBudgetExceededError()])('propagates focused fallback %s without retrying', async error => {
  const runner = vi.spyOn(agentRunner, 'runAgent').mockRejectedValue(error);
  await expect(withJevScript(() => response(0.99, 0.5), () => decide())).rejects.toBe(error);
  expect(runner).toHaveBeenCalledTimes(1);
  expect(policies()[0]).toMatchObject({ action: 'error', unresolved: ['materialDifference'], baselineError: expect.stringContaining(error.name) });
});

it('propagates cancellation without generative fallback', async () => {
  const controller = new AbortController();
  const error = new Error('cancelled');
  await expect(withJevScript(() => {
    controller.abort();
    throw error;
  }, () => nearDuplicateDecision(db, first, first, { signal: controller.signal }))).rejects.toBe(error);
  expect(baselineCount()).toBe(0);
});

it('propagates daily budget exhaustion before any model request', async () => {
  vi.stubEnv('DAILY_SPEND_CAP_USD', '0');
  const script = vi.fn(() => response());
  await expect(withJevScript(script, () => decide())).rejects.toBeInstanceOf(BudgetExceededError);
  expect(script).not.toHaveBeenCalled(); expect(baselineCount()).toBe(0);
});

function setupMerge() {
  const tools = createTools(db);
  db.prepare("INSERT OR IGNORE INTO people(id,name,created_at) VALUES('maggie','Maggie',?)").run(new Date().toISOString());
  db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES('fixture-run','process_dump','fake','fake','v1','done',?)").run(new Date().toISOString());
  const actor = { kind: 'agent' as const, job: 'process_dump', runId: 'fixture-run' };
  const dump = tools.call('captureDump', { text: 'Atlas price announcement.' }, person);
  const a = tools.call('createSignal', { dumpId: dump.id, gist: first.gist, sources: [{ url: 'https://example.org/a' }] }, actor);
  const b = tools.call('createSignal', { dumpId: dump.id, gist: first.gist, sources: [{ url: 'https://example.org/b' }] }, actor);
  const run = () => processDump(db, tools, dump.id, { model: scriptedModel([
    { calls: [{ toolName: 'mergeNearDuplicateSignals', input: { survivorId: a.id, absorbedId: b.id, reasoning: 'Untrusted upstream request' } }] },
    { text: 'Done' },
  ]) });
  return { tools, dump, a, b, run };
}

it('uses the real merge log, sources and person-only undo without granting authority', async () => {
  const { tools, a, b, run } = setupMerge();
  await withJevScript(() => response(), run);
  const merge = db.prepare('SELECT * FROM merges').get() as { id: string; reasoning: string; actor: string };
  expect(merge).toMatchObject({ reasoning: expect.stringContaining(NEAR_DUP_POLICY.version), actor: expect.stringContaining('agent:process_dump:') });
  expect(merge.reasoning).not.toContain('Untrusted upstream request');
  expect(tools.call('getSignal', { id: a.id }, person).sources).toHaveLength(2);
  expect(() => tools.call('undoMerge', { id: merge.id }, { kind: 'agent', job: 'process_dump', runId: merge.actor.split(':')[2]! })).toThrow('person');
  tools.call('undoMerge', { id: merge.id }, person);
  expect(tools.call('getSignal', { id: a.id }, person).sources).toHaveLength(1);
  expect(tools.call('getSignal', { id: b.id }, person).sources).toHaveLength(1);
  expect(db.pragma('foreign_key_check')).toEqual([]);
});

it.each(['on', 'shadow'])('a semantic approval never bypasses the caller in %s mode', async mode => {
  const { tools, b, run } = setupMerge();
  vi.stubEnv('JEV_NEAR_DUP_MODE', mode);
  if (mode === 'shadow') tools.call('editSignal', { id: b.id, gist: 'Atlas released a separate benchmark.' }, person);
  await withJevScript(() => mode === 'on' ? response(0.99, 0.99) : response(), run);
  expect(db.prepare('SELECT COUNT(*) n FROM merges').get()).toEqual({ n: 0 });
  expect(policies()[0]).toMatchObject({ action: 'no_merge', fallback: mode === 'shadow' });
});

it.each([[0.01, 0.99], [0.99, 0.01]])('shadow preserves exactly the baseline domain writes despite Jev %s/%s', async (same, difference) => {
  const fixture = setupMerge();
  const tables = ['signals', 'signal_sources', 'signal_origins', 'signal_themes', 'evidence', 'mentions', 'merges', 'events', 'jobs'];
  const snapshot = () => Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));
  const existingIds = new Set(JSON.stringify(snapshot()).match(/[0-9A-HJKMNP-TV-Z]{26}/g));
  const normalise = (value: unknown) => JSON.parse(JSON.stringify(value)
    .replace(/[0-9A-HJKMNP-TV-Z]{26}/g, id => existingIds.has(id) ? id : '[new-id]')
    .replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z/g, '[time]'));
  // Roll back the first execution, leaving identical IDs and records for shadow.
  db.exec('SAVEPOINT baseline');
  vi.stubEnv('JEV_NEAR_DUP_MODE', 'off');
  await fixture.run();
  const expected = normalise(snapshot());
  db.exec('ROLLBACK TO baseline; RELEASE baseline');
  vi.stubEnv('JEV_NEAR_DUP_MODE', 'shadow');
  await withJevScript(() => response(same, difference), fixture.run);
  expect(normalise(snapshot())).toEqual(expected);
  expect(baselineCount()).toBe(1);
  expect(policies()).toEqual([expect.objectContaining({ mode: 'shadow', action: 'merge', observedAction: same > 0.9 ? 'merge' : 'no_merge', fallback: true })]);
});
