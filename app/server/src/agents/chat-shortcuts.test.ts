import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { seed } from '../seed.js';
import { createTools } from '../tools/index.js';
import { createChatResponse } from './chat.js';
import { CHAT_POLICY_VERSION, resolveChatShortcut } from './chat-shortcuts.js';
import { fakeChoice, withJevScript, type JevRequest } from './jev.js';
import { BudgetExceededError } from './run.js';
import { EvaluationBudgetExceededError } from './spend-budget.js';
import * as agentRun from './run.js';
import { scriptedModel } from './scripted-model.js';

let db: Database;
let tools: ReturnType<typeof createTools>;
const user = (text: string, id = 'user'): UIMessage => ({ id, role: 'user', parts: [{ type: 'text', text }] });
const context = [{ kind: 'theory', id: 't1', label: 'Tokens become nearly free' }];

beforeEach(() => {
  vi.stubEnv('AGENT_MODE', 'fake'); vi.stubEnv('JEV_CHAT_MODE', 'on'); vi.stubEnv('DAILY_SPEND_CAP_USD', '5');
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Tests must not access the network'); }));
  db = createDatabase(); migrate(db); seed(db); tools = createTools(db);
});
afterEach(() => { db.close(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function script(route: string, target: string, options: { readOnly?: number; routeProbability?: number; targetProbability?: number } = {}) {
  return (request: JevRequest) => ({
    model: 'jev-1.14.0',
    answers: Object.fromEntries(Object.entries(request.questions).map(([id, question]) => {
      if (question.type === 'noul') return [id, { type: 'noul', noul: options.readOnly ?? 0.99 }];
      if (question.type !== 'choice') throw new Error('Unexpected primitive');
      const selected = id === 'route' ? route
        : target.startsWith('id:') ? Object.entries(question.criteria).find(([, label]) => String(label).includes(`(id ${target.slice(3)})`))?.[0] ?? 'no_match'
        : target in question.criteria ? target : 'no_match';
      return [id, fakeChoice(question.criteria, selected, id === 'route' ? options.routeProbability : options.targetProbability)];
    })),
    usage: { input_tokens: 100, output_tokens: 0 },
  });
}
const policies = () => (db.prepare("SELECT trace_json FROM agent_runs WHERE job='chat'").all() as { trace_json: string }[])
  .flatMap(row => JSON.parse(row.trace_json)).filter(entry => entry.type === 'jev_policy');
const runs = () => db.prepare("SELECT * FROM agent_runs WHERE model='chat-shortcut-v1'").all() as Record<string, unknown>[];
async function consume(route: string, target: string, text: string, selection = context) {
  return withJevScript(script(route, target), async () => {
    const response = await createChatResponse(db, tools, { messages: [user(text)], context: selection });
    return { response, body: await response.text() };
  });
}
function resolver(messages = [user('Show this theory')], selection = context, theories = [{ id: 't1', claim: 'Tokens become nearly free' }]) {
  return resolveChatShortcut(db, { messages, context: selection, theories, themes: [{ id: 'cost', name: 'Cost of intelligence' }], dumpId: 'test-dump' });
}

it.each([
  ['signals', 'all_recent', 'Show recent signals', [], ['showSignalList'], { limit: 8 }],
  ['signals', 'id:t1', 'Show signals for this theory', context, ['showSignalList'], { theoryId: 't1', limit: 8 }],
  ['signals', 'id:cost', 'Show signals for Cost of intelligence', [], ['showSignalList'], { themeId: 'cost', limit: 8 }],
  ['themeActivity', 'id:cost', 'Show activity in Cost of intelligence', [], ['showThemeActivity'], { themeId: 'cost' }],
  ['theoryEvidence', 'id:t1', 'Show this theory and its evidence', context, ['showTheory', 'showEvidenceSplit'], { id: 't1' }],
] as const)('streams and persists %s / %s using existing result shapes', async (route, target, text, selection, names, expectedInput) => {
  const { response, body } = await consume(route, target, text, [...selection]);
  expect(response.headers.get('x-vercel-ai-ui-message-stream')).toBe('v1');
  expect(body).toContain('"type":"tool-input-available"');
  expect(body).toContain('"type":"tool-output-available"');
  expect(body).toContain('[DONE]');
  for (const name of names) expect(body).toContain(name);
  const dumpId = response.headers.get('X-Aber-Dump-Id');
  const saved = db.prepare('SELECT parts_json,run_id FROM replies WHERE dump_id=?').get(dumpId) as { parts_json: string; run_id: string };
  const parts = JSON.parse(saved.parts_json);
  const displayed = parts.filter((part: { type: string }) => part.type.startsWith('tool-'));
  expect(displayed.map((part: { type: string }) => part.type)).toEqual(names.map(name => `tool-${name}`));
  expect(displayed[0]).toMatchObject({ state: 'output-available', input: expectedInput });
  if (route === 'signals') expect(displayed[0].output).toHaveProperty('signals');
  if (route === 'themeActivity') expect(displayed[0].output).toHaveProperty('counts');
  if (route === 'theoryEvidence') {
    expect(displayed[0].output.id).toBe('t1');
    expect(displayed[1].output).toMatchObject({ theoryId: 't1', supports: expect.any(Array), undermines: expect.any(Array) });
  }
  expect(runs()).toEqual([expect.objectContaining({ id: saved.run_id, status: 'done', cost_usd: 0 })]);
  expect(policies()).toEqual([expect.objectContaining({ policyVersion: CHAT_POLICY_VERSION, action: route, fallback: false, reason: 'confident_read_only_display', stage: 'target' })]);
  expect(fetch).not.toHaveBeenCalled();
});

it.each([
  ['no_match', 'no_match', {}, 'route_no_match'],
  ['signals', 'all_recent', { routeProbability: 0.7 }, 'route_uncertain'],
  ['theoryEvidence', 'id:t1', { readOnly: 0.5 }, 'not_clearly_read_only'],
  ['theoryEvidence', 'no_match', {}, 'target_no_match'],
  ['theoryEvidence', 'id:t1', { targetProbability: 0.7 }, 'target_uncertain'],
] as const)('falls back for %s / %s (%j)', async (route, target, options, reason) => {
  await withJevScript(script(route, target, options), async () => {
    const response = await createChatResponse(db, tools, { messages: [user('Show this theory')], context });
    expect(await response.text()).toContain('showTheory');
  });
  expect(runs()).toHaveLength(0);
  expect(policies()).toEqual([expect.objectContaining({ action: 'generative', fallback: true, reason })]);
});

it('rejects clear imperative writes before asking Jev even when scripted answers would be confident', async () => {
  const ask = vi.fn(script('theoryEvidence', 'id:t1'));
  await withJevScript(ask, async () => {
    const response = await createChatResponse(db, tools, { messages: [user('Show and revise this theory; approve the new evidence')], context });
    await response.text();
  });
  expect(runs()).toHaveLength(0);
  expect(ask).not.toHaveBeenCalled();
  expect(policies()).toHaveLength(0);
});

it('preserves ordered contextual follow-ups and active selection without sending domain payloads', async () => {
  const seen: JevRequest[] = [];
  const messages = [
    user('Show Tokens become nearly free', 'first'),
    { id: 'reply', role: 'assistant', parts: [
      { type: 'text', text: 'Here is that theory.' },
      { type: 'tool-showTheory', toolCallId: 'previous-display', state: 'output-available', input: { id: 't1' }, output: { id: 't1', body: 'x'.repeat(50_000), evidence: ['unrelated full state'] } },
    ] } as UIMessage,
    user('And its evidence?', 'follow-up'),
  ];
  const result = await withJevScript(request => { seen.push(request); return script('theoryEvidence', 'id:t1')(request); }, () => resolver(messages));
  expect(seen).toHaveLength(1);
  expect(result?.calls).toEqual([{ toolName: 'showTheory', input: { id: 't1' } }, { toolName: 'showEvidenceSplit', input: { id: 't1' } }]);
  for (const request of seen) {
    const state = request.state as any;
    expect(state.conversation.map((message: any) => message.role)).toEqual(['user', 'assistant', 'user']);
    expect(state.conversation[1].displayed).toEqual([{ kind: 'theory', id: 't1', label: '' }]);
    expect(state.activeSelection).toEqual(context);
    expect(JSON.stringify(state)).not.toContain('unrelated full state');
    expect(JSON.stringify(state).length).toBeLessThan(4000);
  }
});

it('falls back rather than guessing when a bounded target list or context is incomplete', async () => {
  const theories = Array.from({ length: 30 }, (_, index) => ({ id: `t${index}`, claim: 'Duplicate claim' }));
  expect(await withJevScript(script('theoryEvidence', 'id:t1'), () => resolver(undefined, undefined, theories))).toBeNull();
  expect(policies()[0].reason).toBe('target_candidate_overflow');
  expect(await withJevScript(script('theoryEvidence', 'id:t1'), () => resolver([user('x'.repeat(2000))]))).toBeNull();
  expect(policies()).toHaveLength(1);
});

it('allows explicitly unscoped recent signals even with a large object catalog', async () => {
  const theories = Array.from({ length: 30 }, (_, index) => ({ id: `t${index}`, claim: 'An existing theory' }));
  const result = await withJevScript(script('signals', 'all_recent'), () => resolver([user('Show recent signals')], [], theories));
  expect(result?.calls).toEqual([{ toolName: 'showSignalList', input: { limit: 8 } }]);
});

it.each([
  ['themeActivity', 'cost', 'theme'],
  ['theoryEvidence', 't1', 'theory'],
] as const)('uses only existing %s targets and explicit no-match/ambiguity outcomes', async (route, id, kind) => {
  const seen: JevRequest[] = [];
  await withJevScript(request => { seen.push(request); return script(route, `id:${id}`)(request); }, () => resolver());
  if (seen[0].questions.route.type !== 'choice') throw new Error('Expected route Choice');
  expect(Object.keys(seen[0].questions.route.criteria)).toEqual(expect.arrayContaining(['no_match', 'ambiguous']));
  expect(seen).toHaveLength(1);
  const target = seen[0];
  const question = target.questions[`${route}Target`];
  if (question.type !== 'choice') throw new Error('Expected target Choice');
  const candidate = (target.state as any).candidates.find((item: any) => item.id === id);
  expect(Object.keys(question.criteria)).toEqual(['no_match', 'ambiguous', candidate.key]);
  expect(candidate).toEqual({ key: candidate.key, kind, id, label: kind === 'theme' ? 'Cost of intelligence' : 'Tokens become nearly free' });
});

it('uses saved dump selection for follow-ups without requiring a new context payload', async () => {
  const dump = tools.call('captureDump', { text: 'Show this theory', context }, { kind: 'person', id: 'maggie' });
  const seen: JevRequest[] = [];
  await withJevScript(request => { seen.push(request); return script('theoryEvidence', 'id:t1')(request); }, async () => {
    const response = await createChatResponse(db, tools, { dumpId: dump.id, messages: [user('And its evidence?')] });
    await response.text();
  });
  expect((seen[0].state as any).activeSelection).toEqual(context);
  expect(runs()).toEqual([expect.objectContaining({ status: 'done' })]);
});

it('explicit off does not ask Jev or change the baseline fake', async () => {
  vi.stubEnv('JEV_CHAT_MODE', 'off'); vi.stubEnv('JEV_MODE', undefined);
  const ask = vi.fn(() => { throw new Error('Off must not call Jev'); });
  await withJevScript(ask, async () => {
    const response = await createChatResponse(db, tools, { messages: [user('Show this theory')], context });
    expect(await response.text()).toContain('The split includes pending proposals');
  });
  expect(ask).not.toHaveBeenCalled(); expect(policies()).toHaveLength(0); expect(runs()).toHaveLength(0);
});

it('unscripted fake uncertainty keeps the existing generative fake', async () => {
  const response = await createChatResponse(db, tools, { messages: [user('Show this theory')], context });
  expect(await response.text()).toContain('The split includes pending proposals');
  expect(policies()[0]).toMatchObject({ fallback: true, reason: 'route_uncertain' });
});

it('shadow computes the decision but adds no domain/display writes or changed baseline output', async () => {
  const captured = tools.call('captureDump', { text: 'Show this theory', context }, { kind: 'person', id: 'maggie' });
  const body = { dumpId: captured.id, messages: [user('Show this theory')], context };
  const execute = vi.spyOn(tools, 'call');
  vi.stubEnv('JEV_CHAT_MODE', 'off');
  await (await createChatResponse(db, tools, body)).text();
  const baseline = (db.prepare('SELECT parts_json FROM replies WHERE dump_id=?').get(captured.id) as { parts_json: string }).parts_json;
  const baselineCalls = execute.mock.calls.map(([name, input]) => ({ name, input }));
  execute.mockClear();
  vi.stubEnv('JEV_CHAT_MODE', 'shadow');
  await withJevScript(script('signals', 'all_recent'), async () => { await (await createChatResponse(db, tools, body)).text(); });
  const saved = db.prepare('SELECT parts_json FROM replies WHERE dump_id=? ORDER BY rowid DESC LIMIT 1').get(captured.id) as { parts_json: string };
  expect(saved.parts_json).toBe(baseline);
  expect(execute.mock.calls.map(([name, input]) => ({ name, input }))).toEqual(baselineCalls);
  expect(runs()).toHaveLength(0);
  expect(policies()).toEqual([expect.objectContaining({ action: 'signals', fallback: false })]);
});

it.each([new BudgetExceededError(), new EvaluationBudgetExceededError()])('propagates %s rather than falling back', async error => {
  await expect(withJevScript(() => { throw error; }, () => resolver())).rejects.toBe(error);
});

it.each(['route', 'branch_fallback'])('records explicit %s service errors then uses baseline without duplicate policy records', async stage => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  if (stage === 'branch_fallback') vi.spyOn(agentRun, 'runAgent').mockRejectedValue(new Error('Synthetic Jev outage'));
  await withJevScript(request => {
    if (stage === 'route') throw new Error('Synthetic Jev outage');
    return script('theoryEvidence', 'id:t1', { readOnly: 0.5 })(request);
  }, async () => {
    const response = await createChatResponse(db, tools, { messages: [user('Show this theory')], context });
    expect(await response.text()).toContain('The split includes pending proposals');
  });
  expect(log).toHaveBeenCalled();
  if (stage === 'route') expect(db.prepare("SELECT COUNT(*) n FROM agent_runs WHERE status='failed'").get()).toEqual({ n: 1 });
  expect(policies()).toEqual([expect.objectContaining({ fallback: true, reason: 'service_error', stage })]);
});

it('keeps shortcut reply persistence failure terminal', async () => {
  const call = tools.call.bind(tools);
  vi.spyOn(tools, 'call').mockImplementation((name, input, actor) => {
    if (name === 'reply') throw new Error('Synthetic shortcut persistence failure');
    return call(name, input, actor);
  });
  await withJevScript(script('theoryEvidence', 'id:t1'), async () => {
    const response = await createChatResponse(db, tools, { messages: [user('Show this theory')], context });
    await expect(response.text()).rejects.toThrow('Synthetic shortcut persistence failure');
  });
  expect(runs()).toEqual([expect.objectContaining({ status: 'failed', error: expect.stringContaining('Synthetic shortcut persistence failure') })]);
});

it('retains the SDK tool error shape when a shortcut display fails', async () => {
  const call = tools.call.bind(tools);
  vi.spyOn(tools, 'call').mockImplementation((name, input, actor) => {
    if (name === 'showTheory') throw new Error('Synthetic display failure');
    return call(name, input, actor);
  });
  const { response, body } = await consume('theoryEvidence', 'id:t1', 'Show this theory');
  expect(body).toContain('Synthetic display failure');
  const saved = db.prepare('SELECT parts_json FROM replies WHERE dump_id=?').get(response.headers.get('X-Aber-Dump-Id')) as { parts_json: string };
  expect(JSON.parse(saved.parts_json).find((part: { type: string }) => part.type === 'tool-showTheory').output)
    .toEqual({ error: { name: 'Error', message: 'Synthetic display failure' } });
});

it('does not save a shortcut reply when aborted during display execution', async () => {
  const stop = new AbortController();
  const call = tools.call.bind(tools);
  vi.spyOn(tools, 'call').mockImplementation((name, input, actor) => {
    if (name === 'showTheory') stop.abort(new Error('Synthetic user stop'));
    return call(name, input, actor);
  });
  await withJevScript(script('theoryEvidence', 'id:t1'), async () => {
    const response = await createChatResponse(db, tools, { messages: [user('Show this theory')], context }, { signal: stop.signal });
    await response.text();
    expect(db.prepare('SELECT COUNT(*) n FROM replies WHERE dump_id=?').get(response.headers.get('X-Aber-Dump-Id'))).toEqual({ n: 0 });
  });
  expect(runs()).toEqual([expect.objectContaining({ status: 'failed', error: expect.stringContaining('aborted') })]);
});

it('propagates aborts during Jev decisions without generative fallback', async () => {
  const stop = new AbortController();
  await expect(withJevScript(() => { stop.abort(); throw stop.signal.reason; }, () =>
    createChatResponse(db, tools, { messages: [user('Show this theory')], context }, { signal: stop.signal }),
  )).rejects.toMatchObject({ name: 'AbortError' });
  expect(runs()).toHaveLength(0);
  expect(db.prepare('SELECT COUNT(*) n FROM replies').get()).toEqual({ n: 0 });
  expect(policies()).toEqual([expect.objectContaining({ reason: 'aborted' })]);
});

function boundedAnswer(text: string) {
  return { runId: 'bounded-decision', text, inputTokens: 0, outputTokens: 0, costUsd: 0, trace: [] };
}

it.each([
  'Show me this theory and its evidence split.',
  'The words memory and privacy are in my notes, but show the open theory and its current evidence, not a settings page.',
])('supplies the exact retained contextual request and active object to all speculative questions: %s', async text => {
  const seen: JevRequest[] = [];
  const result = await withJevScript(request => {
    seen.push(request);
    return script('theoryEvidence', 'id:t3')(request);
  }, () => resolver([user(text)], [{ kind: 'theory', id: 't3', label: 'Agents keep context across months of sessions' }], [{ id: 't3', claim: 'Agents keep context across months of sessions' }]));
  expect(result?.calls).toEqual([{ toolName: 'showTheory', input: { id: 't3' } }, { toolName: 'showEvidenceSplit', input: { id: 't3' } }]);
  expect(seen).toHaveLength(1);
  expect((seen[0].state as any).conversation[0].text).toBe(text);
  expect((seen[0].state as any).latestUserIndex).toBe(0);
  expect(Object.keys(seen[0].questions)).toEqual([
    'route', 'signalsFits', 'themeActivityFits', 'theoryEvidenceFits',
    'signalsTarget', 'themeActivityTarget', 'theoryEvidenceTarget',
  ]);
});

it('ignores uncertain or negative answers from unselected speculative branches', async () => {
  const fallback = vi.spyOn(agentRun, 'runAgent');
  const result = await withJevScript(request => {
    const response = script('theoryEvidence', 'id:t1')(request);
    return { ...response, answers: {
      ...response.answers,
      signalsFits: { type: 'noul', noul: 0 },
      themeActivityFits: { type: 'noul', noul: 0.5 },
      signalsTarget: fakeChoice((request.questions.signalsTarget as any).criteria, 'ambiguous', 0.4),
      themeActivityTarget: fakeChoice((request.questions.themeActivityTarget as any).criteria, 'no_match', 0.4),
    } };
  }, () => resolver());
  expect(result?.calls[0]).toMatchObject({ toolName: 'showTheory', input: { id: 't1' } });
  expect(fallback).not.toHaveBeenCalled();
});

it('resolves only the weak fit judgment and preserves the confident route and target', async () => {
  const fallback = vi.spyOn(agentRun, 'runAgent').mockResolvedValue(boundedAnswer('{"fit":"yes"}'));
  const result = await withJevScript(script('theoryEvidence', 'id:t1', { readOnly: 0.42 }), () => resolver());
  expect(result?.calls[0].input).toEqual({ id: 't1' });
  expect(fallback).toHaveBeenCalledTimes(1);
  const [, spec, input] = fallback.mock.calls[0];
  expect(spec).toMatchObject({ maxSteps: 1, maxOutputTokens: 200, maxInputTokens: 24_000 });
  expect(spec.tools('unused')).toEqual({});
  const brief = JSON.parse((input as { prompt: string }).prompt);
  expect(Object.keys(brief.fields)).toEqual(['fit']);
  expect(brief.settled).toEqual({ route: 'theoryEvidence', target: 'object_0' });
  expect(policies()[0]).toMatchObject({ action: 'theoryEvidence', fallback: true, fullAgentFallback: false, fallbackRunIds: ['bounded-decision'] });
});

it('resolves only the uncertain target rather than repeating the route or a settled fit', async () => {
  const fallback = vi.spyOn(agentRun, 'runAgent').mockResolvedValue(boundedAnswer('{"target":"object_0"}'));
  const result = await withJevScript(script('theoryEvidence', 'id:t1', { targetProbability: 0.7 }), () => resolver());
  expect(result?.calls[0].input).toEqual({ id: 't1' });
  const brief = JSON.parse((fallback.mock.calls[0][2] as { prompt: string }).prompt);
  expect(Object.keys(brief.fields)).toEqual(['target']);
  expect(brief.settled).toEqual({ route: 'theoryEvidence', fit: 'yes' });
});

it('batches unresolved target and fit fields into one bounded fallback', async () => {
  const fallback = vi.spyOn(agentRun, 'runAgent').mockResolvedValue(boundedAnswer('{"fit":"yes","target":"object_0"}'));
  const result = await withJevScript(script('theoryEvidence', 'id:t1', { readOnly: 0.42, targetProbability: 0.7 }), () => resolver());
  expect(result?.calls[0].input).toEqual({ id: 't1' });
  expect(fallback).toHaveBeenCalledTimes(1);
  const brief = JSON.parse((fallback.mock.calls[0][2] as { prompt: string }).prompt);
  expect(Object.keys(brief.fields)).toEqual(['fit', 'target']);
  expect(brief.settled).toEqual({ route: 'theoryEvidence' });
});

it('resolves an uncertain route without discarding already batched confident target answers', async () => {
  const fallback = vi.spyOn(agentRun, 'runAgent').mockResolvedValue(boundedAnswer('{"route":"theoryEvidence"}'));
  const result = await withJevScript(script('theoryEvidence', 'id:t1', { routeProbability: 0.7 }), () => resolver());
  expect(result?.calls[0].input).toEqual({ id: 't1' });
  expect(fallback).toHaveBeenCalledTimes(1);
  const brief = JSON.parse((fallback.mock.calls[0][2] as { prompt: string }).prompt);
  expect(Object.keys(brief.fields)).toEqual(['route']);
});

it.each([
  '{"target":"invented-id"}',
  '{"target":"object_1"}',
  '{"target":"object_0","route":"signals"}',
  '{"target":"object_0","approve":true}',
  '{"__proto__":"object_0"}',
  '["object_0"]',
  'not json',
  '{}',
])('rejects invalid bounded target output without altering settled decisions: %s', async output => {
  vi.spyOn(agentRun, 'runAgent').mockResolvedValue(boundedAnswer(output));
  expect(await withJevScript(script('theoryEvidence', 'id:t1', { targetProbability: 0.7 }), () => resolver())).toBeNull();
  expect(policies()[0]).toMatchObject({ fallback: true, reason: 'target_uncertain' });
});

it.each(['no_match', 'ambiguous'])('keeps bounded target %s explicit instead of selecting the first candidate', async answer => {
  vi.spyOn(agentRun, 'runAgent').mockResolvedValue(boundedAnswer(JSON.stringify({ target: answer })));
  const result = await withJevScript(script('theoryEvidence', 'id:t1', { targetProbability: 0.7 }), () => resolver());
  if (answer === 'no_match') expect(result).toBeNull();
  else expect(result).toMatchObject({ calls: [], text: expect.stringContaining('Which theme or theory') });
  expect(policies()[0].reason).toBe(`target_${answer}`);
});

it.each([new BudgetExceededError(), new EvaluationBudgetExceededError()])('propagates bounded fallback %s', async error => {
  vi.spyOn(agentRun, 'runAgent').mockRejectedValue(error);
  await expect(withJevScript(script('theoryEvidence', 'id:t1', { readOnly: 0.42 }), () => resolver())).rejects.toBe(error);
  expect(policies()[0]).toMatchObject({ fallback: true, reason: 'budget_exceeded', stage: 'branch_fallback' });
});

it('does not reintroduce a saved selection after the user explicitly clears context', async () => {
  const dump = tools.call('captureDump', { text: 'Show this theory', context }, { kind: 'person', id: 'maggie' });
  const seen: JevRequest[] = [];
  await withJevScript(request => { seen.push(request); return script('signals', 'all_recent')(request); }, async () => {
    await (await createChatResponse(db, tools, { dumpId: dump.id, messages: [user('Show recent signals')], context: [] })).text();
  });
  expect((seen[0].state as any).activeSelection).toEqual([]);
});

it('includes explicit latest references alongside older displays and the active object', async () => {
  const messages = [
    user('Show the first theory', 'first'),
    { id: 'reply', role: 'assistant', parts: [{ type: 'tool-showTheory', toolCallId: 'old', state: 'output-available', input: { id: 't1' }, output: { id: 't1' } }] } as UIMessage,
    user('Instead show the evidence for the second theory', 'latest'),
  ];
  const seen: JevRequest[] = [];
  const result = await withJevScript(request => { seen.push(request); return script('theoryEvidence', 'id:t2')(request); }, () =>
    resolver(messages, context, [{ id: 't1', claim: 'First theory' }, { id: 't2', claim: 'Second theory' }]));
  expect(result?.calls[0].input).toEqual({ id: 't2' });
  expect((seen[0].state as any).latestUserIndex).toBe(2);
  expect((seen[0].state as any).conversation[1].displayed[0].id).toBe('t1');
  expect((seen[0].state as any).activeSelection).toEqual(context);
});

it('runs a bounded SDK decision without tools then streams the settled display through the usual protocol', async () => {
  const actual = agentRun.runAgent;
  vi.spyOn(agentRun, 'runAgent').mockImplementation((database, spec, input, ctx) =>
    actual(database, { ...spec, model: scriptedModel([{ text: '{"fit":"yes"}' }]) }, input, ctx));
  await withJevScript(script('theoryEvidence', 'id:t1', { readOnly: 0.42 }), async () => {
    const response = await createChatResponse(db, tools, { messages: [user('And its evidence?')], context });
    expect(response.headers.get('x-vercel-ai-ui-message-stream')).toBe('v1');
    const stream = await response.text();
    expect(stream).toContain('"type":"tool-output-available"');
    expect(stream).toContain('showEvidenceSplit');
    expect(stream).toContain('[DONE]');
    const saved = db.prepare('SELECT parts_json,run_id FROM replies WHERE dump_id=?').get(response.headers.get('X-Aber-Dump-Id')) as { parts_json: string; run_id: string };
    expect(runs()).toEqual([expect.objectContaining({ id: saved.run_id, status: 'done' })]);
  });
  const bounded = db.prepare("SELECT id,status,trace_json FROM agent_runs WHERE prompt_version='chat-shortcuts-fallback-v1'").get() as { id: string; status: string; trace_json: string };
  expect(bounded.status).toBe('done');
  expect(JSON.parse(bounded.trace_json)).toEqual([
    expect.objectContaining({ toolCalls: [] }),
    expect.objectContaining({
      type: 'chat_bounded_decision', outcome: 'resolved',
      settled: { route: 'theoryEvidence', target: 'object_0' },
      fields: { fit: expect.objectContaining({ instructions: expect.any(String), criteria: expect.objectContaining({ yes: expect.any(String) }) }) },
      state: expect.objectContaining({ activeSelection: context, latestUserIndex: 0 }),
    }),
  ]);
  expect(policies()[0]).toMatchObject({ action: 'theoryEvidence', fallback: true, fullAgentFallback: false, fallbackRunIds: [bounded.id] });
  expect(fetch).not.toHaveBeenCalled();
});

it('does not interpret quoted action-word mentions as imperative writes', async () => {
  const ask = vi.fn(script('theoryEvidence', 'id:t1'));
  const result = await withJevScript(ask, () => resolver([user('The words "approve" and "delete" occur in the title, but show this theory and its saved evidence.')]));
  expect(result?.calls[0].input).toEqual({ id: 't1' });
  expect(ask).toHaveBeenCalledTimes(1);
});

it('propagates aborts during bounded field resolution without emitting a shortcut', async () => {
  const stop = new AbortController();
  vi.spyOn(agentRun, 'runAgent').mockImplementation(async () => { stop.abort(); throw stop.signal.reason; });
  await expect(withJevScript(script('theoryEvidence', 'id:t1', { readOnly: 0.42 }), () =>
    createChatResponse(db, tools, { messages: [user('Show this theory')], context }, { signal: stop.signal }),
  )).rejects.toMatchObject({ name: 'AbortError' });
  expect(runs()).toHaveLength(0);
  expect(policies()[0]).toMatchObject({ reason: 'aborted', stage: 'branch_fallback' });
});

it.each([
  ['not json', 'invalid_json'],
  ['[]', 'invalid_object'],
  ['{"fit":"yes","route":"signals"}', 'invalid_fields'],
])('journals bounded parse failure %s without adding another policy denominator', async (text, outcome) => {
  const actual = agentRun.runAgent;
  vi.spyOn(agentRun, 'runAgent').mockImplementation((database, spec, input, ctx) =>
    actual(database, { ...spec, model: scriptedModel([{ text }]) }, input, ctx));
  expect(await withJevScript(script('theoryEvidence', 'id:t1', { readOnly: 0.42 }), () => resolver())).toBeNull();
  const bounded = db.prepare("SELECT id,trace_json FROM agent_runs WHERE prompt_version='chat-shortcuts-fallback-v1'").get() as { id: string; trace_json: string };
  expect(JSON.parse(bounded.trace_json).at(-1)).toMatchObject({
    type: 'chat_bounded_decision', outcome,
    settled: { route: 'theoryEvidence', target: 'object_0' },
    state: expect.objectContaining({ activeSelection: context }),
    fields: { fit: expect.any(Object) },
  });
  expect(policies()).toEqual([expect.objectContaining({ fallback: true, fullAgentFallback: true, fallbackRunIds: [bounded.id] })]);
});

it.each([
  ['ambiguous', 'no_match', 'route_ambiguous'],
  ['themeActivity', 'ambiguous', 'target_ambiguous'],
] as const)('streams and persists a no-display clarification for %s / %s', async (route, target, reason) => {
  const fallback = vi.spyOn(agentRun, 'runAgent');
  await withJevScript(script(route, target), async () => {
    const response = await createChatResponse(db, tools, {
      messages: [
        user('I have both Agent memory and Code review after agents in mind. Neither is preferred.', 'prior'),
        user('Show its current activity.', 'latest'),
      ],
      context: [{ kind: 'theme', id: 'memory', label: 'Agent memory' }, { kind: 'theme', id: 'review', label: 'Code review after agents' }],
    });
    expect(response.headers.get('x-vercel-ai-ui-message-stream')).toBe('v1');
    const stream = await response.text();
    expect(stream).toContain('Which theme or theory');
    expect(stream).toContain('[DONE]');
    expect(stream).not.toContain('tool-input-available');
    expect(stream).not.toContain('tool-output-available');
    const saved = db.prepare('SELECT parts_json,run_id FROM replies WHERE dump_id=?').get(response.headers.get('X-Aber-Dump-Id')) as { parts_json: string; run_id: string };
    const parts = JSON.parse(saved.parts_json) as { type: string; text?: string }[];
    expect(parts.filter(part => part.type === 'text')).toEqual([expect.objectContaining({ text: expect.stringContaining('Which theme or theory') })]);
    expect(parts.some(part => part.type.startsWith('tool-'))).toBe(false);
    expect(runs()).toEqual([expect.objectContaining({ id: saved.run_id, status: 'done' })]);
    const trace = db.prepare('SELECT trace_json FROM agent_runs WHERE id=?').get(saved.run_id) as { trace_json: string };
    expect(JSON.parse(trace.trace_json)).toEqual([expect.objectContaining({ toolCalls: [], finishReason: 'stop' })]);
  });
  expect(fallback).not.toHaveBeenCalled();
  expect(policies()).toEqual([expect.objectContaining({ action: 'clarify', fallback: false, fullAgentFallback: false, reason })]);
});

it('resolves uncertain ambiguity in the bounded route check before clarifying', async () => {
  const fallback = vi.spyOn(agentRun, 'runAgent').mockResolvedValue(boundedAnswer('{"route":"ambiguous"}'));
  const result = await withJevScript(script('ambiguous', 'no_match', { routeProbability: 0.87 }), () => resolver());
  expect(result).toMatchObject({ calls: [] });
  expect(fallback).toHaveBeenCalledTimes(1);
  expect(policies()[0]).toMatchObject({ action: 'clarify', fallback: true, fullAgentFallback: false, reason: 'route_ambiguous' });
});

it('keeps ambiguous clarification advisory in shadow without changing the saved baseline', async () => {
  const captured = tools.call('captureDump', { text: 'Show its current activity.', context }, { kind: 'person', id: 'maggie' });
  const body = { dumpId: captured.id, messages: [user('Show its current activity.')], context };
  vi.stubEnv('JEV_CHAT_MODE', 'off');
  await (await createChatResponse(db, tools, body)).text();
  const baseline = (db.prepare('SELECT parts_json FROM replies WHERE dump_id=?').get(captured.id) as { parts_json: string }).parts_json;
  vi.stubEnv('JEV_CHAT_MODE', 'shadow');
  await withJevScript(script('ambiguous', 'no_match'), async () => {
    const stream = await (await createChatResponse(db, tools, body)).text();
    expect(stream).not.toContain('Which theme or theory');
  });
  const saved = db.prepare('SELECT parts_json FROM replies WHERE dump_id=? ORDER BY rowid DESC LIMIT 1').get(captured.id) as { parts_json: string };
  expect(saved.parts_json).toBe(baseline);
  expect(runs()).toHaveLength(0);
  expect(policies()[0]).toMatchObject({ action: 'clarify', fallback: false });
});
