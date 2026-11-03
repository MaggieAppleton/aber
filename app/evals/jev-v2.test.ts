import { createHash } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jevFixtures } from './fixtures/jev-v1.js';
import { jevV2Fixtures } from './fixtures/jev-v2.js';
import { jevCases } from './jev-cases.js';
import { comparisonCases, compareArms, runJevComparison, workflowSummaries, type ComparisonResult } from './jev-compare.js';
import { selectedArms, selectedOrderCases, withJevModes } from './jev-options.js';
import { actualActions, scoreActual } from './jev-metrics.js';
import { withEvaluationObservation, type EvalSnapshot } from './jev-observation.js';

afterEach(() => vi.restoreAllMocks());
const empty = (): EvalSnapshot => ({
  runs: [],
  tables: Object.fromEntries(['signals', 'signal_themes', 'suggestions', 'evidence', 'merges', 'replies', 'themes', 'theories', 'prototypes', 'events'].map(table => [table, []])),
});

describe('independent v2 development and fresh held-out fixtures', () => {
  it('preserves every v1 fixture, label, and original partition exactly', () => {
    expect(createHash('sha256').update(JSON.stringify(jevFixtures)).digest('hex')).toBe('cf58d2bdc32907618ef0fb0e6dfed8e68b9a35874aeec56751e2b84769524e8a');
    expect(jevCases().every(item => item.fixture?.evaluationRole === 'previously-evaluated-regression')).toBe(true);
  });
  it('has 60 distinct authored cases, six per workflow per split, with no v1 reuse', () => {
    expect(jevV2Fixtures).toHaveLength(60);
    expect(new Set(jevV2Fixtures.map(item => item.id)).size).toBe(60);
    expect(new Set(jevV2Fixtures.map(item => item.text)).size).toBe(60);
    for (const split of ['dev', 'held-out']) for (const workflow of ['evidence', 'tripwire', 'duplicate', 'filing', 'chat']) {
      expect(jevV2Fixtures.filter(item => item.split === split && item.workflow === workflow)).toHaveLength(6);
    }
    expect(jevV2Fixtures.some(item => jevFixtures.some(old => old.text === item.text || old.id === item.id))).toBe(false);
    for (const item of jevV2Fixtures.filter(item => item.workflow === 'filing')) {
      expect(item.expected.signalCount).toBeDefined();
      expect(item.expected.drafts).toBeDefined();
    }
  });
  it('selects dev and held-out independently and records honest provenance', () => {
    const dev = comparisonCases(['--jev-suite', 'v2', '--split', 'dev']);
    const held = comparisonCases(['--jev-suite', 'v2', '--split', 'held-out']);
    expect(dev).toHaveLength(30); expect(held).toHaveLength(30);
    expect(dev.every(item => item.fixture?.evaluationRole === 'development')).toBe(true);
    expect(held.every(item => item.fixture?.evaluationRole === 'fresh-held-out')).toBe(true);
    expect(dev.some(item => held.some(other => other.id === item.id))).toBe(false);
    expect(comparisonCases(['--jev-suite', 'new']).map(item => item.id)).toEqual(jevFixtures.map(item => item.id));
    expect(held.some(item => (item.fixture?.chat as any)?.history?.length > 0)).toBe(true);
    expect(held.some(item => (item.fixture?.chat as any)?.context?.length === 0)).toBe(true);
  });
  it('runs all 60 through actual offline workflows without scoring fake output as quality evidence', async () => {
    for (const fixture of jevCases('v2')) {
      const observed = await withJevModes('off', () => withEvaluationObservation(() => fixture.run('fake')));
      expect(observed.value.error, fixture.id).toBeUndefined();
      expect(observed.value.checks.completed, fixture.id).toBe(true);
      expect(observed.value.costUsd, fixture.id).toBe(0);
      expect(observed.snapshot.runs.length, fixture.id).toBeGreaterThan(0);
      expect(actualActions(observed.snapshot)).toHaveProperty('writes');
    }
  });
});

describe('explicit arms and bounded order probes', () => {
  it('keeps default off/shadow/on but supports off/on, singleton arms and caller order', () => {
    expect(selectedArms([])).toEqual(['off', 'shadow', 'on']);
    expect(selectedArms(['--arms', 'off,on'])).toEqual(['off', 'on']);
    expect(selectedArms(['--arms', 'on'])).toEqual(['on']);
    expect(selectedArms(['--arms', 'on,off'])).toEqual(['on', 'off']);
    for (const value of ['', 'off,off', 'on-reversed', 'off,', 'wat']) expect(() => selectedArms(['--arms', value])).toThrow();
    expect(() => selectedArms(['--arms'])).toThrow();
    expect(() => selectedArms(['--arms', 'off', '--arms', 'on'])).toThrow();
  });
  it('restricts order repeats to selected on cases and respects no-order', () => {
    expect([...selectedOrderCases([], ['a', 'b'], ['off', 'on'])]).toEqual(['a', 'b']);
    expect([...selectedOrderCases(['--no-order-check'], ['a'], ['on'])]).toEqual([]);
    expect([...selectedOrderCases([], ['a'], ['off'])]).toEqual([]);
    expect([...selectedOrderCases(['--order-cases', 'b'], ['a', 'b'], ['on'])]).toEqual(['b']);
    for (const args of [['--order-cases', 'missing'], ['--order-cases'], ['--order-cases', 'a,a'], ['--no-order-check', '--order-cases', 'a']]) {
      expect(() => selectedOrderCases(args, ['a'], ['on'])).toThrow();
    }
    expect(() => selectedOrderCases(['--order-cases', 'a'], ['a'], ['off'])).toThrow();
  });
  it('persists exactly the requested arms and whole-capture workflow reports (no paid calls)', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const previousExit = process.exitCode;
    let directory: string | undefined;
    try {
      await runJevComparison(['--fake', '--jev-suite', 'v2', '--split', 'dev', '--case', 'v2-dev-chat-signals,v2-dev-filing-combined', '--arms', 'off,on', '--no-order-check']);
      directory = log.mock.calls.map(call => String(call[0])).find(text => text.startsWith('Incremental raw report, Markdown and isolated databases: '))?.split(': ').slice(1).join(': ');
      expect(directory).toBeDefined();
      const report = JSON.parse(await readFile(`${directory}/report.json`, 'utf8'));
      expect(report).toMatchObject({ complete: true, fake: true, qualityEvidence: false, requested: 4, completed: 4, selectedArms: ['off', 'on'], plannedOrderChecks: 0 });
      expect(report.groups.map((group: any) => group.arm)).toEqual(['off', 'on']);
      expect(report.results).toHaveLength(4);
      for (const group of report.groups) {
        expect(group.byWorkflow.chat).toMatchObject({ captures: 1, labelledCases: 1, costUsd: 0, latencyMs: { count: 1 }, outcomes: [expect.objectContaining({ id: 'v2-dev-chat-signals', actual: expect.any(Object), score: expect.any(Object) })] });
        expect(group.byWorkflow.process_dump.captures).toBe(1);
        expect(group.byWorkflow.process_dump.rawCaptureCostsUsd).toEqual([0]);
      }
      expect(report.comparisons.every((item: any) => item.shadowActualActions === null && item.shadowDomainParity === null)).toBe(true);
      expect(await readFile(`${directory}/report.md`, 'utf8')).toContain('Whole-capture economics');
      expect(process.exitCode).toBe(0);
    } finally {
      process.exitCode = previousExit;
      if (directory) await rm(directory, { recursive: true, force: true });
    }
  });
  it('persists order repeats for only the chosen subset, without synthesizing absent arms', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const previousExit = process.exitCode;
    let directory: string | undefined;
    try {
      await runJevComparison(['--fake', '--jev-suite', 'v2', '--split', 'dev', '--case', 'v2-dev-chat-signals,v2-dev-chat-theme', '--arms', 'on', '--order-cases', 'v2-dev-chat-theme']);
      directory = log.mock.calls.map(call => String(call[0])).find(text => text.startsWith('Incremental raw report, Markdown and isolated databases: '))?.split(': ').slice(1).join(': ');
      const report = JSON.parse(await readFile(`${directory}/report.json`, 'utf8'));
      expect(report).toMatchObject({ complete: true, requested: 2, completed: 2, plannedOrderChecks: 1, completedOrderChecks: 1, selectedArms: ['on'], selectedOrderCases: ['v2-dev-chat-theme'] });
      expect(report.results.filter((row: any) => row.arm === 'on-reversed').map((row: any) => row.id)).toEqual(['v2-dev-chat-theme']);
      expect(report.comparisons.every((row: any) => row.baselineActualActions === null && row.shadowActualActions === null)).toBe(true);
      expect(report.comparisons.find((row: any) => row.id === 'v2-dev-chat-signals').orderRobustness).toBeNull();
      expect(report.comparisons.find((row: any) => row.id === 'v2-dev-chat-theme').orderRobustness.choiceRequests).toBeGreaterThan(0);
    } finally {
      process.exitCode = previousExit;
      if (directory) await rm(directory, { recursive: true, force: true });
    }
  });
});

describe('final signal counts and draft gates', () => {
  const fixture = jevV2Fixtures.find(item => item.id === 'v2-dev-filing-combined')!;
  const actions = { proposals: [], relationships: ['filing:identity', 'filing:memory'], merges: [], displays: [], captures: ['signal:a'], writes: [], filingGroups: [{ signal: 'a', themes: ['identity', 'memory'] }] };
  it('rejects both over-splitting and missing findings, without hiding false-positive links', () => {
    expect(scoreActual(fixture, actions)).toMatchObject({ pass: true, signalCount: { expected: [1, 1], actual: 1, pass: true } });
    expect(scoreActual(fixture, { ...actions, captures: [] })).toMatchObject({ pass: false, signalCount: { pass: false } });
    expect(scoreActual(fixture, { ...actions, captures: ['signal:a', 'signal:b'] })).toMatchObject({ pass: false, signalCount: { actual: 2, pass: false } });
    expect(scoreActual(fixture, { ...actions, relationships: [...actions.relationships, 'filing:review'] })).toMatchObject({ pass: false, finalRelationships: { falsePositive: 1 } });
    const range = { ...fixture, expected: { ...fixture.expected, signalCount: [1, 2] as [number, number] } };
    expect(scoreActual(range, { ...actions, captures: ['a', 'b'] })?.pass).toBe(true);
  });
  it('reads created signals and draft status/ownership from final DB rows, not policy claims', () => {
    const snapshot = empty();
    snapshot.runs = [{ id: 'run', job: 'process_dump', trace_json: '[{"type":"jev_policy","action":"draft"}]' }];
    snapshot.tables.events = [{ run_id: 'fixture-setup', tool: 'createSignal', object_id: 'setup' }, { run_id: 'run', tool: 'createSignal', object_id: 'new' }];
    snapshot.tables.signals = [{ id: 'setup', gist: 'input' }, { id: 'new', gist: 'finding' }];
    expect(actualActions(snapshot).captures).toEqual(['signal:finding']);
    expect(actualActions(snapshot).activeSignalCount).toBe(1);
    snapshot.tables.signals[1].merged_into_id = 'setup';
    expect(actualActions(snapshot).activeSignalCount).toBe(0);
    delete snapshot.tables.signals[1].merged_into_id;
    const draftFixture = jevV2Fixtures.find(item => item.id === 'v2-dev-filing-draft')!;
    expect(scoreActual(draftFixture, actualActions(snapshot))).toMatchObject({ pass: false, drafts: { falseNegative: 1 } });
    snapshot.tables.events = [{ run_id: 'run', tool: 'createDraftTheory', object_id: 'new-theory' }];
    snapshot.tables.theories = [{ id: 'new-theory', status: 'draft', created_by: 'agent:process_dump:run', run_id: 'run' }];
    expect(scoreActual(draftFixture, actualActions(snapshot))).toMatchObject({ pass: true });
    snapshot.tables.theories[0].status = 'held';
    expect(scoreActual(draftFixture, actualActions(snapshot))).toMatchObject({ pass: false, unsafeDrafts: ['new-theory'] });
    const noDraft = jevV2Fixtures.find(item => item.id === 'v2-dev-filing-speculation')!;
    expect(scoreActual(noDraft, actualActions(snapshot))).toMatchObject({ pass: false, drafts: { falsePositive: 1 } });
  });
  it('scores all final chat mutation actions, including extras', () => {
    const fixture = jevV2Fixtures.find(item => item.id === 'v2-dev-chat-mutation')!;
    const actual = { ...actions, relationships: [], captures: [], drafts: ['theory'], mutationTools: ['createDraftTheory'] };
    expect(scoreActual(fixture, actual)?.pass).toBe(true);
    expect(scoreActual(fixture, { ...actual, mutationTools: ['createDraftTheory', 'setConfidence'] })).toMatchObject({ pass: false, mutationTools: { falsePositive: 1 } });
  });
  it('does not require an off baseline for on-only reports or order comparisons', () => {
    const row = {
      id: fixture.id, provider: 'fake', arm: 'on', durationMs: 200, database: 'not-written',
      result: { id: fixture.id, job: 'process_dump', provider: 'fake', checks: {}, diagnostics: { expected: fixture.expected } },
      snapshot: { ...empty(), runs: [{ job: 'link_evidence', cost_usd: 0.1 }, { job: 'process_dump', cost_usd: 0.2 }] },
      requests: [], actual: actions, score: scoreActual(fixture, actions),
    } as unknown as ComparisonResult;
    expect(compareArms([row, { ...row, arm: 'on-reversed' }])[0]).toMatchObject({ baselineActualActions: null, onActualActions: [], orderRobustness: { finalActionsEqual: true } });
    const summary = workflowSummaries([row]).process_dump;
    expect(summary.qualityPassedCaptures).toBe(1);
    expect(summary.costUsd).toBeCloseTo(0.3);
    expect(summary.costPerQualityPassedCaptureUsd).toBeCloseTo(0.3);
    expect(summary.jobs).toHaveLength(2);
    expect(summary.latencyMs.p95).toBe(200);
    const failed = { ...row, score: scoreActual(fixture, { ...actions, relationships: [...actions.relationships, 'filing:review'] }) };
    const withFailure = workflowSummaries([row, failed]).process_dump;
    expect(withFailure.finalRelationships).toMatchObject({ falsePositive: 1 });
    expect(withFailure.qualityPassedCaptures).toBe(1);
    expect(withFailure.costPerQualityPassedCaptureUsd).toBeCloseTo(0.6);
    const runtimeFailure = workflowSummaries([{ ...row, result: { ...row.result, error: 'failed' } }]).process_dump;
    expect(runtimeFailure.qualityPassedCaptures).toBe(0);
    expect(runtimeFailure.costPerQualityPassedCaptureUsd).toBeNull();
  });
});
