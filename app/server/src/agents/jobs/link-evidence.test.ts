import { afterEach, expect, it, vi } from 'vitest';
import * as ai from 'ai';
import { createDatabase } from '../../db/index.js';
import { seed } from '../../seed.js';
import { createTools } from '../../tools/index.js';
import { EvaluationBudgetExceededError, spendBudgetSnapshot, withSpendBudget } from '../spend-budget.js';
import { BudgetExceededError } from '../run.js';
import { fakeChoice, withJevScript } from '../jev.js';
import * as adapters from '../adapters.js';
import { choiceFor } from '../models.js';
import type { AgentDatabase } from '../types.js';
import { linkEvidence, LINK_EVIDENCE_QUESTION_VERSION } from './link-evidence.js';

vi.mock('ai', async importOriginal => {
  const actual = await importOriginal<typeof import('ai')>();
  return { ...actual, generateText: vi.fn(actual.generateText) };
});

const databases: AgentDatabase[] = [];
afterEach(async () => {
  for (const db of databases.splice(0)) db.close();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.mocked(ai.generateText).mockImplementation((await vi.importActual<typeof import('ai')>('ai')).generateText);
  vi.clearAllMocks();
});

function setup() {
  vi.stubEnv('AGENT_MODE', 'fake');
  vi.stubEnv('JEV_LINK_EVIDENCE_MODE', 'on');
  vi.stubEnv('JEV_MODE', 'off');
  const db = createDatabase();
  databases.push(db);
  seed(db);
  const tools = createTools(db);
  const person = { kind: 'person' as const, id: 'maggie' };
  db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES('setup-link-evidence','process_dump','fake','fixture','v1','done',?)").run(new Date().toISOString());
  const dump = tools.call('captureDump', { text: 'A report measured local inference costs.' }, person) as { id: string };
  const actor = { kind: 'agent' as const, job: 'process_dump', runId: 'setup-link-evidence' };
  const signal = tools.call('createSignal', {
    dumpId: dump.id,
    gist: 'Open-weight local models lower inference costs for routine work.',
    note: 'Measured inference costs were lower.',
    sources: [{ url: 'https://example.org/report', title: 'Inference cost report' }],
    fetched: [{ url: 'https://example.org/report', text: 'Open-weight local models lower inference costs for routine work.' }],
  }, actor) as { id: string };
  return { db, tools, person, actor, signal };
}

function answer(request: any, target = 't1', overrides: Record<string, unknown> = {}) {
  const relevant = request.state.theory.id === target || (target === 'both' && ['d1', 't1'].includes(request.state.theory.id));
  return {
    model: request.model,
    answers: {
      relevant: { type: 'noul', noul: relevant ? 0.99 : 0.01 },
      relation: fakeChoice(request.questions.relation.criteria, 'supports', relevant ? 0.99 : 0.3),
      sourceSubstantiatesObservation: { type: 'noul', noul: relevant ? 0.99 : 0.5 },
      ...overrides,
    },
    usage: { input_tokens: 100, output_tokens: 0 },
  };
}

function policies(db: AgentDatabase) {
  return (db.prepare("SELECT trace_json FROM agent_runs WHERE job='link_evidence'").all() as { trace_json: string }[])
    .flatMap(row => JSON.parse(row.trace_json) as any[]).filter(event => event.type === 'jev_policy');
}

function writes(db: AgentDatabase, signalId: string) {
  return {
    evidence: db.prepare('SELECT theory_id,stance,note FROM evidence WHERE signal_id=? ORDER BY theory_id').all(signalId),
    suggestions: (db.prepare("SELECT target_id,status,payload_json FROM suggestions WHERE kind='evidence' ORDER BY target_id").all() as any[])
      .filter(row => JSON.parse(row.payload_json).signal_id === signalId)
      .map(row => ({ target: row.target_id, status: row.status, stance: JSON.parse(row.payload_json).stance, note: JSON.parse(row.payload_json).note })),
  };
}

it('skips confident irrelevant pairs despite ambiguous direction and grounding; templates preserve authority', async () => {
  const { db, tools, signal } = setup();
  await withJevScript(request => answer(request, 'both'), () => linkEvidence(db, tools, signal.id));
  const result = writes(db, signal.id);
  expect(result.evidence).toEqual([expect.objectContaining({ theory_id: 'd1', stance: 'supports' })]);
  expect(result.suggestions).toEqual([expect.objectContaining({ target: 't1', status: 'pending', stance: 'supports' })]);
  expect(result.suggestions[0].note).toBe('The signal reports: “Open-weight local models lower inference costs for routine work.” This observation supports the claim.');
  expect(policies(db).filter(row => row.action === 'skip').length).toBeGreaterThan(0);
  expect(policies(db).every(row => !row.fallback)).toBe(true);
  expect(ai.generateText).not.toHaveBeenCalled();
  expect(db.prepare("SELECT COUNT(*) count FROM agent_runs WHERE job='link_evidence_note'").get()).toEqual({ count: 0 });
});

it('ignores uncertain source grounding when the relation confidently has no direction', async () => {
  const { db, tools, signal } = setup();
  await withJevScript(request => answer(request, 't1', {
    relation: fakeChoice((request.questions.relation as any).criteria, 'no_directional_evidence'),
    sourceSubstantiatesObservation: { type: 'noul', noul: 0.5 },
  }), () => linkEvidence(db, tools, signal.id));
  expect(writes(db, signal.id)).toEqual({ evidence: [], suggestions: [] });
  expect(policies(db).every(row => !row.fallback)).toBe(true);
  expect(ai.generateText).not.toHaveBeenCalled();
});

it('does not turn confidently unsubstantiated source content into an agent fallback', async () => {
  const { db, tools, signal } = setup();
  await withJevScript(request => answer(request, 't1', {
    sourceSubstantiatesObservation: { type: 'noul', noul: 0.01 },
  }), () => linkEvidence(db, tools, signal.id));
  expect(writes(db, signal.id)).toEqual({ evidence: [], suggestions: [] });
  expect(policies(db).find(row => row.pair.theoryId === 't1')).toMatchObject({ action: 'skip', fallback: false });
});

it('dispatches bounded independent pair requests concurrently and drains them on budget failure', async () => {
  const { db, tools, signal } = setup();
  let active = 0;
  let peak = 0;
  await withJevScript(async request => {
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return answer(request);
  }, () => linkEvidence(db, tools, signal.id));
  expect(peak).toBeGreaterThan(1);
  expect(peak).toBeLessThanOrEqual(4);
  expect(active).toBe(0);
});

it.each([new EvaluationBudgetExceededError(), new BudgetExceededError()])('propagates budget errors without a generative fallback', async error => {
  const { db, tools, signal } = setup();
  await expect(withJevScript(() => { throw error; }, () => linkEvidence(db, tools, signal.id))).rejects.toBe(error);
  expect(ai.generateText).not.toHaveBeenCalled();
});

function mockAdjudication(verdict: string, quote = 'Open-weight local models lower inference costs for routine work.') {
  return vi.mocked(ai.generateText).mockResolvedValue({
    text: JSON.stringify({ verdict, quote }), output: { verdict, quote },
    usage: { inputTokens: 100, outputTokens: 40 },
  } as any);
}

it.each(['openai', 'anthropic'] as const)('adjudicates only ambiguous direction with a bounded schema and no tools for %s', async provider => {
  const { db, tools, signal } = setup();
  const generated = mockAdjudication('supports');
  const calls = vi.spyOn(adapters, 'recordedAdapter');
  await withSpendBudget(0.1, async () => {
    await withJevScript(request => answer(request, 't1', {
      relation: fakeChoice((request.questions.relation as any).criteria, 'supports', 0.6),
    }), () => linkEvidence(db, tools, signal.id, { provider }));
    expect(spendBudgetSnapshot()).toMatchObject({ reservedUsd: 0, unknownCostUsd: 0, spentUsd: 0 });
  });
  expect(generated).toHaveBeenCalledTimes(1);
  const request = generated.mock.calls[0]![0];
  const prompt = JSON.parse(String(request.prompt));
  expect(prompt.field).toBe('direction');
  expect(prompt.theory.id).toBe('t1');
  expect(prompt).not.toHaveProperty('answers');
  expect(request).not.toHaveProperty('tools');
  expect(request).not.toHaveProperty('stopWhen');
  expect(request.output).toBeDefined();
  expect(request.maxOutputTokens).toBe(400);
  expect(request.maxRetries).toBe(0);
  expect(request.providerOptions).toEqual(provider === 'anthropic'
    ? { anthropic: { thinking: { type: 'disabled' } } }
    : { openai: { reasoningEffort: 'none' } });
  const reservation = calls.mock.calls.find(call => call[5]?.promptVersion === `${LINK_EVIDENCE_QUESTION_VERSION}-direction`)![5]!.costUpperBoundUsd!;
  const price = choiceFor('link_evidence', provider);
  expect(reservation).toBeGreaterThan((Buffer.byteLength(String(request.prompt)) * price.inputPerMillion + 400 * price.outputPerMillion) / 1_000_000);
  expect(reservation).toBeLessThan((99_000 * price.inputPerMillion + 400 * price.outputPerMillion) / 1_000_000);
  expect(writes(db, signal.id).suggestions.map(row => row.target)).toEqual(['t1']);
  const policy = policies(db).find(row => row.pair.theoryId === 't1');
  expect(policy).toMatchObject({ fallback: true, unresolvedFields: ['direction'], action: 'propose' });
});

it('adjudicates relevance alone and ignores contradictory unused answers after a negative', async () => {
  const { db, tools, signal } = setup();
  const generated = mockAdjudication('no', '');
  await withJevScript(request => answer(request, 't1', request.state && (request.state as any).theory.id === 't1'
    ? { relevant: { type: 'noul', noul: 0.5 } } : {}), () => linkEvidence(db, tools, signal.id));
  expect(generated).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(generated.mock.calls[0]![0].prompt)).field).toBe('relevance');
  expect(writes(db, signal.id)).toEqual({ evidence: [], suggestions: [] });
});

it('adjudicates only uncertain source grounding and verifies the quote against source text', async () => {
  const { db, tools, signal } = setup();
  const generated = mockAdjudication('yes');
  await withJevScript(request => answer(request, 't1', {
    sourceSubstantiatesObservation: { type: 'noul', noul: 0.5 },
  }), () => linkEvidence(db, tools, signal.id));
  expect(generated).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(generated.mock.calls[0]![0].prompt)).field).toBe('grounding');
  expect(writes(db, signal.id).suggestions.map(row => row.target)).toEqual(['t1']);
});

it.each([
  ['supports', 'An invented observation.'],
  ['yes', 'Open-weight local models lower inference costs for routine work.'],
])('rejects invented or wrong-field adjudication %s before any write, retaining raw output', async (verdict, quote) => {
  const { db, tools, signal } = setup();
  mockAdjudication(verdict, quote);
  await expect(withJevScript(request => answer(request, 't1', {
    relation: fakeChoice((request.questions.relation as any).criteria, 'supports', 0.6),
  }), () => linkEvidence(db, tools, signal.id))).rejects.toThrow();
  expect(writes(db, signal.id)).toEqual({ evidence: [], suggestions: [] });
  const run = db.prepare("SELECT status,input_tokens,output_tokens,trace_json FROM agent_runs WHERE prompt_version=?").get(`${LINK_EVIDENCE_QUESTION_VERSION}-direction`) as any;
  expect(run).toMatchObject({ status: 'failed', input_tokens: 100, output_tokens: 40 });
  expect(JSON.parse(run.trace_json)[0].rawText).toBe(JSON.stringify({ verdict, quote }));
});

it('records provider usage and raw text when structured generation fails', async () => {
  const { db, tools, signal } = setup();
  vi.mocked(ai.generateText).mockRejectedValue(Object.assign(new Error('Invalid structured result'), {
    text: '{"verdict":', usage: { inputTokens: 120, outputTokens: 400 },
  }));
  await expect(withJevScript(request => answer(request, 't1', {
    relation: fakeChoice((request.questions.relation as any).criteria, 'supports', 0.6),
  }), () => linkEvidence(db, tools, signal.id))).rejects.toThrow('Invalid structured result');
  const run = db.prepare("SELECT status,input_tokens,output_tokens,trace_json FROM agent_runs WHERE prompt_version=?").get(`${LINK_EVIDENCE_QUESTION_VERSION}-direction`) as any;
  expect(run).toMatchObject({ status: 'failed', input_tokens: 120, output_tokens: 400 });
  expect(JSON.parse(run.trace_json)[0].rawText).toBe('{"verdict":');
});

it('accepts explicit own-observation provenance without gating on irrelevant source uncertainty', async () => {
  const { db, tools, signal } = setup();
  const original = tools.call.bind(tools);
  const call = vi.spyOn(tools, 'call');
  call.mockImplementation((...args) => {
    const result = original(...args);
    if (args[0] === 'getSignal') return { ...result, sources: [{ ownObservation: true }], fetched: [] };
    return result;
  });
  await withJevScript(request => answer(request, 't1', {
    sourceSubstantiatesObservation: { type: 'noul', noul: 0.5 },
  }), () => linkEvidence(db, tools, signal.id));
  expect(writes(db, signal.id).suggestions.map(row => row.target)).toEqual(['t1']);
  expect(ai.generateText).not.toHaveBeenCalled();
});

it('does not treat a URL/title as source evidence or invoke fallback when source content is absent', async () => {
  const { db, tools, signal } = setup();
  db.prepare('UPDATE signals SET fetched_json=NULL WHERE id=?').run(signal.id);
  await withJevScript(request => answer(request), () => linkEvidence(db, tools, signal.id));
  expect(writes(db, signal.id)).toEqual({ evidence: [], suggestions: [] });
  expect(ai.generateText).not.toHaveBeenCalled();
});

it('does not rerun settled proposals or accepted evidence pairs', async () => {
  const { db, tools, signal, actor, person } = setup();
  tools.call('proposeEvidence', { theoryId: 't1', signalId: signal.id, stance: 'supports' }, actor);
  const accepted = tools.call('proposeEvidence', { theoryId: 'd1', signalId: signal.id, stance: 'supports' }, actor) as { id: string };
  tools.call('decideSuggestion', { id: accepted.id, decision: 'accepted' }, person);
  const requested: string[] = [];
  await withJevScript(request => {
    requested.push((request.state as any).theory.id);
    return answer(request);
  }, () => linkEvidence(db, tools, signal.id));
  expect(requested).not.toContain('t1');
  expect(requested).not.toContain('d1');
});

it('preserves baseline writes in shadow and never invokes the structured fallback', async () => {
  const off = setup();
  vi.stubEnv('JEV_LINK_EVIDENCE_MODE', 'off');
  await linkEvidence(off.db, off.tools, off.signal.id);
  const expected = writes(off.db, off.signal.id);
  const shadow = setup();
  vi.stubEnv('JEV_LINK_EVIDENCE_MODE', 'shadow');
  await withJevScript(request => answer(request, 'both'), () => linkEvidence(shadow.db, shadow.tools, shadow.signal.id));
  expect(writes(shadow.db, shadow.signal.id)).toEqual(expected);
  expect(policies(shadow.db).every(row => row.action === 'baseline_unchanged')).toBe(true);
});

it('treats a Jev service failure as unresolved fields of one pair, never a tool-agent retry', async () => {
  const { db, tools, signal } = setup();
  const generated = mockAdjudication('no', '');
  await withJevScript(request => {
    if ((request.state as any).theory.id === 't1') throw new Error('simulated transport failure');
    return answer(request, 'none');
  }, () => linkEvidence(db, tools, signal.id));
  expect(generated).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(generated.mock.calls[0]![0].prompt))).toMatchObject({ field: 'relevance', theory: { id: 't1' } });
  expect(writes(db, signal.id)).toEqual({ evidence: [], suggestions: [] });
  expect(policies(db).find(row => row.pair.theoryId === 't1')).toMatchObject({ fallback: true, jevError: expect.stringContaining('simulated transport failure') });
});

it('keeps fake mode offline when all judgments are uncertain', async () => {
  const { db, tools, signal } = setup();
  await linkEvidence(db, tools, signal.id);
  expect(writes(db, signal.id)).toEqual({ evidence: [], suggestions: [] });
  expect(db.prepare("SELECT COUNT(*) count FROM agent_runs WHERE provider NOT IN ('fake','seed')").get()).toEqual({ count: 0 });
});

it('drains and cancels in-flight pairs before propagating a budget error, without dispatching more', async () => {
  const { db, tools, signal } = setup();
  const error = new EvaluationBudgetExceededError();
  let started = 0;
  let finished = 0;
  await expect(withJevScript(async request => {
    const index = started++;
    try {
      await new Promise(resolve => setTimeout(resolve, index === 0 ? 1 : 15));
      if (index === 0) throw error;
      return answer(request, 'both');
    } finally { finished++; }
  }, () => linkEvidence(db, tools, signal.id))).rejects.toBe(error);
  expect(started).toBeLessThanOrEqual(4);
  expect(finished).toBe(started);
  expect(writes(db, signal.id)).toEqual({ evidence: [], suggestions: [] });
  expect(ai.generateText).not.toHaveBeenCalled();
});

it('propagates budget exhaustion during field adjudication without a broad retry', async () => {
  const { db, tools, signal } = setup();
  const error = new EvaluationBudgetExceededError();
  vi.mocked(ai.generateText).mockRejectedValue(error);
  await expect(withJevScript(request => answer(request, 't1', {
    relation: fakeChoice((request.questions.relation as any).criteria, 'supports', 0.6),
  }), () => linkEvidence(db, tools, signal.id))).rejects.toBe(error);
  expect(ai.generateText).toHaveBeenCalledTimes(1);
  expect(writes(db, signal.id)).toEqual({ evidence: [], suggestions: [] });
});

it('never promotes an edited draft to directly editable evidence', async () => {
  const { db, tools, signal } = setup();
  db.prepare("UPDATE theories SET updated_by='person:maggie' WHERE id='d1'").run();
  await withJevScript(request => answer(request, 'd1'), () => linkEvidence(db, tools, signal.id));
  expect(writes(db, signal.id).evidence).toEqual([]);
  expect(writes(db, signal.id).suggestions).toEqual([expect.objectContaining({ target: 'd1', status: 'pending' })]);
});

it('does not retry or reroute a rejected write through an agent', async () => {
  const { db, tools, signal } = setup();
  const original = tools.call.bind(tools);
  const call = vi.spyOn(tools, 'call').mockImplementation((...args) => {
    if (args[0] === 'proposeEvidence') throw new Error('simulated authority rejection');
    return original(...args);
  });
  await expect(withJevScript(request => answer(request), () => linkEvidence(db, tools, signal.id))).rejects.toThrow('simulated authority rejection');
  expect(call.mock.calls.filter(([name]) => name === 'proposeEvidence')).toHaveLength(1);
  expect(writes(db, signal.id)).toEqual({ evidence: [], suggestions: [] });
  expect(ai.generateText).not.toHaveBeenCalled();
});

it('preserves distribution-key order invariance in the policy for fixed probabilities', async () => {
  async function run(reverse: boolean) {
    const { db, tools, signal } = setup();
    await withJevScript(request => {
      const response = answer(request);
      if (reverse) response.answers.relation.probabilities = Object.fromEntries(Object.entries(response.answers.relation.probabilities).reverse());
      return response;
    }, () => linkEvidence(db, tools, signal.id));
    return writes(db, signal.id);
  }
  expect(await run(true)).toEqual(await run(false));
});

it('does not fabricate a billable token count when provider usage is absent', async () => {
  const { db, tools, signal } = setup();
  vi.mocked(ai.generateText).mockResolvedValue({
    text: '{"verdict":"supports","quote":"routine work"}',
    output: { verdict: 'supports', quote: 'routine work' }, usage: {},
  } as any);
  await expect(withJevScript(request => answer(request, 't1', {
    relation: fakeChoice((request.questions.relation as any).criteria, 'supports', 0.6),
  }), () => linkEvidence(db, tools, signal.id))).rejects.toThrow('no valid billable usage');
  const run = db.prepare("SELECT status,trace_json FROM agent_runs WHERE prompt_version=?").get(`${LINK_EVIDENCE_QUESTION_VERSION}-direction`) as any;
  expect(run.status).toBe('failed');
  expect(JSON.parse(run.trace_json)[0].costUnknown).toBe(true);
});

it('does not let own-observation metadata bypass contradictory fetched-source judgments', async () => {
  const { db, tools, signal } = setup();
  const original = tools.call.bind(tools);
  vi.spyOn(tools, 'call').mockImplementation((...args) => {
    const result = original(...args);
    if (args[0] === 'getSignal') return { ...result, sources: [{ ownObservation: true }] };
    return result;
  });
  await withJevScript(request => answer(request, 't1', {
    sourceSubstantiatesObservation: { type: 'noul', noul: 0.01 },
  }), () => linkEvidence(db, tools, signal.id));
  expect(writes(db, signal.id)).toEqual({ evidence: [], suggestions: [] });
  expect(ai.generateText).not.toHaveBeenCalled();
});

it('rejects action-shaped extra fields in the structured adjudication response', async () => {
  const { db, tools, signal } = setup();
  const output = { verdict: 'supports', quote: 'routine work', tool: 'linkEvidence', theoryId: 'd1' };
  vi.mocked(ai.generateText).mockResolvedValue({
    text: JSON.stringify(output), output, usage: { inputTokens: 100, outputTokens: 50 },
  } as any);
  await expect(withJevScript(request => answer(request, 't1', {
    relation: fakeChoice((request.questions.relation as any).criteria, 'supports', 0.6),
  }), () => linkEvidence(db, tools, signal.id))).rejects.toThrow();
  expect(writes(db, signal.id)).toEqual({ evidence: [], suggestions: [] });
});
