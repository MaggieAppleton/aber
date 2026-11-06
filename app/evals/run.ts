import '../server/src/config.js';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { appDir } from '../server/src/config.js';
import { cases, type EvalResult } from './cases.js';
import { provenance } from './fixtures/synthetic.js';
import type { ProviderName } from '../server/src/agents/types.js';
import { evaluationComplete, evaluationExitCode } from './report-state.js';
import { selectCases } from './selection.js';
import { reviewedBudget, withJevModes } from './jev-options.js';
import { runJevComparison } from './jev-compare.js';
import { withSpendBudget, spendBudgetSnapshot } from '../server/src/agents/spend-budget.js';

const args = process.argv.slice(2);
if (args.includes('--input')) {
  try {
    const { runLocalInputs } = await import('./local-run.js');
    process.exitCode = await runLocalInputs(args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Local evaluation failed');
    process.exitCode = 2;
  }
} else if (args.includes('--jev-compare')) {
  await runJevComparison(args);
} else {
const fake = args.includes('--fake');
const compare = args.includes('--compare');
const argument = (name: string, fallback: number) => { const index = args.indexOf(name); const value = index >= 0 ? Number(args[index + 1]) : fallback; if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} needs a positive number`); return value; };
const budget = reviewedBudget(args, fake);
await withJevModes('off', () => withSpendBudget(budget, async () => {
const allFixtures = cases();
const limit = Math.min(allFixtures.length, argument('--limit', allFixtures.length));
const fixtures = selectCases(allFixtures, args).slice(0, limit);
process.env.AGENT_MODE = fake ? 'fake' : 'live';
const providers: ProviderName[] = fake ? ['fake'] : compare ? ['openai', 'anthropic'] : ['openai'];
const selected = providers.filter(provider => {
  const present = provider === 'fake' || !!process.env[provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'];
  if (!present) console.log(`${provider}: skipped (key absent)`);
  return present;
});
console.log(provenance);
if (fake) console.log('Fake passes validate scripted plumbing and scoring, not model accuracy.');
console.log(`Budget: $${budget.toFixed(2)}. ${compare ? 'OpenAI versus Claude; ' : ''}${fake ? 'deterministic SDK mocks' : 'live provider requests'}.`);
const results: EvalResult[] = [];
let spent = 0;
let activeFixture: { id: string; job: string; provider: ProviderName } | null = null;
let interrupted = false;
const directory = resolve(appDir, 'evals/results'); await mkdir(directory, { recursive: true });
const path = resolve(directory, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
const summary = () => selected.flatMap(provider => ['process_dump', 'link_evidence', 'tripwire'].map(job => {
  const group = results.filter(result => result.provider === provider && result.job === job);
  return { provider, job, passed: `${group.filter(result => result.pass).length}/${group.length}`, rate: group.length ? `${Math.round(group.filter(result => result.pass).length / group.length * 100)}%` : '—', input_tokens: group.reduce((sum, result) => sum + result.inputTokens, 0), output_tokens: group.reduce((sum, result) => sum + result.outputTokens, 0), cost_usd: group.reduce((sum, result) => sum + result.costUsd, 0).toFixed(6) };
}));
let writes = Promise.resolve();
const persist = () => {
  writes = writes.then(async () => {
    const report = { provenance, fixtureProvenance: fixtures.filter(fixture => fixture.fixture).map(fixture => ({ id: fixture.id, ...fixture.fixture })), synthetic: true, complete: evaluationComplete(results.length, fixtures.length * selected.length, interrupted), fake, compare, cases: fixtures.map(fixture => fixture.id), budgetUsd: budget, spendLedger: spendBudgetSnapshot(), actualCostUsd: spent, completed: results.length, requested: fixtures.length * selected.length, interrupted, activeFixture, ...(interrupted && activeFixture ? { note: 'An in-flight case was interrupted; its unreturned provider cost is not included.' } : {}), results, summary: summary() };
    await writeFile(`${path}.tmp`, JSON.stringify(report, null, 2)); await rename(`${path}.tmp`, path);
  });
  return writes;
};
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { interrupted = true; void persist().finally(() => process.exit(signal === 'SIGINT' ? 130 : 143)); });
await persist();
console.log(`Incremental report: ${path}`);
for (const fixture of fixtures) {
  for (const provider of selected) {
    if (spent >= budget) break;
    process.env.DAILY_SPEND_CAP_USD = String(budget - spent);
    activeFixture = { id: fixture.id, job: fixture.job, provider }; await persist();
    const result = await fixture.run(provider); results.push(result); spent += result.costUsd;
    activeFixture = null; await persist();
    console.log(`${provider.padEnd(9)} ${fixture.job.padEnd(14)} ${fixture.id.padEnd(18)} ${result.pass ? 'PASS' : 'FAIL'}${result.error ? `: ${result.error}` : ''}`);
    if (!result.pass) {
      console.log(`  Failed checks: ${Object.entries(result.checks).filter(([, passed]) => !passed).map(([name]) => name).join(', ')}`);
      for (const failure of result.diagnostics.authorityErrors) console.log(`  AuthorityError ${failure.toolName}(${JSON.stringify(failure.input)}): ${failure.message}`);
      if (result.diagnostics.lastAssistantText) console.log(`  Assistant: ${result.diagnostics.lastAssistantText}`);
    }
  }
}
const rows = summary();
console.table(rows);
await persist();
console.log(`Report: ${path}\nRecorded spend: $${spent.toFixed(6)}${spent >= budget ? ' (budget reached)' : ''}`);
process.exitCode = evaluationExitCode(results.length, fixtures.length * selected.length, results.filter(result => !result.pass).length);
}));
}
