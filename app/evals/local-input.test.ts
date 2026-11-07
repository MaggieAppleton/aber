import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { parseLocalInput, loadLocalInputs, processingFixture } from './local-input.js';
import { localOptions, runLocalInputs } from './local-run.js';
import { localDiagnostics } from './local-score.js';
import { evaluateProcessing } from './processing.js';
import { withEvaluationObservation } from './jev-observation.js';
import { withJevModes } from './jev-options.js';
import { models } from '../server/src/agents/models.js';
import * as database from '../server/src/db/index.js';
import * as adapters from '../server/src/agents/adapters.js';
import { outputId, scriptedModel, toolOutputs } from '../server/src/agents/scripted-model.js';
import type { ProcessingSnapshot } from './processing-score.js';

const example = JSON.parse(await readFile(new URL('./examples/synthetic-review.json', import.meta.url), 'utf8'));
const fresh = () => structuredClone(example);
const directories: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
const directory = async () => { const path = await mkdtemp(resolve(tmpdir(), 'aber-local-eval-')); directories.push(path); return path; };

describe('offline local input validation', () => {
  it.each([
    ['schema', (v: any) => { v.schemaVersion = 2; }],
    ['ID', (v: any) => { v.id = '../private'; }],
    ['regex', (v: any) => { v.expected.observations[0].clauses = ['[']; }],
    ['theme', (v: any) => { v.expected.observations[0].themes = ['unseeded']; }],
    ['count', (v: any) => { v.expected.count = [2, 1]; }],
    ['keys', (v: any) => { v.expected.observations.push(v.expected.observations[0]); v.expected.count = [2, 2]; }],
  ])('rejects invalid %s', (_, mutate) => {
    const value = fresh(); mutate(value); expect(() => parseLocalInput(value)).toThrow();
  });
  it('lists allowed seed names without rejected capture prose', () => {
    const value = fresh(); value.expected.observations[0].themes = ['PRIVATE CAPTURE'];
    expect(() => parseLocalInput(value)).toThrow('Agent memory');
    expect(() => parseLocalInput(value)).not.toThrow('PRIVATE CAPTURE');
  });
  it('rejects duplicate IDs and malformed JSON in a directory', async () => {
    const path = await directory();
    await writeFile(resolve(path, 'a.json'), JSON.stringify(example));
    await writeFile(resolve(path, 'b.json'), JSON.stringify(example));
    await expect(loadLocalInputs(path)).rejects.toThrow('Duplicate input ID');
    await writeFile(resolve(path, 'b.json'), 'PRIVATE MALFORMED');
    await expect(loadLocalInputs(path)).rejects.toThrow('Invalid JSON');
  });
  it('validates without model calls or fetch and prints no capture text', async () => {
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('network forbidden'); }));
    const embed = vi.spyOn(adapters, 'embedText');
    const create = vi.spyOn(database, 'createDatabase');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await runLocalInputs(['--input', new URL('./examples/synthetic-review.json', import.meta.url).pathname, '--validate'])).toBe(0);
    expect(embed).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join(' ')).not.toContain(example.text);
  });
  it('rejects invalid live batches before creating any database or invoking inference', async () => {
    const path = await directory();
    const create = vi.spyOn(database, 'createDatabase');
    const embed = vi.spyOn(adapters, 'embedText');
    const flags = ['--input', path, '--live', '--budget', '1', '--acknowledge-paid-budget'];
    await writeFile(resolve(path, 'a.json'), JSON.stringify(example));
    const invalid = fresh(); invalid.id = 'second'; invalid.expected.observations[0].themes = ['unknown'];
    await writeFile(resolve(path, 'b.json'), JSON.stringify(invalid));
    await expect(runLocalInputs(flags)).rejects.toThrow('Unknown seed theme');
    invalid.expected.observations[0].themes = ['review']; invalid.expected.observations[0].clauses = ['['];
    await writeFile(resolve(path, 'b.json'), JSON.stringify(invalid));
    await expect(runLocalInputs(flags)).rejects.toThrow('Invalid regex');
    await writeFile(resolve(path, 'b.json'), JSON.stringify(example));
    await expect(runLocalInputs(flags)).rejects.toThrow('Duplicate input ID');
    await writeFile(resolve(path, 'b.json'), '{');
    await expect(runLocalInputs(flags)).rejects.toThrow('Invalid JSON');
    expect(create).not.toHaveBeenCalled(); expect(embed).not.toHaveBeenCalled();
  });
  it('requires live opt-in, acknowledgement and a finite positive budget', () => {
    const base = ['--input', 'file.json'];
    for (const flags of [[], ['--live'], ['--live', '--budget', '1'], ['--live', '--acknowledge-paid-budget'], ['--live', '--budget', 'Infinity', '--acknowledge-paid-budget'], ['--live', '--budget', '0', '--acknowledge-paid-budget']]) {
      expect(() => localOptions([...base, ...flags])).toThrow();
    }
    expect(localOptions([...base, '--live', '--budget', '1', '--acknowledge-paid-budget'])).toMatchObject({ mode: 'on', budget: 1 });
    expect(() => localOptions([...base, '--validate', '--fake'])).toThrow();
  });
});

// Independent fixed output: never derive gists, filings or citations from expectations.
const fixedModel = () => scriptedModel([
  options => {
    const user = options.prompt.find(message => message.role === 'user')!;
    const part = user.content.find(part => part.type === 'text')!;
    const dump = JSON.parse((part as { text: string }).text).dump;
    return { calls: [{ toolName: 'createSignal', input: { dumpId: dump.id, gist: 'Juniper four maintainers saw review rise from 20 to 50 minutes per change during a two-week trial', sources: [{ ownObservation: true }] } }] };
  },
  options => ({ calls: [{ toolName: 'fileSignal', input: { signalId: outputId(toolOutputs(options, 'createSignal').at(-1)), themeId: 'review' } }] }),
  { text: 'Synthetic output saved.' },
]);

describe('local expected/actual adapter', () => {
  it('retains isolated writes, named themes and sources; an intentional mismatch fails', async () => {
    const input = parseLocalInput(example);
    const execute = () => withJevModes('off', () => withEvaluationObservation(() => evaluateProcessing(processingFixture(input), 'fake', { configuredPipeline: true, model: fixedModel() })));
    const first = await execute(); const second = await execute();
    expect(first.value.pass, JSON.stringify(first.value.checks)).toBe(true);
    const state = first.value.diagnostics.actual as ProcessingSnapshot;
    const next = second.value.diagnostics.actual as ProcessingSnapshot;
    expect(state.signals).toHaveLength(1); expect(next.signals).toHaveLength(1);
    expect(state.dumpId).not.toBe(next.dumpId);
    expect(first.snapshot.tables.dumps.some(row => row.id === next.dumpId)).toBe(false);
    const diagnostic = localDiagnostics(input, state, first.value.checks);
    expect(diagnostic.status).toBe('pass');
    expect(diagnostic.observations[0].expected.finding).toBe(example.expected.observations[0].finding);
    expect(diagnostic.actual[0].themes).toEqual([{ id: 'review', name: 'Code review after agents' }]);
    expect(diagnostic.actual[0].sources[0].ownObservation).toBe(true);
    const wrong = structuredClone(input); wrong.expected.observations[0].clauses = ['NEVER IN FIXED OUTPUT'];
    const failure = await withJevModes('off', () => evaluateProcessing(processingFixture(wrong), 'fake', { configuredPipeline: true, model: fixedModel() }));
    expect(failure.pass).toBe(false);
    const failed = localDiagnostics(wrong, failure.diagnostics.actual as ProcessingSnapshot, failure.checks);
    expect(failed.status).toBe('fail'); expect(failed.missing).toEqual(['review-time']);
    expect(failed.unmatched).toHaveLength(1); expect(failed.failedChecks).toContain('observations');
  });
  it('requires manual review without clauses', async () => {
    const value = fresh(); delete value.expected.observations[0].clauses;
    const input = parseLocalInput(value);
    const result = await withJevModes('off', () => evaluateProcessing(processingFixture(input), 'fake', { configuredPipeline: true, model: fixedModel() }));
    const diagnostic = localDiagnostics(input, result.diagnostics.actual as ProcessingSnapshot, result.checks);
    expect(diagnostic.status).toBe('manual-review'); expect(diagnostic.manualReviewNeeded).toBe(true);
    expect(diagnostic.observations[0].actual).toBeNull(); expect(diagnostic.unmatched).toHaveLength(1);
  });
  it.each(['on', 'off'] as const)('lets the actual pipeline choose its configured %s model', async mode => {
    vi.stubEnv('AGENT_MODE', 'live');
    vi.spyOn(adapters, 'embedText').mockResolvedValue([]);
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('network forbidden'); }));
    const baseline = models.process_dump.primary.model; const cheaper = models.link_evidence.primary.model;
    const baselineMock = scriptedModel([{ text: 'Baseline finished.' }]);
    const cheaperMock = scriptedModel([{ text: 'Applied finished.' }]);
    models.process_dump.primary.model = baselineMock; models.link_evidence.primary.model = cheaperMock;
    try {
      const value = fresh(); value.expected = { count: [0, 0], observations: [] };
      const result = await withJevModes(mode, () => evaluateProcessing(processingFixture(parseLocalInput(value)), 'openai', { configuredPipeline: true }));
      expect(result.pass, JSON.stringify(result)).toBe(true);
      expect(baselineMock.doGenerateCalls).toHaveLength(mode === 'off' ? 1 : 0);
      expect(cheaperMock.doGenerateCalls).toHaveLength(mode === 'on' ? 1 : 0);
      expect(result.diagnostics.runtimeModels).toEqual(expect.arrayContaining([expect.objectContaining({ job: 'process_dump', model: 'synthetic-script-v1' })]));
      expect(fetch).not.toHaveBeenCalled();
      expect(models.process_dump.primary.model).toBe(baselineMock); expect(models.link_evidence.primary.model).toBe(cheaperMock);
    } finally { models.process_dump.primary.model = baseline; models.link_evidence.primary.model = cheaper; }
  });
});
