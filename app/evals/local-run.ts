import { execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { appDir } from '../server/src/config.js';
import { reviewedBudget } from './jev-options.js';
import { spendBudgetSnapshot, withSpendBudget } from '../server/src/agents/spend-budget.js';
import { loadLocalInputs, processingFixture } from './local-input.js';
import { localDiagnostics } from './local-score.js';
import type { ProcessingSnapshot } from './processing-score.js';

function value(args: string[], flag: string, fallback?: string): string {
  const index = args.indexOf(flag);
  if (index < 0 && fallback !== undefined) return fallback;
  if (index < 0 || args.lastIndexOf(flag) !== index || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${flag} requires one value`);
  return args[index + 1];
}

export function localOptions(args: string[]) {
  const permitted = new Set(['--input', '--validate', '--live', '--budget', '--acknowledge-paid-budget', '--processing-mode']);
  const valued = new Set(['--input', '--budget', '--processing-mode']);
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (!permitted.has(flag) || seen.has(flag)) throw new Error('Unsupported or duplicate local-input option');
    seen.add(flag);
    if (valued.has(flag)) { value(args, flag); index++; }
  }
  const input = value(args, '--input');
  const mode = value(args, '--processing-mode', 'on');
  if (mode !== 'on' && mode !== 'off') throw new Error('--processing-mode must be on or off');
  if (args.includes('--validate')) {
    if (args.includes('--live')) throw new Error('--validate and --live are mutually exclusive');
    return { input, mode, validate: true, budget: null } as const;
  }
  if (!args.includes('--live')) throw new Error('Local processing requires --live, --budget <finite USD> and --acknowledge-paid-budget; use --validate for offline validation');
  return { input, mode, validate: false, budget: reviewedBudget(args, false) } as const;
}

async function withProcessingMode<T>(mode: 'on' | 'off', task: () => Promise<T>): Promise<T> {
  const previous = process.env.JEV_PROCESS_DUMP_MODE;
  process.env.JEV_PROCESS_DUMP_MODE = mode;
  try { return await task(); }
  finally {
    if (previous === undefined) delete process.env.JEV_PROCESS_DUMP_MODE;
    else process.env.JEV_PROCESS_DUMP_MODE = previous;
  }
}

/** Only local IDs, statuses and paths are printed. Full diagnostics stay in ignored files. */
export async function runLocalInputs(args: string[]): Promise<number> {
  const options = localOptions(args);
  const loaded = await loadLocalInputs(options.input);
  if (options.validate) {
    loaded.forEach(({ input, file }) => console.log(`${input.id}: VALID ${file}`));
    return 0;
  }
  for (const path of ['evals/local/privacy-check.json', 'evals/results/privacy-check.json']) {
    try { execFileSync('git', ['check-ignore', '-q', path], { cwd: appDir }); }
    catch { throw new Error('Local input/results ignore rules are missing; refusing to write private data'); }
  }
  const directory = resolve(appDir, 'evals/results', `local-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`);
  await mkdir(directory, { recursive: true });
  const reportPath = resolve(directory, 'report.json');
  const report = {
    provenance: { kind: 'local-input', sourceFiles: loaded.map(item => item.file), seedContext: 'Synthetic seed world; no personal DB is read', scope: 'Extraction and filing only; queued evidence/tripwire jobs and audio transcription are not run' },
    processingMode: options.mode, provider: 'openai', complete: false, activeId: null as string | null,
    budgetUsd: options.budget, spendLedger: spendBudgetSnapshot(),
    limits: 'Lexical checks are not semantic truth. PASS means automatic checks passed, not verified real-world accuracy. Missing clauses require manual review. Failed/unreturned provider usage may be unknown; inspect the ledger and traces.',
    cases: [] as Record<string, unknown>[],
  };
  const persist = async () => {
    report.spendLedger = spendBudgetSnapshot();
    await writeFile(`${reportPath}.tmp`, JSON.stringify(report, null, 2));
    await rename(`${reportPath}.tmp`, reportPath);
  };
  const { evaluateProcessing } = await import('./processing.js');
  const { withEvaluationObservation } = await import('./jev-observation.js');
  const previous = process.env.AGENT_MODE;
  process.env.AGENT_MODE = 'live';
  try {
    return await withProcessingMode(options.mode, () => withSpendBudget(options.budget!, async () => {
      await persist();
      console.log(`RUNNING ${reportPath}`);
      for (const { input, file } of loaded) {
        report.activeId = input.id;
        const inputPath = resolve(directory, `${input.id}.input.json`);
        await writeFile(inputPath, JSON.stringify(input, null, 2));
        await persist();
        try {
          const { value: result, snapshot } = await withEvaluationObservation(
            () => evaluateProcessing(processingFixture(input), 'openai', { configuredPipeline: true }),
            resolve(directory, `${input.id}.sqlite`),
          );
          const diagnostic = localDiagnostics(input, result.diagnostics.actual as ProcessingSnapshot | undefined, result.checks);
          report.cases.push({ id: input.id, provenance: { file, inputPath, sha256: createHash('sha256').update(JSON.stringify(input)).digest('hex') }, expected: input.expected,
            ...diagnostic, result: { ...result, automaticChecksPassed: result.pass, pass: diagnostic.status === 'pass' }, snapshot,
            runtimeModels: snapshot.runs.map(run => ({ job: run.job, provider: run.provider, model: run.model })),
          });
          console.log(`${input.id}: ${diagnostic.status.toUpperCase()} ${reportPath}`);
        } catch (error) {
          report.cases.push({ id: input.id, status: 'fail', error: error instanceof Error ? error.message : String(error), inputPath });
          console.log(`${input.id}: FAIL ${reportPath}`);
        }
        report.activeId = null;
        await persist();
        if ((report.cases.at(-1)?.result as { error?: string } | undefined)?.error || report.cases.at(-1)?.error) break;
      }
      report.complete = report.cases.length === loaded.length;
      await persist();
      return !report.complete ? 2 : report.cases.some(item => item.status === 'fail') ? 1 : report.cases.some(item => item.status === 'manual-review') ? 2 : 0;
    }));
  } finally {
    if (previous === undefined) delete process.env.AGENT_MODE; else process.env.AGENT_MODE = previous;
  }
}
