import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createDatabase, migrate, type Database } from '../../db/index.js';
import { createTools } from '../../tools/index.js';
import { fakeChoice, withJevScript, type JevRequest } from '../jev.js';
import { scriptedModel, toolOutputs, outputId, type ScriptStep, type StepFactory } from '../scripted-model.js';
import { BudgetExceededError } from '../run.js';
import { EvaluationBudgetExceededError } from '../spend-budget.js';
import { processDump } from './process-dump.js';
import { PROCESS_POLICY_VERSION, PROCESS_QUESTION_VERSION, processingDecisions } from './process-decisions.js';
import * as runners from '../run.js';
import * as adapters from '../adapters.js';
import { choiceFor } from '../models.js';

let db: Database;
let tools: ReturnType<typeof createTools>;
const person = { kind: 'person' as const, id: 'maggie' };
const url = 'https://example.org/report';
const gist = 'The lab halved inference costs';
beforeEach(() => {
  vi.stubEnv('AGENT_MODE', 'fake');
  vi.stubEnv('DAILY_SPEND_CAP_USD', '5');
  vi.stubEnv('JEV_MODE', 'off');
  vi.stubEnv('JEV_PROCESS_DUMP_MODE', 'on');
  vi.stubEnv('TYPESAFE_API_KEY', '');
  vi.stubEnv('OPENAI_API_KEY', '');
  vi.stubEnv('ANTHROPIC_API_KEY', '');
  db = createDatabase(); migrate(db); tools = createTools(db);
  db.prepare('INSERT OR IGNORE INTO people(id,name,created_at) VALUES(?,?,?)').run('maggie', 'Maggie', new Date().toISOString());
});
afterEach(() => { db.close(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

const capture = (text = `${gist}.`, urls: string[] = []) => tools.call('captureDump', { text, urls }, person);
const theme = (name: string) => tools.call('writeTheme', { name }, person);
const signalCall = (dumpId: string, value = gist, sources = [{ ownObservation: true }]): ScriptStep => ({
  calls: [{ toolName: 'createSignal', input: { dumpId, gist: value, sources } }],
});
const signals = (dumpId: string) => tools.call('getDump', { id: dumpId }, person).signals as Record<string, any>[];
const count = (table: string) => (db.prepare(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }).n;
function policies() {
  return traceEvents().filter(item => item.type === 'jev_policy');
}
function traceEvents() {
  return (db.prepare('SELECT trace_json FROM agent_runs').all() as { trace_json: string }[])
    .flatMap(row => JSON.parse(row.trace_json));
}
function judgments(overrides: Record<string, string | number> = {}) {
  return (request: JevRequest) => {
    const state = request.state as { candidateThemes?: { id: string }[] };
    return {
      model: 'jev-1.14.0',
      answers: Object.fromEntries(Object.entries(request.questions).map(([id, question]) => {
        const themeId = id.startsWith('theme_') ? state.candidateThemes?.[Number(id.slice(6))]?.id : undefined;
        const value = (themeId ? overrides[`theme:${themeId}`] : undefined) ?? overrides[id];
        return [id, question.type === 'choice' ? fakeChoice(question.criteria, String(value ?? 'supported'))
          : { type: 'noul', noul: value ?? (id === 'combinesDistinctFindings' || id === 'noteUnsupported' ? 0.01 : 0.99) }];
      })),
      usage: { input_tokens: 100, output_tokens: 0 },
    };
  };
}
const run = (dumpId: string, steps: (ScriptStep | StepFactory)[], overrides: Record<string, string | number> = {}) => withJevScript(judgments(overrides), () => processDump(db, tools, dumpId, { model: scriptedModel([...steps, { text: 'Done' }]) }));

it('files into several existing themes in one boundary request, keeping embeddings and origin', async () => {
  const cost = theme('Cost of intelligence'), models = theme('Small models'), unrelated = theme('Gardening');
  const dump = capture();
  await run(dump.id, [signalCall(dump.id)], { [`theme:${unrelated.id}`]: 0.01 });
  const [created] = signals(dump.id);
  const full = tools.call('getSignal', { id: created.id }, person);
  expect(full.themes.sort()).toEqual([cost.id, models.id].sort());
  expect(full.themes).not.toContain(unrelated.id);
  expect(full.origins.map((origin: any) => origin.dumpId)).toEqual([dump.id]);
  expect(db.prepare('SELECT embedding FROM signals WHERE id=?').get(created.id)).toMatchObject({ embedding: expect.any(Uint8Array) });
  const jevRuns = db.prepare('SELECT trace_json FROM agent_runs WHERE prompt_version=?').all(PROCESS_QUESTION_VERSION) as { trace_json: string }[];
  expect(jevRuns).toHaveLength(1);
  const [{ questions, state }] = JSON.parse(jevRuns[0].trace_json);
  expect(Object.keys(questions)).toEqual(['support', 'combinesDistinctFindings', 'theme_0', 'theme_1', 'theme_2']);
  expect(questions.theme_0.type).toBe('noul');
  expect(state.source.capture.text).toBe(dump.text);
  expect(policies()).toEqual(expect.arrayContaining([
    expect.objectContaining({ decision: `theme:${cost.id}`, action: 'file', fallback: false, policyVersion: PROCESS_POLICY_VERSION }),
    expect.objectContaining({ decision: `theme:${unrelated.id}`, action: 'skip', fallback: false }),
  ]));
});

it.each(['unsupported', 'contradicted'])('rejects a known %s gist before all domain writes and permits repair', async verdict => {
  const dump = capture();
  let turn = 0;
  await withJevScript(request => judgments({ support: turn++ ? 'supported' : verdict })(request), () => processDump(db, tools, dump.id, {
    model: scriptedModel([
      signalCall(dump.id, 'The lab doubled inference costs'),
      options => {
        expect(toolOutputs(options, 'createSignal')[0]).toMatchObject({ error: { name: 'ProcessingValidationError', message: expect.stringContaining(verdict) } });
        expect(count('signals')).toBe(0);
        expect(count('signal_origins')).toBe(0);
        expect(count('jobs')).toBe(1); // capture's process_dump job only
        return signalCall(dump.id);
      },
      { text: 'Repaired' },
    ]),
  }));
  expect(signals(dump.id).map(item => item.gist)).toEqual([gist]);
  expect(policies()).toEqual(expect.arrayContaining([expect.objectContaining({ decision: 'gist_support', action: 'reject', fallback: false, reason: verdict })]));
});

it('rejects a supported gist combining distinct findings before saving and asks to split', async () => {
  const dump = capture('The lab halved inference costs. A supplier signed a ten-year power contract.');
  await run(dump.id, [
    signalCall(dump.id, 'The lab halved inference costs and a supplier signed a power contract'),
    options => {
      expect(toolOutputs(options, 'createSignal')[0]).toMatchObject({ error: { message: expect.stringContaining('Split') } });
      return { text: 'Will split the observations.' };
    },
  ], { combinesDistinctFindings: 0.99 });
  expect(signals(dump.id)).toEqual([]);
  expect(policies()).toEqual(expect.arrayContaining([expect.objectContaining({ decision: 'distinct_findings', action: 'reject', fallback: false })]));
});

it.each(['insufficient', 'ambiguous'])('keeps generative gist behavior when support is %s', async decision => {
  const dump = capture('A useful observation whose source is incomplete.');
  await withJevScript(request => {
    const response = judgments({ support: 'insufficient', combinesDistinctFindings: 0.5 })(request);
    if (decision === 'ambiguous') response.answers.support = fakeChoice((request.questions.support as any).criteria, 'unsupported', 0.55);
    return response;
  }, () => processDump(db, tools, dump.id, { model: scriptedModel([signalCall(dump.id), { text: 'Done' }]) }));
  expect(signals(dump.id)).toHaveLength(1);
  expect(policies()).toEqual(expect.arrayContaining([expect.objectContaining({ decision: 'gist_support', action: 'generative_fallback', fallback: true })]));
});

it('leaves uncertain theme filing to the original model and refuses only known non-matches', async () => {
  const uncertain = theme('Uncertain label'), wrong = theme('Wrong label'), dump = capture();
  await run(dump.id, [
    signalCall(dump.id),
    options => ({ calls: [
      { toolName: 'fileSignal', input: { signalId: outputId(toolOutputs(options, 'createSignal')[0]), themeId: uncertain.id } },
      { toolName: 'fileSignal', input: { signalId: outputId(toolOutputs(options, 'createSignal')[0]), themeId: wrong.id } },
    ] }),
    options => {
      expect(toolOutputs(options, 'fileSignal')[1]).toMatchObject({ error: { name: 'ProcessingValidationError' } });
      return { text: 'Filed.' };
    },
  ], { [`theme:${uncertain.id}`]: 0.5, [`theme:${wrong.id}`]: 0.01 });
  expect(tools.call('getSignal', { id: signals(dump.id)[0].id }, person).themes).toEqual([uncertain.id]);
});

it.each([
  ['prototype', 0.99, 0.01, 0.01, true],
  ['prototype', 0.01, 0.99, 0.01, true],
  ['prototype', 0.01, 0.01, 0.99, false],
  ['prototype', 0.5, 0.01, 0.99, true],
  ['theory', 0.99, 0.99, 0.01, false],
  ['theory', 0.01, 0.01, 0.99, true],
  ['theory', 0.01, 0.01, 0.5, true],
] as const)('gates %s separately (request=%s experiment=%s claim=%s)', async (kind, request, experiment, claim, allowed) => {
  const dump = capture('Please compare two local models for one week and measure cost per completed task.');
  const toolName = kind === 'theory' ? 'createDraftTheory' : 'createDraftPrototype';
  const input = kind === 'theory' ? { dumpId: dump.id, claim: 'Local models halve routine task cost by 2028', body: 'Generatively drafted theory.' }
    : { dumpId: dump.id, name: 'One-week comparison', body: 'Generatively drafted experiment.' };
  await run(dump.id, [{ calls: [{ toolName, input }] }, options => {
    expect(toolOutputs(options, toolName)[0]).toMatchObject(allowed ? { id: expect.any(String), body: input.body } : { error: { name: 'ProcessingValidationError' } });
    return { text: 'Done' };
  }], { explicitPrototypeRequest: request, describedExperiment: experiment, falsifiableClaim: claim });
  expect(count(kind === 'theory' ? 'theories' : 'prototypes')).toBe(allowed ? 1 : 0);
  expect(policies().filter(policy => ['explicitPrototypeRequest', 'describedExperiment', 'falsifiableClaim'].includes(policy.decision))).toHaveLength(kind === 'theory' ? 1 : 2);
  expect(traceEvents()).toEqual(expect.arrayContaining([expect.objectContaining({
    decision: `draft:${kind}`, action: allowed ? kind === 'theory' && claim === 0.5 || kind === 'prototype' && request === 0.5 ? 'generative_fallback' : 'allow' : 'reject',
  })]));
});

it('passes actual fetched source and transcripts to the verifier, not just gist or headline', async () => {
  const dump = capture('See the linked report.', [url]);
  db.prepare('INSERT INTO media(id,owner_id,path,mime,bytes,sha256,created_at) VALUES(?,?,?,?,?,?,?)')
    .run('voice-source', 'maggie', 'source.wav', 'audio/wav', 10, 'fixture', new Date().toISOString());
  db.prepare('INSERT INTO transcripts(dump_id,media_id,text,provider,model,created_at) VALUES(?,?,?,?,?,?)')
    .run(dump.id, 'voice-source', 'The speaker says inference costs halved.', 'fake', 'fixture', new Date().toISOString());
  const articleText = 'Contrary to the headline, the lab halved inference costs, not doubled them.';
  await withJevScript(request => {
    const state = request.state as any;
    expect(state.source.articles[0]).toMatchObject({ capturedUrl: url, article: { text: articleText } });
    expect(state.source.capture.transcripts[0].text).toContain('costs halved');
    expect(state.candidate.gist).toBe(gist);
    return judgments()(request);
  }, () => processDump(db, tools, dump.id, {
    articleFetcher: async sourceUrl => ({ url: sourceUrl, title: 'Costs double!', text: articleText, byline: 'Researcher', siteName: 'Example', fetchedAt: new Date().toISOString() }),
    model: scriptedModel([{ calls: [{ toolName: 'createSignal', input: { dumpId: dump.id, gist, sources: [{ url }] } }] }, { text: 'Done' }]),
  }));
  const full = tools.call('getSignal', { id: signals(dump.id)[0].id }, person);
  expect(full.fetched[0].text).toBe(articleText);
  expect(full.sources[0].url).toBe(url);
});

it('preserves multiple source findings, normalized repeat origins and mentions, and tombstones', async () => {
  const dump = capture('Two findings in one report.', [url]);
  const writes = (id: string, value: string): ScriptStep => ({ calls: [{ toolName: 'createSignal', input: { dumpId: id, gist: value, sources: [{ url }] } }] });
  await run(dump.id, [writes(dump.id, gist), writes(dump.id, 'The supplier signed a power contract')]);
  expect(signals(dump.id)).toHaveLength(2);
  const repeated = capture('The report again.', [`${url}?utm_source=test`]);
  const noVerifier = vi.fn(() => { throw new Error('Do not verify a gist that is not written'); });
  await withJevScript(noVerifier, () => processDump(db, tools, repeated.id, {
    model: scriptedModel([{ calls: [{ toolName: 'createSignal', input: { dumpId: repeated.id, gist: 'A new summary of an old article', sources: [{ url: `${url}?utm_source=test` }] } }] }, { text: 'Done' }]),
  }));
  expect(noVerifier).not.toHaveBeenCalled();
  expect(signals(repeated.id)).toHaveLength(2);
  expect(count('signals')).toBe(2);
  expect(count('mentions')).toBe(2);
  tools.call('discardSignal', { id: signals(dump.id)[0].id }, person);
  const tombstone = capture('The discarded report.', [url]);
  const result = await withJevScript(noVerifier, () => processDump(db, tools, tombstone.id, {
    model: scriptedModel([writes(tombstone.id, gist), { text: 'Done' }]),
  }));
  expect(noVerifier).not.toHaveBeenCalled();
  expect(result?.trace).toEqual(expect.arrayContaining([expect.objectContaining({ toolResults: expect.arrayContaining([expect.objectContaining({ output: { error: expect.objectContaining({ message: expect.stringContaining('tombstone') }) } })]) })]));
  expect(count('signals')).toBe(2);
});

it('retains actual fetched provenance for normalized URLs instead of model-supplied article text', async () => {
  const dump = capture('A linked finding.', [`${url}?utm_source=capture`]);
  const actual = 'The lab halved inference costs.';
  await withJevScript(request => {
    expect((request.state as any).source.articles[0].article.text).toBe(actual);
    return judgments()(request);
  }, () => processDump(db, tools, dump.id, {
    articleFetcher: async sourceUrl => ({ url: sourceUrl, title: 'Source', text: actual, byline: null, siteName: null, fetchedAt: new Date().toISOString() }),
    model: scriptedModel([{ calls: [{
      toolName: 'createSignal',
      input: { dumpId: dump.id, gist, sources: [{ url }], fetched: [{ text: 'An invented model-supplied source' }] },
    }] }, { text: 'Done' }]),
  }));
  expect(tools.call('getSignal', { id: signals(dump.id)[0].id }, person).fetched[0].text).toBe(actual);
});

it('preserves image-only captures through insufficient-evidence fallback without inventing image evidence', async () => {
  const dump = capture('');
  db.prepare('INSERT INTO media(id,owner_id,path,mime,bytes,sha256,created_at) VALUES(?,?,?,?,?,?,?)')
    .run('image-source', 'maggie', 'source.png', 'image/png', 10, 'fixture', new Date().toISOString());
  db.prepare('INSERT INTO dump_attachments(id,dump_id,kind,media_id,position,created_at) VALUES(?,?,?,?,?,?)')
    .run('image-attachment', dump.id, 'image', 'image-source', 0, new Date().toISOString());
  await withJevScript(request => {
    expect((request.state as any).source).toMatchObject({
      capture: { attachments: [expect.objectContaining({ id: 'image-attachment', kind: 'image' })] },
      imagePixelsAvailable: false,
    });
    return judgments({ support: 'insufficient', combinesDistinctFindings: 0.5 })(request);
  }, () => processDump(db, tools, dump.id, { model: scriptedModel([signalCall(dump.id, 'A chart shows lower costs'), { text: 'Done' }]) }));
  expect(signals(dump.id)).toHaveLength(1);
  expect(policies()).toEqual(expect.arrayContaining([expect.objectContaining({ decision: 'gist_support', fallback: true })]));
});

it('keeps off and shadow model-visible tools, outputs, writes and proposals identical', async () => {
  const target = theme('Cost of intelligence');
  const snapshots: unknown[] = [];
  const writes: unknown[] = [];
  for (const mode of ['off', 'shadow']) {
    vi.stubEnv('JEV_PROCESS_DUMP_MODE', mode);
    const dump = capture();
    const steps: (ScriptStep | StepFactory)[] = [
      options => {
        snapshots.push(options.tools);
        return signalCall(dump.id, 'Unsupported assertion');
      },
      options => ({ calls: [{ toolName: 'fileSignal', input: { signalId: outputId(toolOutputs(options, 'createSignal')[0]), themeId: target.id } }] }),
      { calls: [{ toolName: 'createDraftTheory', input: { dumpId: dump.id, claim: 'A planted draft claim', body: 'Baseline prose.' } }] },
      { calls: [{ toolName: 'createDraftPrototype', input: { dumpId: dump.id, name: `Prototype ${mode}`, body: 'Baseline experiment prose.' } }] },
      { calls: [{ toolName: 'reply', input: { dumpId: dump.id, parts: [{ type: 'text', text: 'Generative reply unchanged.' }] } }] },
      options => {
        const outputs = ['createSignal', 'fileSignal', 'createDraftTheory', 'createDraftPrototype', 'reply'].map(name => toolOutputs(options, name).map((output: any) => ({
          keys: Object.keys(output).sort(), gist: output.gist, body: output.body, error: output.error,
        })));
        writes.push(outputs);
        return { text: 'Done' };
      },
    ];
    await run(dump.id, steps, { support: 'unsupported', combinesDistinctFindings: 0.99, theme_0: 0.01, explicitPrototypeRequest: 0.01, describedExperiment: 0.01, falsifiableClaim: 0.01 });
    expect(signals(dump.id)).toHaveLength(1);
    expect(tools.call('getSignal', { id: signals(dump.id)[0].id }, person).themes).toEqual([target.id]);
  }
  expect(snapshots[0]).toEqual(snapshots[1]);
  expect(writes[0]).toEqual(writes[1]);
  expect(count('theories')).toBe(2);
  expect(count('prototypes')).toBe(2);
  expect(count('suggestions')).toBe(0);
  expect(policies().every(policy => policy.action === 'shadow')).toBe(true);
  expect(policies()).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'shadow', wouldAction: 'reject' })]));
});

it('uses default uncertain fake judgments without network or any provider keys', async () => {
  const network = vi.fn(() => { throw new Error('No paid calls'); });
  vi.stubGlobal('fetch', network);
  const target = theme('Cost of intelligence'), dump = capture();
  await processDump(db, tools, dump.id);
  expect(signals(dump.id)).toHaveLength(1);
  expect(tools.call('getSignal', { id: signals(dump.id)[0].id }, person).themes).toEqual([target.id]);
  expect(policies().every(policy => policy.fallback)).toBe(true);
  expect(network).not.toHaveBeenCalled();
});

it('falls back on service errors and records explicit error and policy traces', async () => {
  const dump = capture();
  await withJevScript(() => { throw new Error('Jev unavailable'); }, () => processDump(db, tools, dump.id, {
    model: scriptedModel([signalCall(dump.id), options => {
      expect(toolOutputs(options, 'createSignal')[0]).toMatchObject({ id: expect.any(String) });
      return { text: 'Done' };
    }]),
  }));
  expect(signals(dump.id)).toHaveLength(1);
  expect(db.prepare("SELECT error FROM agent_runs WHERE status='failed'").get()).toMatchObject({ error: 'Jev unavailable' });
  expect(policies()).toEqual(expect.arrayContaining([expect.objectContaining({ decision: 'gist_support', fallback: true, reason: expect.stringContaining('unavailable') })]));
});

it.each([BudgetExceededError, EvaluationBudgetExceededError])('propagates %s through the tool loop, without generative fallback or writes', async ErrorType => {
  const dump = capture();
  await expect(withJevScript(() => { throw new ErrorType(); }, () => processDump(db, tools, dump.id, {
    model: scriptedModel([signalCall(dump.id), { text: 'Must not continue' }]),
  }))).rejects.toBeInstanceOf(ErrorType);
  expect(signals(dump.id)).toHaveLength(0);
  expect(policies()).toHaveLength(0);
});

it.each([BudgetExceededError, EvaluationBudgetExceededError])('propagates %s from draft gates, without creating drafts', async ErrorType => {
  const dump = capture();
  await expect(withJevScript(() => { throw new ErrorType(); }, () => processDump(db, tools, dump.id, {
    model: scriptedModel([{ calls: [{ toolName: 'createDraftTheory', input: { dumpId: dump.id, claim: 'A draft claim' } }] }, { text: 'Must not continue' }]),
  }))).rejects.toBeInstanceOf(ErrorType);
  expect(count('theories')).toBe(0);
});

it('does not silently truncate oversize evidence to invent a grounding verdict', async () => {
  const dump = capture();
  const judge = processingDecisions(db, { ...dump, text: 'Source context. '.repeat(4000) }, [], [], {});
  const script = vi.fn(judgments());
  const result = await withJevScript(script, () => judge.signal({ gist, sources: [{ ownObservation: true }] }));
  expect(script).not.toHaveBeenCalled();
  expect(result.rejection).toBeUndefined();
  expect(policies().every(policy => policy.fallback)).toBe(true);
});

it('escalates the retained combined-gist failure as a boundary question, not another full processing pass', async () => {
  const text = 'Northstar review agents restored decisions saved 105 days earlier, cutting human code review time from 110 to 45 minutes per change in a controlled trial.';
  const dump = capture(text);
  let resolutions = 0;
  await withJevScript(judgments({ combinesDistinctFindings: 0.32 }), () => processDump(db, tools, dump.id, {
    processingDecisionModel: scriptedModel([options => {
      resolutions++;
      const prompt = JSON.stringify(options.prompt);
      expect(prompt).toContain(text);
      expect(prompt).toContain('independently reportable findings');
      expect(prompt).not.toContain('candidate.note');
      expect(options.tools?.map(item => item.name)).toEqual(['resolve']);
      expect(prompt).not.toContain('How does source relate');
      return { calls: [{ toolName: 'resolve', input: { combinesDistinctFindings: 'yes' } }] };
    }]),
    model: scriptedModel([
      signalCall(dump.id, 'Northstar restored old decisions and reduced review time.'),
      options => {
        expect(toolOutputs(options, 'createSignal')[0]).toMatchObject({ error: { message: expect.stringContaining('Split') } });
        expect(count('signals')).toBe(0);
        return { text: 'The two outcomes need separate observations.' };
      },
    ]),
  }));
  expect(resolutions).toBe(1);
  expect(count('signals')).toBe(0);
  expect(policies()).toEqual(expect.arrayContaining([
    expect.objectContaining({ decision: 'distinct_findings', action: 'reject', fallback: true, fallbackUsed: true, originalProbability: 0.32 }),
  ]));
  expect(policies()).toHaveLength(2);
  expect(traceEvents()).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'processing_resolution', answers: { combinesDistinctFindings: 'yes' } }),
  ]));
});

it('resolves only uncertain fields together and automatically files without a second full-agent filing step', async () => {
  const target = theme('Cost of intelligence'), dump = capture();
  await withJevScript(request => {
    const response = judgments({ [`theme:${target.id}`]: 0.76 })(request);
    response.answers.support = fakeChoice((request.questions.support as any).criteria, 'supported', 0.55);
    return response;
  }, () => processDump(db, tools, dump.id, {
    processingDecisionModel: scriptedModel([options => {
      const prompt = JSON.stringify(options.prompt);
      expect(prompt).not.toContain('combinesDistinctFindings');
      expect(prompt).toContain('How does source relate');
      expect(prompt).toContain('theme_0');
      return { calls: [{ toolName: 'resolve', input: { support: 'supported', theme_0: 'yes' } }] };
    }]),
    model: scriptedModel([signalCall(dump.id), options => {
      expect(toolOutputs(options, 'createSignal')[0]).toMatchObject({ id: expect.any(String) });
      return { text: 'Done' };
    }]),
  }));
  expect(tools.call('getSignal', { id: signals(dump.id)[0].id }, person).themes).toEqual([target.id]);
  expect(db.prepare('SELECT COUNT(*) n FROM agent_runs WHERE prompt_version=?').get('process-resolution-v2')).toEqual({ n: 1 });
  const checks = policies();
  expect(checks).toHaveLength(3);
  expect(checks.filter(check => check.fallback)).toHaveLength(2);
  expect(checks.filter(check => check.fallbackUsed)).toHaveLength(2);
  expect(checks).toEqual(expect.arrayContaining([
    expect.objectContaining({ decision: 'gist_support', action: 'allow', originalProbability: 0.55, fallback: true, fallbackUsed: true }),
    expect.objectContaining({ decision: 'distinct_findings', originalProbability: 0.01, fallback: false, fallbackUsed: false }),
    expect.objectContaining({ decision: `theme:${target.id}`, action: 'file', originalProbability: 0.76, fallback: true, fallbackUsed: true }),
  ]));
  expect(new Set(checks.map(check => `${check.validationId}:${check.decision}`)).size).toBe(3);
  const [resolution] = traceEvents().filter(event => event.type === 'processing_resolution');
  expect(resolution).toMatchObject({
    validationId: checks[0].validationId,
    state: { candidate: { gist } },
    answers: { support: 'supported', theme_0: 'yes' },
  });
  expect(Object.keys(resolution.questions)).toEqual(['support', 'theme_0']);
});

it('does not escalate irrelevant uncertain gates or themes after a clear gist veto', async () => {
  theme('An uncertain theme');
  const dump = capture();
  const resolver = vi.fn(() => { throw new Error('No resolver needed'); });
  await withJevScript(judgments({ support: 'unsupported', combinesDistinctFindings: 0.5, theme_0: 0.5 }), () => processDump(db, tools, dump.id, {
    processingDecisionModel: scriptedModel([resolver]),
    model: scriptedModel([signalCall(dump.id), { text: 'No write' }]),
  }));
  expect(resolver).not.toHaveBeenCalled();
  expect(count('signals')).toBe(0);
  expect(policies().some(item => item.fallback)).toBe(false);
  expect(policies()).toEqual(expect.arrayContaining([
    expect.objectContaining({ decision: 'distinct_findings', action: 'unused' }),
  ]));
});

it.each(['explicitPrototypeRequest', 'describedExperiment'] as const)('uses the satisfied %s gate without escalating its uncertain alternative', async satisfied => {
  const dump = capture('Please compare two local models for one week and measure cost per completed task.');
  const resolver = vi.fn(() => { throw new Error('An unused gate cannot require escalation'); });
  await withJevScript(request => {
    expect(Object.keys(request.questions)).toEqual(['explicitPrototypeRequest', 'describedExperiment']);
    return judgments({ explicitPrototypeRequest: 0.5, describedExperiment: 0.5, [satisfied]: 0.99 })(request);
  }, async () => {
    const judge = processingDecisions(db, dump, [], [], { processingDecisionModel: scriptedModel([resolver]) });
    expect(await judge.draft('prototype', { name: 'Compare models', body: 'Measure cost per task.' })).toBeUndefined();
  });
  expect(resolver).not.toHaveBeenCalled();
  expect(policies().every(item => !item.fallback)).toBe(true);
  expect(policies().every(item => item.fallbackUsed === false)).toBe(true);
});

it('resolves only the selected draft claim field and preserves code-owned rejection', async () => {
  const dump = capture();
  await withJevScript(judgments({ falsifiableClaim: 0.5 }), () => processDump(db, tools, dump.id, {
    processingDecisionModel: scriptedModel([options => {
      expect(JSON.stringify(options.prompt)).not.toContain('explicitPrototypeRequest');
      return { calls: [{ toolName: 'resolve', input: { falsifiableClaim: 'no' } }] };
    }]),
    model: scriptedModel([
      { calls: [{ toolName: 'createDraftTheory', input: { dumpId: dump.id, claim: 'Models will be interesting.' } }] },
      { text: 'No falsifiable theory to save.' },
    ]),
  }));
  expect(count('theories')).toBe(0);
  expect(traceEvents()).toEqual(expect.arrayContaining([
    expect.objectContaining({ decision: 'draft:theory', action: 'reject' }),
  ]));
  expect(policies()).toEqual([
    expect.objectContaining({ decision: 'falsifiableClaim', originalProbability: 0.5, fallback: true, fallbackUsed: true }),
  ]);
  expect(traceEvents().filter(event => event.type === 'processing_composition')).toHaveLength(1);
});

it.each([BudgetExceededError, EvaluationBudgetExceededError])('propagates %s from bounded resolution without a domain write', async ErrorType => {
  const dump = capture();
  await expect(withJevScript(judgments({ combinesDistinctFindings: 0.5 }), () => processDump(db, tools, dump.id, {
    processingDecisionModel: scriptedModel([() => { throw new ErrorType(); }]),
    model: scriptedModel([signalCall(dump.id), { text: 'Must not continue' }]),
  }))).rejects.toBeInstanceOf(ErrorType);
  expect(count('signals')).toBe(0);
});

it.each(['unresolved', 'service error', 'missing call'])('does not write a text gist when bounded verification returns %s', async outcome => {
  const dump = capture();
  await withJevScript(judgments({ combinesDistinctFindings: 0.5 }), () => processDump(db, tools, dump.id, {
    processingDecisionModel: scriptedModel([() => {
      if (outcome === 'service error') throw new Error('Verifier unavailable');
      return outcome === 'missing call' ? { text: 'Unclear' }
        : { calls: [{ toolName: 'resolve', input: { combinesDistinctFindings: 'unresolved' } }] };
    }]),
    model: scriptedModel([signalCall(dump.id), { text: 'No verified observation.' }]),
  }));
  expect(count('signals')).toBe(0);
  expect(policies()).toHaveLength(2);
  expect(policies().filter(check => check.fallbackUsed)).toEqual([
    expect.objectContaining({ decision: 'distinct_findings', originalProbability: 0.5, fallback: true }),
  ]);
  expect(traceEvents().filter(event => event.type === 'processing_resolution')).toHaveLength(1);
});

it('does not let the full processing agent override an unresolved bounded theme check', async () => {
  const target = theme('Cost of intelligence'), dump = capture();
  await withJevScript(judgments({ theme_0: 0.5 }), () => processDump(db, tools, dump.id, {
    processingDecisionModel: scriptedModel([{ calls: [{ toolName: 'resolve', input: { theme_0: 'unresolved' } }] }]),
    model: scriptedModel([
      signalCall(dump.id),
      options => ({ calls: [{ toolName: 'fileSignal', input: { signalId: outputId(toolOutputs(options, 'createSignal')[0]), themeId: target.id } }] }),
      options => {
        expect(toolOutputs(options, 'fileSignal')[0]).toMatchObject({ error: { message: expect.stringContaining('bounded theme check') } });
        return { text: 'Left unfiled.' };
      },
    ]),
  }));
  expect(tools.call('getSignal', { id: signals(dump.id)[0].id }, person).themes).toEqual([]);
});

it('verifies a generated note field independently and refuses invented source facts before writes', async () => {
  const dump = capture();
  await withJevScript(request => {
    expect(Object.keys(request.questions)).toEqual(['support', 'combinesDistinctFindings', 'noteUnsupported']);
    expect((request.state as any).candidate.note).toBe('The capturing person requested an expensive prototype.');
    return judgments({ noteUnsupported: 0.99 })(request);
  }, () => processDump(db, tools, dump.id, {
    model: scriptedModel([
      { calls: [{ toolName: 'createSignal', input: { dumpId: dump.id, gist, note: 'The capturing person requested an expensive prototype.', sources: [{ ownObservation: true }] } }] },
      options => {
        expect(toolOutputs(options, 'createSignal')[0]).toMatchObject({ error: { message: expect.stringContaining('note field') } });
        return { text: 'Will preserve the original note.' };
      },
    ]),
  }));
  expect(count('signals')).toBe(0);
  expect(policies()).toEqual(expect.arrayContaining([
    expect.objectContaining({ decision: 'noteUnsupported', action: 'reject', fallback: false }),
  ]));
});

it('copies an unchanged capture note without paying for a semantic equality check', async () => {
  const dump = capture();
  await withJevScript(request => {
    expect(Object.keys(request.questions)).not.toContain('noteUnsupported');
    return judgments()(request);
  }, () => processDump(db, tools, dump.id, {
    model: scriptedModel([
      { calls: [{ toolName: 'createSignal', input: { dumpId: dump.id, gist, note: dump.text, sources: [{ ownObservation: true }] } }] },
      { text: 'Done' },
    ]),
  }));
  expect(tools.call('getSignal', { id: signals(dump.id)[0].id }, person).note).toBe(dump.text);
});

it('counts two escalated prototype gates once each even when only one ends up satisfying eligibility', async () => {
  const dump = capture();
  await withJevScript(judgments({ explicitPrototypeRequest: 0.5, describedExperiment: 0.4 }), async () => {
    const judge = processingDecisions(db, dump, [], [], {
      processingDecisionModel: scriptedModel([{ calls: [{
        toolName: 'resolve', input: { explicitPrototypeRequest: 'yes', describedExperiment: 'no' },
      }] }]),
    });
    expect(await judge.draft('prototype', { name: 'Compare models', body: 'Measure cost per task.' })).toBeUndefined();
  });
  expect(policies()).toHaveLength(2);
  expect(policies().filter(check => check.fallback)).toHaveLength(2);
  expect(policies()).toEqual([
    expect.objectContaining({ decision: 'explicitPrototypeRequest', originalProbability: 0.5, fallbackUsed: true }),
    expect.objectContaining({ decision: 'describedExperiment', originalProbability: 0.4, action: 'unused', fallbackUsed: true }),
  ]);
  expect(traceEvents().filter(event => event.type === 'processing_resolution')).toHaveLength(1);
});

it('keeps separate validation identities for repeated and repaired candidates', async () => {
  const dump = capture();
  const judge = processingDecisions(db, dump, [], [], {});
  await withJevScript(judgments(), async () => {
    await judge.signal({ gist });
    await judge.signal({ gist });
    await judge.signal({ gist: 'A repaired finding.' });
  });
  const checks = policies();
  expect(checks).toHaveLength(6);
  expect(new Set(checks.map(check => check.validationId)).size).toBe(3);
  expect(new Set(checks.map(check => `${check.validationId}:${check.decision}`)).size).toBe(6);
  expect(checks.every(check => check.fallbackUsed === false)).toBe(true);
});

it('does not duplicate service-error checks when bounded resolution succeeds', async () => {
  const dump = capture();
  await withJevScript(() => { throw new Error('Jev unavailable'); }, () => processDump(db, tools, dump.id, {
    processingDecisionModel: scriptedModel([{ calls: [{
      toolName: 'resolve', input: { support: 'supported', combinesDistinctFindings: 'no' },
    }] }]),
    model: scriptedModel([signalCall(dump.id), { text: 'Done' }]),
  }));
  expect(signals(dump.id)).toHaveLength(1);
  expect(policies()).toHaveLength(2);
  expect(policies().every(check => check.fallback && check.fallbackUsed && check.originalProbability === null)).toBe(true);
  expect(traceEvents().filter(event => event.type === 'jev_error')).toHaveLength(1);
  expect(traceEvents().filter(event => event.type === 'processing_resolution')).toHaveLength(1);
});

it.each([
  'Disabling one worker stopped its access while leaving the operator session active.',
  'The treated group improved recall relative to the unchanged control group.',
])('preserves one coherent causal or comparative finding: %s', async text => {
  const dump = capture(text);
  await withJevScript(request => {
    const instructions = request.questions.combinesDistinctFindings.instructions;
    expect(instructions).toContain('affected target contrasted with an unaffected target belong together');
    expect(instructions).toContain('Do not split that relationship into isolated clauses');
    return judgments({ combinesDistinctFindings: 0.31 })(request);
  }, () => processDump(db, tools, dump.id, {
    processingDecisionModel: scriptedModel([options => {
      expect(JSON.stringify(options.prompt)).toContain('single coherent causal, comparative or contrast finding');
      return { calls: [{ toolName: 'resolve', input: { combinesDistinctFindings: 'no' } }] };
    }]),
    model: scriptedModel([signalCall(dump.id, text), { text: 'Done' }]),
  }));
  expect(signals(dump.id)).toHaveLength(1);
  expect(policies()).toEqual(expect.arrayContaining([
    expect.objectContaining({ decision: 'distinct_findings', action: 'allow', originalProbability: 0.31, fallbackUsed: true }),
  ]));
});

it.each([
  ['off', 'openai', false], ['shadow', 'openai', false],
  ['on', 'openai', true], ['on', 'anthropic', true],
] as const)('uses per-request cheap extraction configuration only for %s/%s', async (mode, provider, cheap) => {
  vi.stubEnv('AGENT_MODE', 'live');
  vi.stubEnv('JEV_PROCESS_DUMP_MODE', mode);
  const dump = capture();
  vi.spyOn(adapters, 'embedText').mockResolvedValue([]);
  const run = vi.spyOn(runners, 'runAgent').mockResolvedValue({
    runId: 'selection-only', text: '', inputTokens: 0, outputTokens: 0, costUsd: 0, trace: [],
  });
  await processDump(db, tools, dump.id, { provider });
  expect(run.mock.calls[0][1].modelConfig).toEqual(cheap ? choiceFor('link_evidence', provider) : undefined);
  expect(run.mock.calls[0][1].model).toBeUndefined();
});

it('preserves default-off and explicit test models without a cheap model override', async () => {
  vi.stubEnv('JEV_PROCESS_DUMP_MODE', undefined);
  const dump = capture(), model = scriptedModel([{ text: 'No writes' }]);
  const run = vi.spyOn(runners, 'runAgent');
  await processDump(db, tools, dump.id, { model });
  expect(run.mock.calls[0][1].model).toBe(model);
  expect(run.mock.calls[0][1].modelConfig).toBeUndefined();
  expect(policies()).toEqual([]);
});

it('keeps an explicit ON extraction model ahead of cheap per-request defaults', async () => {
  vi.stubEnv('AGENT_MODE', 'live');
  const dump = capture(), model = scriptedModel([{ text: 'No writes' }]);
  vi.spyOn(adapters, 'embedText').mockResolvedValue([]);
  const run = vi.spyOn(runners, 'runAgent').mockResolvedValue({
    runId: 'selection-only', text: '', inputTokens: 0, outputTokens: 0, costUsd: 0, trace: [],
  });
  await processDump(db, tools, dump.id, { model });
  expect(run.mock.calls[0][1].model).toBe(model);
  expect(run.mock.calls[0][1].modelConfig).toBeUndefined();
});

it('uses cheap per-request pricing for bounded live resolution without replaying the processing tools', async () => {
  vi.stubEnv('AGENT_MODE', 'live');
  const dump = capture();
  const run = vi.spyOn(runners, 'runAgent').mockRejectedValue(new Error('Offline model selection probe'));
  await withJevScript(judgments({ combinesDistinctFindings: 0.5 }), async () => {
    const judge = processingDecisions(db, dump, [], [], { provider: 'anthropic' });
    expect((await judge.signal({ gist })).rejection).toBeDefined();
  });
  const spec = run.mock.calls[0][1];
  expect(spec.modelConfig).toEqual(choiceFor('link_evidence', 'anthropic'));
  expect(spec.maxSteps).toBe(1);
  expect(Object.keys(spec.tools('not-a-domain-actor'))).toEqual(['resolve']);
});
