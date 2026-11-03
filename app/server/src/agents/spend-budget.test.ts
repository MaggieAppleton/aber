import { expect, it, vi } from 'vitest';
import { noul } from '@typesafe-ai/sdk';
import { withSpendBudget, reserveSpend, spendBudgetSnapshot } from './spend-budget.js';
import { createDatabase, migrate } from '../db/index.js';
import { askJev } from './jev.js';
import { runAgent } from './run.js';
import { scriptedModel } from './scripted-model.js';
import { choiceFor } from './models.js';

it('reserves simultaneous requests against one finite cross-database limit', async () => {
  await withSpendBudget(0.1, async () => {
    const first = reserveSpend(0.06);
    expect(() => reserveSpend(0.05)).toThrow('budget cannot cover');
    first.settle(0.02);
    const second = reserveSpend(0.07);
    expect(spendBudgetSnapshot()).toEqual({ limitUsd: 0.1, spentUsd: 0.02, reservedUsd: 0.07, unknownCostUsd: 0 });
    second.settle(0.03);
    expect(spendBudgetSnapshot()?.spentUsd).toBe(0.05);
  });
  expect(spendBudgetSnapshot()).toBeUndefined();
});
it('consumes uncertain transport costs conservatively and forbids nested or invalid limits', () => {
  expect(() => withSpendBudget(Infinity, () => {})).toThrow('finite');
  withSpendBudget(1, () => {
    expect(() => withSpendBudget(2, () => {})).toThrow('nested');
    const pending = reserveSpend(0.4); pending.unknown(); pending.unknown();
    expect(spendBudgetSnapshot()).toEqual({ limitUsd: 1, spentUsd: 0.4, reservedUsd: 0, unknownCostUsd: 0.4 });
    expect(() => reserveSpend(Infinity)).toThrow('cost bound');
  });
});

it('blocks live Jev SDK dispatch before it could exceed the reviewed limit', async () => {
  const db = createDatabase(); migrate(db);
  vi.stubEnv('AGENT_MODE', 'live'); vi.stubEnv('TYPESAFE_API_KEY', 'unit-test-not-a-key'); vi.stubEnv('DAILY_SPEND_CAP_USD', '5');
  const network = vi.fn(async () => { throw new Error('Must not dispatch'); }); vi.stubGlobal('fetch', network);
  try {
    await expect(withSpendBudget(0.000001, () => askJev(db, 'tripwire', {
      state: 'A report.', questions: { observed: noul('Is an outcome observed?') }, questionVersion: 'budget-q1', policyVersion: 'budget-p1',
    }))).rejects.toThrow('budget cannot cover');
    expect(network).not.toHaveBeenCalled();
    expect(db.prepare('SELECT status FROM agent_runs').get()).toEqual({ status: 'failed' });
  } finally { db.close(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); }
});

it('shares Jev reservations across independent evaluation databases', async () => {
  const firstDb = createDatabase(), secondDb = createDatabase(); migrate(firstDb); migrate(secondDb);
  vi.stubEnv('AGENT_MODE', 'live'); vi.stubEnv('TYPESAFE_API_KEY', 'unit-test-not-a-key'); vi.stubEnv('DAILY_SPEND_CAP_USD', '5');
  let release!: (response: Response) => void;
  const pending = new Promise<Response>(resolve => { release = resolve; });
  const network = vi.fn(() => pending); vi.stubGlobal('fetch', network);
  const request = { state: 'A report.', questions: { observed: noul('Is an outcome observed?') }, questionVersion: 'budget-q1', policyVersion: 'budget-p1' };
  try {
    await withSpendBudget(0.0003, async () => {
      const first = askJev(firstDb, 'tripwire', request);
      await expect(askJev(secondDb, 'tripwire', request)).rejects.toThrow('budget cannot cover');
      release(Response.json({ model: 'jev-1.14.0', answers: { observed: { type: 'noul', noul: 0.9 } }, usage: { input_tokens: 100, output_tokens: 1 } }));
      await first;
      expect(network).toHaveBeenCalledTimes(1);
      expect(spendBudgetSnapshot()?.reservedUsd).toBe(0);
    });
  } finally { firstDb.close(); secondDb.close(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); }
});

it('settles live-model request usage under the shared limit and stops the next expensive step', async () => {
  const db = createDatabase(); migrate(db);
  vi.stubEnv('AGENT_MODE', 'live'); vi.stubEnv('DAILY_SPEND_CAP_USD', '5');
  try {
    await withSpendBudget(0.03, async () => {
      await runAgent(db, {
        job: 'chat', promptVersion: 'budget-v1', system: 'Fixture', maxSteps: 1, maxInputTokens: 99_000,
        model: scriptedModel([{ text: 'Offline provider mock billed at configured prices.' }]), tools: () => ({}),
      }, { prompt: 'A short prompt' });
      expect(spendBudgetSnapshot()?.spentUsd).toBeGreaterThan(0);
      expect(spendBudgetSnapshot()?.reservedUsd).toBe(0);
      await expect(runAgent(db, {
        job: 'process_dump', provider: 'anthropic', promptVersion: 'budget-v1', system: 'Fixture', maxSteps: 1, maxInputTokens: 99_000,
        model: scriptedModel([{ text: 'Never dispatched' }]), tools: () => ({}),
      }, { prompt: 'x'.repeat(20_000) })).rejects.toThrow('budget cannot cover');
    });

  } finally { db.close(); vi.unstubAllEnvs(); }
});

it('reserves and records the selected cheap model prices rather than the job default', async () => {
  const db = createDatabase(); migrate(db);
  vi.stubEnv('AGENT_MODE', 'live'); vi.stubEnv('DAILY_SPEND_CAP_USD', '5');
  try {
    await withSpendBudget(0.005, async () => {
      const selected = choiceFor('link_evidence');
      const result = await runAgent(db, {
        job: 'process_dump', modelConfig: selected, model: scriptedModel([{ text: 'Verified cheap extraction.' }]),
        promptVersion: 'cascade-pricing-test', system: 'Fixture', maxSteps: 1, maxInputTokens: 99_000, tools: () => ({}),
      }, { prompt: 'A short prompt' });
      const expected = (result.inputTokens * selected.inputPerMillion + result.outputTokens * selected.outputPerMillion) / 1_000_000;
      expect(result.costUsd).toBe(expected);
      expect(spendBudgetSnapshot()).toMatchObject({ spentUsd: expected, reservedUsd: 0 });
      expect(db.prepare('SELECT provider,cost_usd FROM agent_runs WHERE id=?').get(result.runId)).toEqual({ provider: 'openai', cost_usd: expected });
      expect(result.trace[0]).toMatchObject({ type: 'model_config', inputPerMillion: 0.1, outputPerMillion: 0.5 });
      await expect(runAgent(db, {
        job: 'process_dump', modelConfig: selected, provider: 'anthropic', promptVersion: 'invalid-pricing-test',
        system: 'Fixture', maxSteps: 1, maxInputTokens: 99_000, tools: () => ({}),
      }, { prompt: 'Must not dispatch' })).rejects.toThrow('provider pricing');
    });
  } finally { db.close(); vi.unstubAllEnvs(); }
});
