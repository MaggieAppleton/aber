import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fakeChoice, withJevScript, type JevRequest } from '../jev.js';
import { scriptedModel } from '../scripted-model.js';
import { BudgetExceededError } from '../run.js';
import { EvaluationBudgetExceededError } from '../spend-budget.js';
import { tripwireFixture } from '../../jobs/tripwire-fixture.js';
import { processJobs } from '../../jobs/runner.js';
import { checkTripwire } from './tripwire.js';
import { parseTripwireCondition, TRIPWIRE_POLICY_VERSION } from './tripwire-jev.js';
import type { Row } from './context.js';
import type { ToolLayer } from '../types.js';

let state: ReturnType<typeof tripwireFixture>;
beforeEach(() => {
  state = tripwireFixture();
  vi.stubEnv('AGENT_MODE', 'fake');
  vi.stubEnv('JEV_MODE', 'off');
  vi.stubEnv('JEV_TRIPWIRE_MODE', 'on');
  vi.stubEnv('DAILY_SPEND_CAP_USD', '5');
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Tests must not access the network'); }));
});
afterEach(() => { state.db.close(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function pair(condition = 'a memory feature is withdrawn after privacy complaints', gist?: string) {
  const signalId = state.addSignal(new Date(state.now.getTime() - 60_000), gist);
  const theory = state.tools.call('setTripwire', { id: state.theory.id, tripwire: condition }, state.person);
  return { signalId, theory, options: { theoryId: theory.id, tripwireVersion: theory.tripwire_version } };
}

function response(request: JevRequest, overrides: Record<string, unknown> = {}, observedText?: string) {
  const input = request.state as Row;
  const selected = (input.candidates as Row[]).findIndex(span => observedText === undefined || span.text.trim() === observedText);
  const selections: Record<string, string> = {
    observedValue: selected < 0 ? 'none' : `span_${selected}`,
  };
  return {
    model: 'jev-1.14.0',
    answers: Object.fromEntries(Object.entries(request.questions).map(([id, question]) => [id, overrides[id] ?? (question.type === 'noul'
      ? { type: 'noul', noul: 0.99 }
      : question.type === 'choice' ? fakeChoice(question.criteria, selections[id]!) : null)])),
    usage: { input_tokens: 100, output_tokens: 0 },
  };
}

function policies(): Row[] {
  return (state.db.prepare('SELECT trace_json FROM agent_runs').all() as Row[]).flatMap(row => JSON.parse(row.trace_json)).filter(row => row.type === 'jev_policy');
}
const quiet = () => scriptedModel([{ text: '{"answers":{"observedValue":"none"}}' }]);

it('defaults to the existing model, without Jev, when off', async () => {
  vi.stubEnv('JEV_TRIPWIRE_MODE', 'off');
  const p = pair();
  const script = vi.fn(() => { throw new Error('must not run'); });
  await withJevScript(script, () => checkTripwire(state.db, state.tools, p.signalId, p.options));
  expect(script).not.toHaveBeenCalled();
  expect(state.hits()).toHaveLength(1);
});

it('proposes only a challenge, preserves evidence/context and is idempotent', async () => {
  const p = pair();
  state.db.prepare('UPDATE signals SET note=? WHERE id=?').run('Source context: privacy complaints led to withdrawal.', p.signalId);
  const before = state.db.prepare('SELECT * FROM theories WHERE id=?').get(p.theory.id);
  const script = vi.fn((request: JevRequest) => {
    expect(request.state).toMatchObject({ signal: { id: p.signalId, note: 'Source context: privacy complaints led to withdrawal.' }, theory: { id: p.theory.id, tripwireVersion: p.theory.tripwire_version } });
    expect(['observed', 'exactCondition'].every(id => request.questions[id]?.type === 'noul')).toBe(true);
    expect(request.questions.sufficient).toBeUndefined();
    expect(request.questions.supported).toBeUndefined();
    return response(request);
  });
  await withJevScript(script, async () => {
    await checkTripwire(state.db, state.tools, p.signalId, p.options);
    await checkTripwire(state.db, state.tools, p.signalId, p.options);
  });
  expect(script).toHaveBeenCalledTimes(1);
  expect(state.hits()).toHaveLength(1);
  expect(state.db.prepare('SELECT * FROM theories WHERE id=?').get(p.theory.id)).toEqual(before);
  expect(state.db.prepare('SELECT * FROM evidence').all()).toEqual([]);
  expect(policies()).toEqual([expect.objectContaining({ policyVersion: TRIPWIRE_POLICY_VERSION, action: 'propose', fallback: false, theoryId: p.theory.id, signalId: p.signalId })]);
  expect(fetch).not.toHaveBeenCalled();
});

it.each([
  ['topic decoy', 'The assistant added memory controls after privacy complaints.', 'exactCondition'],
  ['prediction', 'The memory feature might be withdrawn after privacy complaints.', 'observed'],
])('does not escalate a confident negative: %s', async (_label, gist, key) => {
  const p = pair(undefined, gist);
  const model = scriptedModel([{ calls: [{ toolName: 'proposeChallenge', input: { theoryId: p.theory.id, signalId: p.signalId, why: 'Must not run' } }] }]);
  await withJevScript(request => response(request, { [key]: { type: 'noul', noul: 0.01 } }), () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model }));
  expect(state.hits()).toHaveLength(0);
  expect(policies()[0]).toMatchObject({ action: 'skip', fallback: false, reason: 'confident-negative' });
});

it.each(['observed', 'exactCondition'])('resolves only the ambiguous %s check', async key => {
  const p = pair();
  await withJevScript(request => response(request, { [key]: { type: 'noul', noul: 0.5 } }), () => checkTripwire(state.db, state.tools, p.signalId, p.options));
  expect(state.hits()).toHaveLength(1);
  expect(policies()[0]).toMatchObject({ action: 'propose', fallback: true, usedFallback: true });
});

it('unscripted fake uncertainty follows the baseline', async () => {
  const p = pair();
  await checkTripwire(state.db, state.tools, p.signalId, p.options);
  expect(state.hits()).toHaveLength(1);
  expect(policies()[0].fallback).toBe(true);
});

it.each([
  ['Revenue falls below 100.', 'Revenue was 100.', '100', false],
  ['Revenue falls below 100.', 'Revenue was 100.01.', '100.01', false],
  ['Revenue falls below 100.', 'Revenue was 99.99.', '99.99', true],
  ['Revenue is at least 100.', 'Revenue was 99.99.', '99.99', false],
  ['Revenue is at least 100.', 'Revenue was 100.', '100', true],
  ['Revenue is exactly 0.100000000000000001.', 'Revenue was 0.100000000000000002.', '0.100000000000000002', false],
  ['Launch occurs before 2026-11-03.', 'Launch occurred on 2026-11-03.', '2026-11-03', false],
  ['Launch occurs before 2026-11-03.', 'Launch occurred on 2026-11-04.', '2026-11-04', false],
  ['Launch occurs before 2026-11-03.', 'Launch occurred on 2026-11-02.', '2026-11-02', true],
  ['Launch occurs after 2026-11-03.', 'Launch occurred on 2026-11-02.', '2026-11-02', false],
])('compares in code: %s / %s', async (condition, gist, selected, holds) => {
  const p = pair(condition, gist);
  await withJevScript(request => response(request, {}, selected), () => checkTripwire(state.db, state.tools, p.signalId, p.options));
  expect(state.hits()).toHaveLength(holds ? 1 : 0);
  expect(policies()[0]).toMatchObject({ action: holds ? 'propose' : 'skip', fallback: false, comparison: { observed: { text: expect.stringContaining(selected) } } });
});

it('selects the observed metric from source evidence, not a topic-related decoy', async () => {
  const p = pair('Revenue falls below 100.', 'Revenue stayed near its threshold. Profit was 90.');
  state.db.prepare('UPDATE signals SET note=? WHERE id=?').run('The audited revenue was 100.01.', p.signalId);
  await withJevScript(request => response(request, {}, '100.01'), () => checkTripwire(state.db, state.tools, p.signalId, p.options));
  expect(state.hits()).toHaveLength(0);
  expect(policies()[0].comparison.observed.path).toBe('signal.note');
});

it('preserves supplied fetched/source evidence and selects values from their original spans', async () => {
  const p = pair('Revenue falls below 100.', 'The audited report records revenue.');
  const source = { url: 'https://example.test/audit', excerpt: 'Audited revenue was 100.01. Profit was 90.' };
  const layer: ToolLayer = { ...state.tools, call: async (name, input, actor) => {
    const result = await state.tools.call(name, input, actor);
    return name === 'getSignal' ? { ...result, sources: [source], fetched: [{ text: 'Supporting source context.' }] } : result;
  } };
  await withJevScript(request => {
    expect(request.state).toMatchObject({ signal: { sources: [source], fetched: [{ text: 'Supporting source context.' }] } });
    return response(request, {}, '100.01');
  }, () => checkTripwire(state.db, layer, p.signalId, p.options));
  expect(state.hits()).toHaveLength(0);
  expect(policies()[0].comparison.observed.path).toBe('signal.sources[0].excerpt');
});

it.each(['Revenue falls below 100 and profit falls below 20.', 'Revenue drops by half.', 'Launch occurs within 30 days.', 'Launch occurs after November 3, 2026.', 'Revenue falls below 1 million.', 'Revenue falls below one hundred.', 'Twenty people leave.', 'Revenue falls below 1,00.', 'Revenue falls below 100 minus fees.', 'Launch occurs before 2026-02-30.'])('explicitly abstains on unsupported conditions without model arithmetic: %s', async condition => {
  expect(parseTripwireCondition(condition).kind).toBe('unsupported');
  const p = pair(condition);
  await withJevScript(request => response(request), () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model: quiet() }));
  expect(policies()[0]).toMatchObject({ action: 'fallback', fallback: true });
  expect(state.hits()).toHaveLength(0);
});

it('falls back on no-match or ambiguous extraction rather than guessing', async () => {
  const p = pair('Revenue falls below 100.', 'Revenue was low.');
  await withJevScript(request => response(request), () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model: quiet() }));
  expect(policies()[0]).toMatchObject({ action: 'abstain', fallback: false, reason: 'unresolved-comparison-extraction' });
});

it('falls back when Jev is uncertain which source value to use', async () => {
  const p = pair('Revenue falls below 100.', 'Revenue was 99. Profit was 101.');
  await withJevScript(request => response(request, { observedValue: fakeChoice((request.questions.observedValue as { criteria: Record<string, unknown> }).criteria, 'span_0', 0.6) }), () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model: quiet() }));
  expect(policies()[0]).toMatchObject({ action: 'abstain', fallback: true, reason: 'unresolved-comparison-extraction' });
  expect(state.hits()).toHaveLength(0);
});

it('rejects mismatched units without asking models to re-extract the code-owned operator', async () => {
  const p = pair('Revenue falls below $100.', 'Revenue was €90.');
  await withJevScript(request => response(request), () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model: quiet() }));
  expect(policies()[0].reason).toBe('incompatible-comparison-values');
  await withJevScript(request => {
    expect(request.questions.operator).toBeUndefined();
    expect(request.questions.threshold).toBeUndefined();
    return response(request);
  }, () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model: quiet() }));
  expect(policies()[1].reason).toBe('incompatible-comparison-values');
});

it.each(['version', 'status', 'signal', 'source'])('rechecks freshness after Jev: %s', async mutation => {
  const p = pair();
  await withJevScript(request => {
    if (mutation === 'version') state.tools.call('setTripwire', { id: p.theory.id, tripwire: 'Replacement condition' }, state.person);
    if (mutation === 'status') state.db.prepare("UPDATE theories SET status='retired' WHERE id=?").run(p.theory.id);
    if (mutation === 'signal') state.db.prepare('UPDATE signals SET discarded_at=? WHERE id=?').run(state.now.toISOString(), p.signalId);
    if (mutation === 'source') state.db.prepare('UPDATE signals SET note=? WHERE id=?').run('Corrected: it was not withdrawn.', p.signalId);
    return response(request);
  }, () => checkTripwire(state.db, state.tools, p.signalId, p.options));
  expect(state.hits()).toHaveLength(0);
  expect(policies()[0]).toMatchObject({ action: 'skip', fallback: false });
});

it('shadow judgments are write-isolated and do not filter baseline candidates', async () => {
  vi.stubEnv('JEV_TRIPWIRE_MODE', 'shadow');
  const p = pair();
  const calls: string[] = [];
  const layer: ToolLayer = { ...state.tools, call: (name, input, actor) => { calls.push(name); return state.tools.call(name, input, actor); } };
  const before = state.db.prepare('SELECT * FROM theories').all();
  await withJevScript(request => response(request), () => checkTripwire(state.db, layer, p.signalId, { ...p.options, model: quiet() }));
  expect(calls.filter(name => !['getSignal', 'getTheory'].includes(name))).toEqual([]);
  expect(state.hits()).toHaveLength(0);
  expect(state.db.prepare('SELECT * FROM theories').all()).toEqual(before);
  expect(policies()[0]).toMatchObject({ action: 'shadow', wouldAction: 'propose', fallback: true });
  await withJevScript(request => response(request, { observed: { type: 'noul', noul: 0.01 } }), () => checkTripwire(state.db, layer, p.signalId, p.options));
  expect(state.hits()).toHaveLength(1);
});

it('keeps the existing paged lookback entrypoint and versioned child deduplication', async () => {
  const p = pair();
  const script = vi.fn((request: JevRequest) => response(request));
  await withJevScript(script, () => processJobs(state.db, state.tools, { now: () => new Date(state.now.getTime() + 1000), maxJobs: 20 }));
  expect(script).toHaveBeenCalledTimes(1);
  expect(state.hits()).toEqual([expect.objectContaining({ signal_id: p.signalId, tripwire_version: p.theory.tripwire_version })]);
});

it('uses one request per retrieved signal–theory pair, and never falls back for negative pairs', async () => {
  const p = pair();
  const other = state.tools.call('writeTheory', { claim: 'Second memory theory', tripwire: 'memory withdrawn' }, state.person);
  const script = vi.fn((request: JevRequest) => {
    const theory = (request.state as Row).theory;
    expect(Array.isArray(theory)).toBe(false);
    return response(request, theory.id === p.theory.id ? { exactCondition: { type: 'noul', noul: 0.01 } } : { observed: { type: 'noul', noul: 0.5 } });
  });
  await withJevScript(script, () => checkTripwire(state.db, state.tools, p.signalId, { model: scriptedModel([{ text: '{"answers":{"observed":true}}' }]) }));
  expect(script).toHaveBeenCalledTimes(2);
  expect(state.db.prepare("SELECT target_id FROM suggestions WHERE kind='challenge'").all()).toEqual([{ target_id: other.id }]);
});

it('preserves the tool-layer authority boundary and records safe fallback on denied writes', async () => {
  const p = pair();
  const layer: ToolLayer = { ...state.tools, call: (name, input, actor) => {
    if (name === 'proposeChallenge') { expect(actor).toMatchObject({ kind: 'agent', job: 'tripwire' }); throw new Error('Authority denied'); }
    return state.tools.call(name, input, actor);
  } };
  await withJevScript(request => response(request), () => checkTripwire(state.db, layer, p.signalId, { ...p.options, model: quiet() }));
  expect(state.hits()).toHaveLength(0);
  expect(policies()[0]).toMatchObject({ action: 'abstain', fallback: false, reason: 'proposeChallenge failed: Authority denied' });
});

it('records non-budget Jev failures and safely falls back', async () => {
  const p = pair();
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await withJevScript(() => { throw new Error('Unavailable'); }, () => checkTripwire(state.db, state.tools, p.signalId, p.options));
  expect(state.hits()).toHaveLength(1);
  expect(warning).toHaveBeenCalled();
  expect(policies()[0]).toMatchObject({ action: 'propose', fallback: true, reason: 'focused-observed-outcome-after-jev-failure' });
  warning.mockRestore();
});

it('keeps failure diagnostics and blocks stale writes after focused recovery', async () => {
  const p = pair();
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await withJevScript(() => {
    state.tools.call('setTripwire', { id: p.theory.id, tripwire: 'Replacement' }, state.person);
    throw new Error('Unavailable');
  }, () => checkTripwire(state.db, state.tools, p.signalId, p.options));
  expect(state.hits()).toHaveLength(0);
  expect(policies()).toEqual([expect.objectContaining({ action: 'skip', fallback: true, reason: 'Tripwire version changed' })]);
  warning.mockRestore();
});

it.each([new BudgetExceededError(), new EvaluationBudgetExceededError()])('propagates budget exhaustion without fallback: %s', async error => {
  const p = pair();
  await expect(withJevScript(() => { throw error; }, () => checkTripwire(state.db, state.tools, p.signalId, p.options))).rejects.toBe(error);
  expect(state.hits()).toHaveLength(0);
});

it('retains the development failure as a focused-check regression, not a threshold change', async () => {
  const p = pair('a major assistant withdraws its memory feature following privacy complaints', 'Major assistant Northstar withdrew its saved memory feature following verified privacy complaints on 2 November.');
  const model = scriptedModel([options => {
    const text = JSON.stringify(options.prompt);
    expect(text).toContain('Resolve ONLY');
    expect(text).not.toContain('supports');
    expect(options.tools ?? []).toHaveLength(0);
    expect(text).not.toContain('Agents keep context across months');
    return { text: '{"answers":{"observed":true,"exactCondition":true}}' };
  }]);
  await withJevScript(request => {
    expect(Object.keys(request.questions)).toEqual(['observed', 'exactCondition']);
    return response(request, { observed: { type: 'noul', noul: 0.85 }, exactCondition: { type: 'noul', noul: 0.85 } });
  }, () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model }));
  expect(state.hits()).toHaveLength(1);
  expect(policies()[0]).toMatchObject({ action: 'propose', fallback: true, usedFallback: true });
  expect(state.db.prepare("SELECT COUNT(*) AS n FROM agent_runs WHERE prompt_version='tripwire-v1'").get()).toEqual({ n: 0 });
});

it('does not rejudge resolved checks in the focused fallback', async () => {
  const p = pair();
  const model = scriptedModel([options => {
    const user = options.prompt.find(message => message.role === 'user');
    const text = user?.content.find(part => part.type === 'text');
    const prompt = JSON.parse(text && 'text' in text ? text.text : '{}');
    expect(prompt.checks.map((check: Row) => check.key)).toEqual(['exactCondition']);
    return { text: '{"answers":{"exactCondition":false}}' };
  }]);
  await withJevScript(request => response(request, { exactCondition: { type: 'noul', noul: 0.5 } }), () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model }));
  expect(state.hits()).toHaveLength(0);
  expect(policies()[0]).toMatchObject({ action: 'skip', fallback: true, reason: 'focused-negative' });
});

it('ignores uncertain unused actuality when the exact condition is confidently false', async () => {
  const p = pair();
  const fallback = vi.fn(() => { throw new Error('must not fall back'); });
  await withJevScript(request => response(request, { observed: { type: 'noul', noul: 0.5 }, exactCondition: { type: 'noul', noul: 0.01 } }), () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model: scriptedModel([fallback]) }));
  expect(fallback).not.toHaveBeenCalled();
  expect(policies()[0]).toMatchObject({ action: 'skip', fallback: false });
});

it('uses an exact code-negative before falling back for unrelated uncertain checks', async () => {
  const p = pair('Revenue falls below 100.', 'Revenue was 100.01.');
  const fallback = vi.fn(() => { throw new Error('must not fall back'); });
  await withJevScript(request => response(request, { observed: { type: 'noul', noul: 0.5 }, exactCondition: { type: 'noul', noul: 0.5 } }, '100.01'), () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model: scriptedModel([fallback]) }));
  expect(fallback).not.toHaveBeenCalled();
  expect(policies()[0]).toMatchObject({ action: 'skip', fallback: false, reason: 'code-comparison-not-satisfied' });
});

it('lets focused fallback choose a source span, never perform the comparison', async () => {
  const p = pair('Revenue falls below 100.', 'Revenue was 100.01. Profit was 90.');
  const model = scriptedModel([options => {
    const text = JSON.stringify(options.prompt);
    expect(text).toContain('observedValue');
    expect(text).toContain('Do not compare');
    return { text: '{"answers":{"observedValue":"span_0"}}' };
  }]);
  await withJevScript(request => response(request, { observedValue: fakeChoice((request.questions.observedValue as { criteria: Record<string, unknown> }).criteria, 'span_0', 0.6) }), () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model }));
  expect(state.hits()).toHaveLength(0);
  expect(policies()[0]).toMatchObject({ action: 'skip', fallback: true, reason: 'code-comparison-not-satisfied', comparison: { observed: { value: '100.01' } } });
});

it.each([
  'a major assistant withdraws its memory feature, or people switch memory off once they see what it keeps',
  'the provider withdraws memory and publishes an independent privacy audit',
  'the provider withdraws memory unless users opt in',
  'the provider does not retain private memories after withdrawal',
])('preserves the full qualitative compound meaning: %s', async condition => {
  const p = pair(condition);
  await withJevScript(request => {
    expect((request.state as Row).theory.tripwire).toBe(condition);
    expect((request.questions.exactCondition.instructions as string)).toContain('Preserve AND, OR, negation, causal and temporal relationships and shared qualifiers exactly');
    expect((request.state as Row).condition.kind).toBe('qualitative');
    return response(request);
  }, () => checkTripwire(state.db, state.tools, p.signalId, p.options));
  expect(state.hits()).toHaveLength(1);
});

it.each([
  '{"answers":{"exactCondition":null}}',
  '{"answers":{"exactCondition":"true"}}',
  '{"answers":{"exactCondition":true,"observed":true}}',
  'not JSON',
])('does not act or rerun the capture for invalid or unresolved focused output: %s', async text => {
  const p = pair();
  const fallback = vi.fn(() => ({ text }));
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await withJevScript(request => response(request, { exactCondition: { type: 'noul', noul: 0.5 } }), () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model: scriptedModel([fallback]) }));
  expect(fallback).toHaveBeenCalledTimes(1);
  expect(state.hits()).toHaveLength(0);
  expect(policies()[0]).toMatchObject({ action: 'abstain', fallback: true });
  warning.mockRestore();
});

it('excludes source IDs and tracking numbers from observed-value candidates', async () => {
  const p = pair('Revenue falls below 100.', 'Revenue was 101.');
  const layer: ToolLayer = { ...state.tools, call: async (name, input, actor) => {
    const result = await state.tools.call(name, input, actor);
    return name === 'getSignal' ? { ...result, sources: [{ id: '90', url: 'https://example.test/99', created_at: '2026-11-03', excerpt: 'Audited revenue was 101.' }] } : result;
  } };
  await withJevScript(request => {
    expect((request.state as Row).candidates.every((candidate: Row) => candidate.value === '101')).toBe(true);
    expect((request.state as Row).signal.sources[0].created_at).toBeUndefined();
    return response(request, {}, '101');
  }, () => checkTripwire(state.db, layer, p.signalId, p.options));
  expect(state.hits()).toHaveLength(0);
});

it.each([new BudgetExceededError(), new EvaluationBudgetExceededError()])('propagates focused fallback budget exhaustion without a second attempt: %s', async error => {
  const p = pair();
  const fallback = vi.fn(() => { throw error; });
  await expect(withJevScript(request => response(request, { exactCondition: { type: 'noul', noul: 0.5 } }), () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model: scriptedModel([fallback]) }))).rejects.toBe(error);
  expect(fallback).toHaveBeenCalledTimes(1);
  expect(state.hits()).toHaveLength(0);
});

it('dispatches unsupported compound hits to the baseline restricted to the exact original pair', async () => {
  const condition = 'a major assistant withdraws its memory feature, or people switch memory off within 30 days';
  const p = pair(condition);
  const other = state.tools.call('writeTheory', { claim: 'Other held theory', tripwire: 'something else' }, state.person);
  const model = scriptedModel([options => {
    const user = options.prompt.find(message => message.role === 'user');
    const text = user?.content.find(part => part.type === 'text');
    const input = JSON.parse(text && 'text' in text ? text.text : '{}');
    expect(input.theories).toEqual([{ id: p.theory.id, tripwire: condition, tripwireVersion: p.theory.tripwire_version }]);
    expect(options.tools?.map(item => item.name)).toEqual(['proposeChallenge']);
    return { calls: [
      { toolName: 'proposeChallenge', input: { theoryId: other.id, signalId: p.signalId, why: 'Wrong theory' } },
      { toolName: 'proposeChallenge', input: { theoryId: p.theory.id, signalId: 'other-signal', why: 'Wrong signal' } },
      { toolName: 'proposeChallenge', input: { theoryId: p.theory.id, signalId: p.signalId, tripwireVersion: p.theory.tripwire_version + 1, why: 'Wrong version' } },
      { toolName: 'proposeChallenge', input: { theoryId: p.theory.id, signalId: p.signalId, why: 'The provider withdrew its memory feature.' } },
    ] };
  }, { text: 'Done.' }]);
  await withJevScript(request => {
    expect(request.questions.observedValue).toBeUndefined();
    return response(request);
  }, () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model }));
  expect(state.hits()).toEqual([expect.objectContaining({ signal_id: p.signalId, tripwire_version: p.theory.tripwire_version })]);
  expect(state.db.prepare("SELECT target_id FROM suggestions WHERE kind='challenge'").all()).toEqual([{ target_id: p.theory.id }]);
  expect(policies()).toEqual(expect.arrayContaining([
    expect.objectContaining({ action: 'fallback_agent', fallback: true, reason: 'pair-scoped-baseline: complex-or-relative-condition' }),
    expect.objectContaining({ action: 'fallback', fallback: true, baselineRequired: true, usedFallback: true }),
  ]));
});

it('blocks unsupported baseline writes if the watched version changes during generation', async () => {
  const p = pair('Revenue falls below 100 or launch occurs within 30 days.');
  const model = scriptedModel([() => {
    state.tools.call('setTripwire', { id: p.theory.id, tripwire: 'Replacement' }, state.person);
    return { calls: [{ toolName: 'proposeChallenge', input: { theoryId: p.theory.id, signalId: p.signalId, why: 'Old condition' } }] };
  }, { text: 'Done.' }]);
  await withJevScript(request => response(request), () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model }));
  expect(state.hits()).toHaveLength(0);
  const traces = state.db.prepare('SELECT trace_json FROM agent_runs').all() as Row[];
  expect(JSON.stringify(traces)).toContain('Tripwire version changed');
});

it.each([new BudgetExceededError(), new EvaluationBudgetExceededError()])('propagates pair-baseline budget exhaustion without another fallback: %s', async error => {
  const p = pair('Revenue falls below 100 or launch occurs within 30 days.');
  const fallback = vi.fn(() => { throw error; });
  await expect(withJevScript(request => response(request), () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model: scriptedModel([fallback]) }))).rejects.toBe(error);
  expect(fallback).toHaveBeenCalledTimes(1);
  expect(state.hits()).toHaveLength(0);
});

it('records missing focused usage as a failed unknown-cost attempt, never a successful zero-cost answer', async () => {
  const p = pair();
  const model = scriptedModel([{ text: '{"answers":{"exactCondition":true}}' }]);
  const generate = model.doGenerate.bind(model);
  vi.spyOn(model, 'doGenerate').mockImplementation(async options => {
    const result = await generate(options);
    return { ...result, usage: { inputTokens: { total: undefined, noCache: undefined, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: undefined, text: undefined, reasoning: undefined } } };
  });
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await withJevScript(request => response(request, { exactCondition: { type: 'noul', noul: 0.5 } }), () => checkTripwire(state.db, state.tools, p.signalId, { ...p.options, model }));
  expect(state.hits()).toHaveLength(0);
  expect(state.db.prepare("SELECT status,error FROM agent_runs WHERE prompt_version='tripwire-focused-q2-fallback'").get()).toEqual({ status: 'failed', error: 'Tripwire focused fallback usage is unknown' });
  expect(policies()[0]).toMatchObject({ action: 'abstain', fallback: true });
  warning.mockRestore();
});
