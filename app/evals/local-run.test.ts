import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { runLocalInputs } from './local-run.js';
import * as processing from './processing.js';
import { scriptedModel } from '../server/src/agents/scripted-model.js';
import { reserveSpend, spendBudgetSnapshot } from '../server/src/agents/spend-budget.js';

const cleanup: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await Promise.all(cleanup.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

it('retains private reports and one ledger across an offline mocked CLI batch', async () => {
  vi.stubEnv('JEV_NEAR_DUP_MODE', 'on');
  vi.stubEnv('JEV_CHAT_MODE', 'shadow');
  vi.stubEnv('JEV_PROCESS_DUMP_MODE', 'shadow');
  const inputDirectory = await mkdtemp(resolve(tmpdir(), 'aber-local-report-')); cleanup.push(inputDirectory);
  const base = { schemaVersion: 1, text: 'Synthetic capture with no finding.', urls: [], expected: { count: [0, 0], observations: [] } };
  await writeFile(resolve(inputDirectory, 'a.json'), JSON.stringify({ ...base, id: 'synthetic-a' }));
  await writeFile(resolve(inputDirectory, 'b.json'), JSON.stringify({ ...base, id: 'synthetic-b' }));
  const original = processing.evaluateProcessing;
  const ledgers: unknown[] = [];
  // No inference reaches a provider: real tools/isolated DB, fixed offline model only.
  const evaluate = vi.spyOn(processing, 'evaluateProcessing').mockImplementation(async fixture => {
    expect(process.env.JEV_PROCESS_DUMP_MODE).toBe('off');
    expect(process.env.JEV_NEAR_DUP_MODE).toBe('on');
    expect(process.env.JEV_CHAT_MODE).toBe('shadow');
    ledgers.push(spendBudgetSnapshot());
    reserveSpend(0.1).settle(0.01);
    const previous = process.env.AGENT_MODE; process.env.AGENT_MODE = 'fake';
    try { return await original(fixture, 'fake', { configuredPipeline: true, model: scriptedModel([{ text: 'No findings.' }]) }); }
    finally { if (previous === undefined) delete process.env.AGENT_MODE; else process.env.AGENT_MODE = previous; }
  });
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('network forbidden'); }));
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  try {
    expect(await runLocalInputs(['--input', inputDirectory, '--processing-mode', 'off', '--live', '--budget', '1', '--acknowledge-paid-budget'])).toBe(0);
    const reportPath = String(log.mock.calls[0][0]).replace('RUNNING ', ''); cleanup.push(dirname(reportPath));
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    expect(report).not.toHaveProperty('synthetic');
    expect(report.provenance.kind).toBe('local-input');
    expect(report.complete).toBe(true); expect(report.cases).toHaveLength(2);
    expect(report.spendLedger).toMatchObject({ limitUsd: 1, spentUsd: 0.02, reservedUsd: 0 });
    expect(ledgers).toMatchObject([{ spentUsd: 0 }, { spentUsd: 0.01 }]);
    for (const item of report.cases) {
      expect(item.status).toBe('pass'); expect(item.runtimeModels).not.toHaveLength(0);
      expect(item.snapshot.runs[0]).toHaveProperty('trace_json');
      expect(JSON.parse(await readFile(item.provenance.inputPath, 'utf8')).text).toBe(base.text);
    }
    expect(evaluate).toHaveBeenCalledTimes(2); expect(fetch).not.toHaveBeenCalled();
    expect(process.env.JEV_PROCESS_DUMP_MODE).toBe('shadow');
    expect(log.mock.calls.flat().join(' ')).not.toContain(base.text);
  } finally { vi.unstubAllGlobals(); }
});
