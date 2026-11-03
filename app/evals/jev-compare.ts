import { mkdir, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { appDir } from '../server/src/config.js';
import type { ProviderName } from '../server/src/agents/types.js';
import { withSpendBudget, spendBudgetSnapshot } from '../server/src/agents/spend-budget.js';
import { cases, type EvalCase, type EvalResult } from './cases.js';
import { jevCases } from './jev-cases.js';
import { jevFixtures } from './fixtures/jev-v1.js';
import { jevV2Fixtures } from './fixtures/jev-v2.js';
import { withEvaluationObservation, type EvalSnapshot } from './jev-observation.js';
import { withJevEvaluation, type RequestObservation } from './jev-adapter.js';
import { actualActions, policyDecisions, ratio, scoreActual, summarizeMetrics } from './jev-metrics.js';
import { reviewedBudget, selectedArms, selectedOrderCases, withJevModes } from './jev-options.js';
import { selectCases } from './selection.js';

type Arm = 'off' | 'shadow' | 'on' | 'on-reversed';
export interface ComparisonResult {
  id: string; provider: ProviderName; arm: Arm; durationMs: number;
  database: string; result: EvalResult; snapshot: EvalSnapshot; requests: RequestObservation[];
  actual: ReturnType<typeof actualActions>; score: ReturnType<typeof scoreActual>;
}
const smokeIds = ['j-dev-evidence-clear', 'j-held-evidence-clear', 'j-dev-tripwire-simple', 'j-held-tripwire-simple-near', 'j-dev-duplicate', 'j-held-nonduplicate', 'j-dev-multi-theme', 'j-held-multi-theme', 'j-dev-chat', 'j-held-chat'];
const handled = (result: ComparisonResult) => !result.result.error && result.result.checks.completed !== false && result.result.checks.noAuthorityErrors !== false;

export function shadowPredictionComparison(policy: Record<string, any>, baseline: ReturnType<typeof actualActions>) {
  const action = policy.observedAction ?? policy.predictedAction ?? policy.wouldAction ?? policy.wouldDo ?? policy.action;
  const theoryId = policy.theoryId ?? policy.pair?.theoryId;
  let predictedActions: string[] | null = null;
  let baselineActions: string[] | null = null;
  if (policy.job === 'near_dup' && ['merge', 'no_merge'].includes(action)) {
    const first = policy.pair?.first?.gist; const second = policy.pair?.second?.gist;
    if (typeof first === 'string' && typeof second === 'string') {
      const normal = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const pair = [`merge:${normal(first)}<=${normal(second)}`, `merge:${normal(second)}<=${normal(first)}`];
      predictedActions = [action]; baselineActions = [baseline.merges.some(merge => pair.includes(merge)) ? 'merge' : 'no_merge'];
    }
  } else if (policy.job === 'link_evidence' && theoryId && ['link_or_propose', 'link', 'propose', 'skip'].includes(action)) {
    predictedActions = action === 'skip' ? [] : [`evidence:${theoryId}:${policy.relation}`];
    baselineActions = [...baseline.proposals, ...baseline.relationships].filter(item => item.startsWith(`evidence:${theoryId}:`));
  } else if (policy.job === 'tripwire' && theoryId && ['propose', 'skip'].includes(action)) {
    predictedActions = action === 'skip' ? [] : [`challenge:${theoryId}`];
    baselineActions = baseline.proposals.filter(item => item === `challenge:${theoryId}`);
  } else if (policy.job === 'chat' && ['theoryEvidence', 'themeActivity', 'signals'].includes(action)) {
    const names = action === 'theoryEvidence' ? ['showTheory', 'showEvidenceSplit'] : action === 'themeActivity' ? ['showThemeActivity'] : ['showSignalList'];
    predictedActions = names;
    baselineActions = [...new Set(baseline.displays.map(display => display.split(':')[0]))].sort();
  }
  return {
    predictedAction: action, predictedActions, baselineActions,
    agrees: predictedActions === null || baselineActions === null ? null : JSON.stringify([...predictedActions].sort()) === JSON.stringify([...baselineActions].sort()),
    unit: policy.job === 'chat' ? 'display route (target retained in raw requests/answers)' : 'pair decision',
    note: predictedActions === null ? 'No bounded actionable prediction/target (fallback, service failure, or insufficient policy metadata); not counted as agreement.' : null,
  };
}

export function comparisonCases(args: string[]): EvalCase[] {
  const suiteIndex = args.indexOf('--jev-suite');
  const suite = suiteIndex < 0 ? 'all' : args[suiteIndex + 1];
  if (!['all', 'new', 'v1', 'v2', 'smoke'].includes(suite)) throw new Error('--jev-suite must be all, new, v1, v2, or smoke');
  let fixtures = suite === 'all' ? [...cases(), ...jevCases(), ...jevCases('v2')] : suite === 'v2' ? jevCases('v2') : jevCases();
  if (suite === 'smoke') fixtures = smokeIds.map(id => fixtures.find(fixture => fixture.id === id)!);
  const splitIndex = args.indexOf('--split');
  if (splitIndex >= 0) {
    const split = args[splitIndex + 1];
    if (!['dev', 'held-out'].includes(split)) throw new Error('--split must be dev or held-out');
    fixtures = fixtures.filter(fixture => fixture.fixture?.split === split);
  }
  fixtures = selectCases(fixtures, args);
  const limitIndex = args.indexOf('--limit');
  if (limitIndex >= 0) {
    const limit = Number(args[limitIndex + 1]);
    if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('--limit needs a positive integer');
    fixtures = fixtures.slice(0, limit);
  }
  if (!fixtures.length) throw new Error('No comparison cases selected');
  return fixtures;
}

export function compareArms(results: ComparisonResult[]) {
  const identities = [...new Map(results.map(result => [`${result.provider}:${result.id}`, result])).values()];
  return identities.map(identity => {
    const find = (arm: Arm) => results.find(result => result.id === identity.id && result.provider === identity.provider && result.arm === arm);
    const baseline = find('off'); const shadow = find('shadow'); const on = find('on'); const reversed = find('on-reversed');
    const baselineActions = baseline?.actual.writes ?? null;
    const predicted = shadow && baseline ? policyDecisions(shadow.snapshot.runs).map(policy => ({
      ...policy, comparison: shadowPredictionComparison(policy, baseline.actual),
    })) : null;
    const comparable = predicted?.filter(policy => policy.comparison.agrees !== null) ?? [];
    const shadowJevRunIds = new Set(shadow?.snapshot.runs.filter(run => JSON.parse(run.trace_json ?? '[]').some((event: Record<string, unknown>) => event.type === 'jev')).map(run => run.id) ?? []);
    const shadowPredictionDomainWrites = shadow?.snapshot.tables.events.filter(event => shadowJevRunIds.has(event.run_id)) ?? null;
    return {
      id: identity.id, provider: identity.provider,
      legacyDiagnostic: ['e4', 'e7', 'e8'].includes(identity.id) ? 'Existing seeded-event collision (e4/e7) or ambiguous retained label (e8); not attributed as a new Jev failure.' : null,
      baselineActualActions: baselineActions, shadowActualActions: shadow?.actual.writes ?? null,
      shadowDomainParity: shadow && baseline ? JSON.stringify(baselineActions) === JSON.stringify(shadow.actual.writes) : null,
      shadowPredictionDomainWrites,
      shadowPredictionsReadOnly: shadowPredictionDomainWrites === null ? null : shadowPredictionDomainWrites.length === 0,
      shadowPredictedPoliciesAgainstBaselineActual: predicted,
      shadowPredictionAgreement: { count: comparable.filter(policy => policy.comparison.agrees).length, denominator: comparable.length, fraction: ratio(comparable.filter(policy => policy.comparison.agrees).length, comparable.length) },
      // Stochastic baselines may differ; expose both actual actions rather than
      // claiming all mismatch is caused by Jev or that predictions were applied.
      onActualActions: on?.actual.writes ?? null,
      orderRobustness: !reversed || !on ? null : {
        choiceRequests: reversed.requests.filter(request => request.reversedChoiceCount > 0).length,
        finalActionsEqual: JSON.stringify(on.actual.writes) === JSON.stringify(reversed.actual.writes),
        originalActions: on.actual.writes, reversedActions: reversed.actual.writes,
        originalPolicies: policyDecisions(on.snapshot.runs), reversedPolicies: policyDecisions(reversed.snapshot.runs),
        meaningfulLiveCheck: on.provider !== 'fake',
      },
    };
  });
}

export function workflowSummaries(results: ComparisonResult[]) {
  return Object.fromEntries([...new Set(results.map(result => result.result.job))].map(workflow => {
    const selected = results.filter(result => result.result.job === workflow);
    return [workflow, {
      ...summarizeMetrics(selected.map(result => ({ handled: handled(result), durationMs: result.durationMs, snapshot: result.snapshot, score: result.score }))),
      outcomes: selected.map(result => ({ id: result.id, handled: handled(result), expected: result.result.diagnostics?.expected ?? null, actual: result.actual, score: result.score })),
    }];
  }));
}

export async function runJevComparison(args: string[]): Promise<void> {
  const fake = args.includes('--fake');
  const budgetUsd = reviewedBudget(args, fake);
  const fixtures = comparisonCases(args);
  const baseArms = selectedArms(args);
  const orderCases = selectedOrderCases(args, fixtures.map(fixture => fixture.id), baseArms);
  const requestedProviders = args.includes('--compare') ? ['openai', 'anthropic'] as const : ['openai'] as const;
  const providers: ProviderName[] = fake ? ['fake'] : requestedProviders.filter(provider => {
    const present = !!process.env[provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'];
    if (!present) console.log(`${provider}: skipped (key absent)`);
    return present;
  });
  if (!providers.length) throw new Error('No configured evaluation providers');
  if (!fake && !process.env.TYPESAFE_API_KEY) throw new Error('TYPESAFE_API_KEY is required for live Jev comparison');
  const orderCheck = orderCases.size > 0;
  const directory = resolve(appDir, 'evals/results', `jev-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`);
  await mkdir(directory, { recursive: true });
  const results: ComparisonResult[] = [];
  let interrupted = false; let budgetStopped = false; let fatalError: string | null = null;
  let active: { id: string; provider: ProviderName; arm: Arm } | null = null;
  let completedOrderChecks = 0; let plannedOrderChecks = 0;
  let writes = Promise.resolve();
  const requested = fixtures.length * providers.length * baseArms.length;
  const originalAgentMode = process.env.AGENT_MODE;
  let ledger: ReturnType<typeof spendBudgetSnapshot>;
  process.env.AGENT_MODE = fake ? 'fake' : 'live';
  const report = () => {
    const groups = providers.flatMap(provider => ([...baseArms, ...(orderCheck ? ['on-reversed' as const] : [])] as Arm[]).map(arm => {
      const selected = results.filter(result => result.provider === provider && result.arm === arm);
      const sample = (result: ComparisonResult) => ({
        handled: handled(result), durationMs: result.durationMs, snapshot: result.snapshot, score: result.score,
      });
      return {
        provider, arm, metrics: summarizeMetrics(selected.map(sample)),
        byWorkflow: workflowSummaries(selected),
        byEvaluationRole: Object.fromEntries([...new Set(selected.map(result => fixtures.find(fixture => fixture.id === result.id)?.fixture?.evaluationRole ?? 'legacy'))].map(role => [String(role), summarizeMetrics(selected.filter(result => (fixtures.find(fixture => fixture.id === result.id)?.fixture?.evaluationRole ?? 'legacy') === role).map(sample))])),
        bySplit: Object.fromEntries(['dev', 'held-out', 'legacy'].map(split => [split, summarizeMetrics(selected.filter(result => (fixtures.find(fixture => fixture.id === result.id)?.fixture?.split ?? 'legacy') === split).map(sample))])),
        byCategory: Object.fromEntries([...new Set(selected.map(result => fixtures.find(fixture => fixture.id === result.id)?.fixture?.category ?? 'legacy'))].map(category => [category, summarizeMetrics(selected.filter(result => (fixtures.find(fixture => fixture.id === result.id)?.fixture?.category ?? 'legacy') === category).map(sample))])),
      };
    }));
    return {
      version: 'jev-comparison-v2', synthetic: true, fake,
      qualityEvidence: !fake, note: fake ? 'Handwritten Jev uncertainty and baseline fake responses exercise plumbing, NOT model quality.' : 'Synthetic held-out quality evidence only; not validated on personal material.',
      complete: !interrupted && !budgetStopped && !fatalError && results.filter(result => result.arm !== 'on-reversed').length === requested && completedOrderChecks === plannedOrderChecks,
      interrupted, budgetStopped, fatalError, active, requested, completed: results.filter(result => result.arm !== 'on-reversed').length,
      plannedOrderChecks, completedOrderChecks, orderCheck, selectedArms: baseArms, selectedOrderCases: [...orderCases],
      budgetUsd, spendLedger: spendBudgetSnapshot() ?? ledger, fixtures: fixtures.map(fixture => ({ id: fixture.id, job: fixture.job, ...fixture.fixture })),
      groups, comparisons: compareArms(results), results,
    };
  };
  const persist = () => {
    // Capture while still in the shared ALS ledger, including signal exits.
    ledger = spendBudgetSnapshot() ?? ledger;
    const data = report();
    writes = writes.then(async () => {
      await writeFile(resolve(directory, 'report.json.next'), JSON.stringify(data, null, 2));
      await rename(resolve(directory, 'report.json.next'), resolve(directory, 'report.json'));
      const display = (value: unknown) => value === null ? 'null' : String(value);
      const markdown = [
        '# Jev workflow comparison', '',
        `Complete: **${data.complete}**. Fake: **${fake}**. ${data.note}`, '',
        `Base arms: ${data.completed}/${requested}; option-order checks: ${completedOrderChecks}/${plannedOrderChecks}.`,
        `Reviewed total budget: $${budgetUsd}; ledger: \`${JSON.stringify(data.spendLedger)}\`.`, '',
        '| Provider | Arm | Captures/handled | Proposal precision | Proposal recall | Missed relationships | False merges | Decision fallback n/d | Capture fallback n/d | p50/p95/p99 ms | Cost/handled USD |',
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
        ...data.groups.map(({ provider, arm, metrics: m }) => `| ${provider} | ${arm} | ${m.captures}/${m.handledCaptures} | ${display(m.proposals.precision)} (${m.proposals.truePositive}/${m.proposals.denominatorPredicted}) | ${display(m.proposals.recall)} (${m.proposals.truePositive}/${m.proposals.denominatorExpected}) | ${display(m.missedRelationships)} | ${display(m.falseMerges)} | ${m.fallback.count}/${m.fallback.denominator} (${display(m.fallback.fraction)}) | ${m.captureFallback.count}/${m.captureFallback.denominator} (${display(m.captureFallback.fraction)}) | ${display(m.latencyMs.p50)}/${display(m.latencyMs.p95)}/${display(m.latencyMs.p99)} | ${display(m.costPerHandledCaptureUsd)} |`),
        '', '## Actual outcomes and shadow predictions', '',
        ...data.comparisons.map(item => `### ${item.provider}: ${item.id}\n\n${item.legacyDiagnostic ?? ''}\n\n- Baseline actual: \`${JSON.stringify(item.baselineActualActions)}\`\n- Shadow actual parity: ${item.shadowDomainParity}\n- Shadow predicted policies vs baseline actual: \`${JSON.stringify(item.shadowPredictedPoliciesAgainstBaselineActual)}\`\n- On actual: \`${JSON.stringify(item.onActualActions)}\`\n- Option order: \`${JSON.stringify(item.orderRobustness)}\``),
        '', '## Per-job costs and latency', '',
        ...data.groups.map(group => `### ${group.provider}/${group.arm}\n\n\`\`\`json\n${JSON.stringify(group.metrics.jobs, null, 2)}\n\`\`\``),
        '', '## Whole-capture economics and final quality by workflow', '',
        '| Provider | Arm | Workflow | Captures | Quality pass/labelled | Total capture USD | USD/quality pass | p50/p95/p99 ms |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |',
        ...data.groups.flatMap(group => Object.entries(group.byWorkflow).map(([workflow, m]) => `| ${group.provider} | ${group.arm} | ${workflow} | ${m.captures} | ${m.qualityPassedCaptures}/${m.labelledCases} | ${display(m.costUsd)} | ${display(m.costPerQualityPassedCaptureUsd)} | ${display(m.latencyMs.p50)}/${display(m.latencyMs.p95)}/${display(m.latencyMs.p99)} |`)),
        '', '## Development versus held-out quality', '',
        ...data.groups.map(group => `### ${group.provider}/${group.arm}\n\n${Object.entries(group.bySplit).map(([split, metrics]) => `- ${split}: ${metrics.labelledCases} labelled cases; proposal precision ${display(metrics.proposals.precision)}, recall ${display(metrics.proposals.recall)}; missed relationships ${display(metrics.missedRelationships)}.`).join('\n')}`),
        '', 'Full final database tables, exact expected/actual actions, raw latency/cost samples, provider/model identities and complete agent_runs traces are in report.json; individual .sqlite files retain actual writes.',
        'Original e4/e7 collisions and e8 ambiguity remain raw legacy diagnostics, not new Jev failures. No labels or thresholds have been changed.',
        'Null means unknown or an empty denominator. Handled captures completed the real workflow without runtime/authority errors; labelled quality failures remain separately visible.',
      ].join('\n');
      await writeFile(resolve(directory, 'report.md.next'), markdown);
      await rename(resolve(directory, 'report.md.next'), resolve(directory, 'report.md'));
    });
    return writes;
  };
  const stop = () => { interrupted = true; };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    await withSpendBudget(budgetUsd, async () => {
      await persist();
      console.log(`Jev comparison: ${fixtures.length} fixtures, ${providers.join(', ')}, ${baseArms.join('/')}; ${fake ? 'NO paid calls; plumbing only' : 'explicitly acknowledged live budget'}.`);
      console.log(`Incremental raw report, Markdown and isolated databases: ${directory}`);
      outer: for (const fixture of fixtures) for (const provider of providers) {
        const arms: Arm[] = [...baseArms];
        for (const arm of arms) {
          if (interrupted || budgetStopped) break outer;
          active = { id: fixture.id, provider, arm }; await persist();
          const database = `${provider}-${fixture.id}-${arm}.sqlite`;
          const started = performance.now();
          const observed = await withJevModes(arm === 'on-reversed' ? 'on' : arm, () => withJevEvaluation({ fake, reverse: arm === 'on-reversed', provider }, () => withEvaluationObservation(() => fixture.run(provider), resolve(directory, database))));
          const { value: result, snapshot } = observed.value;
          const actual = actualActions(snapshot);
          const row: ComparisonResult = { id: fixture.id, provider, arm, durationMs: performance.now() - started, database, result, snapshot, requests: observed.requests, actual, score: scoreActual([...jevFixtures, ...jevV2Fixtures].find(item => item.id === fixture.id), actual) };
          results.push(row); active = null;
          if (arm === 'on-reversed') completedOrderChecks++;
          if (arm === 'on' && orderCases.has(fixture.id) && observed.requests.some(request => Object.values(request.questions as Record<string, { type: string }>).some(question => question.type === 'choice'))) {
            plannedOrderChecks++; arms.push('on-reversed');
          }
          const errors = [result.error, ...snapshot.runs.map(run => run.error)].filter(Boolean).join('\n');
          if (/EvaluationBudgetExceededError|Reviewed evaluation budget|Daily agent spend cap|reserved bound|reserved.*upper bound|exceeded.*bound/i.test(errors)) budgetStopped = true;
          await persist();
          console.log(`${provider} ${arm} ${fixture.id}: ${result.error ? result.error : row.score?.pass === false ? 'labelled quality mismatch (actual writes retained)' : 'completed'}${budgetStopped ? ' [budget stop]' : ''}`);
        }
      }
      await persist();
    });
  } catch (caught) {
    fatalError = caught instanceof Error ? `${caught.name}: ${caught.message}` : String(caught);
    // Ledger is no longer active here; keep the last incremental ledger snapshot.
    await persist(); console.error(fatalError);
  } finally {
    process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
    if (originalAgentMode === undefined) delete process.env.AGENT_MODE; else process.env.AGENT_MODE = originalAgentMode;
  }
  const complete = !interrupted && !budgetStopped && !fatalError && results.filter(result => result.arm !== 'on-reversed').length === requested && completedOrderChecks === plannedOrderChecks;
  const runtimeFailure = results.some(result => !handled(result));
  const shadowWriteFailure = compareArms(results).some(comparison => comparison.shadowPredictionsReadOnly === false);
  const newQualityFailure = results.some(result => result.score && !result.score.pass);
  process.exitCode = !complete ? 2 : runtimeFailure || shadowWriteFailure || (!fake && newQualityFailure) ? 1 : 0;
  console.log(`Reports: ${directory}/report.md and report.json. ${complete ? 'Complete' : 'INCOMPLETE'}; no claim that fake passes establish quality.`);
}
