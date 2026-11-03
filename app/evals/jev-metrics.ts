import type { JevFixture } from './fixtures/jev-v1.js';
import type { EvalSnapshot, Row } from './jev-observation.js';

export const ratio = (numerator: number, denominator: number): number | null => denominator > 0 ? numerator / denominator : null;
export function percentiles(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const at = (p: number) => sorted.length ? sorted[Math.ceil(p * sorted.length) - 1] : null;
  return { count: sorted.length, p50: at(0.5), p95: at(0.95), p99: at(0.99), raw: values };
}
const parse = (value: string | null, fallback: any) => { try { return JSON.parse(value ?? 'null') ?? fallback; } catch { return fallback; } };
const normal = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export interface ActualActions {
  proposals: string[];
  relationships: string[];
  merges: string[];
  displays: string[];
  captures: string[];
  activeSignalCount?: number;
  writes: string[];
  filingGroups?: { signal: string; themes: string[] }[];
  drafts?: string[];
  unsafeDrafts?: string[];
  mutationTools?: string[];
}

export function actualActions(snapshot: EvalSnapshot): ActualActions {
  const runIds = new Set(snapshot.runs.map(run => run.id));
  const events = snapshot.tables.events.filter(event => runIds.has(event.run_id));
  const idsFor = (tools: string[]) => new Set(events.filter(event => tools.includes(event.tool)).map(event => event.object_id));
  const proposals = snapshot.tables.suggestions.filter(row => runIds.has(row.run_id) || idsFor(['proposeEvidence', 'proposeChallenge', 'proposeRevision']).has(row.id)).map(row => {
    const payload = parse(row.payload_json, {});
    return row.kind === 'evidence' ? `evidence:${row.target_id}:${payload.stance}` : `${row.kind}:${row.target_id}`;
  });
  const evidence = snapshot.tables.evidence.filter(row => runIds.has(row.run_id)).map(row => `evidence:${row.theory_id}:${row.stance}`);
  const filings = events.filter(event => event.tool === 'fileSignal').map(event => {
    const after = parse(event.after_json, {});
    // fileSignal's event contains the signal with themes, while the actual edge
    // remains authoritative if a future tool changes its event projection.
    const signalId = after.id ?? event.object_id;
    return snapshot.tables.signal_themes.filter(row => row.signal_id === signalId).map(row => `filing:${row.theme_id}`);
  }).flat();
  const merges = snapshot.tables.merges.filter(row => !row.undone_at && events.some(event => event.tool === 'mergeNearDuplicateSignals' && (event.object_id === row.id || parse(event.after_json, {}).survivorId === row.survivor_id))).map(row => {
    const gist = (id: string) => normal(snapshot.tables.signals.find(signal => signal.id === id)?.gist ?? id);
    return `merge:${gist(row.survivor_id)}<=${gist(row.absorbed_id)}`;
  });
  const replyIds = idsFor(['reply']);
  const replies = snapshot.tables.replies.filter(row => replyIds.has(row.id) || events.some(event => event.tool === 'reply' && event.dump_id === row.dump_id));
  const displays = replies.flatMap(row => parse(row.parts_json, []).filter((part: Row) => typeof part.type === 'string' && part.type.startsWith('tool-show')).map((part: Row) => {
    const name = part.type.slice(5);
    const input = part.input ?? {};
    return `${name}:${input.id ?? input.themeId ?? input.theoryId ?? ''}`;
  }));
  const captures = snapshot.tables.signals.filter(row => idsFor(['createSignal']).has(row.id)).map(row => `signal:${normal(row.gist)}`);
  const activeSignalCount = snapshot.tables.signals.filter(row => idsFor(['createSignal']).has(row.id) && !row.merged_into_id && !row.discarded_at && !row.deleted_by_dump_id).length;
  const filingGroups = [...new Set(events.filter(event => event.tool === 'fileSignal').map(event => parse(event.after_json, {}).id ?? event.object_id))].map(id => ({
    signal: snapshot.tables.signals.find(signal => signal.id === id)?.gist ?? id,
    themes: snapshot.tables.signal_themes.filter(row => row.signal_id === id).map(row => row.theme_id).sort(),
  }));
  const draftTools = { createDraftTheme: ['theme', 'themes'], createDraftTheory: ['theory', 'theories'], createDraftPrototype: ['prototype', 'prototypes'] } as const;
  const drafts = events.filter(event => event.tool in draftTools).map(event => {
    const [kind, table] = draftTools[event.tool as keyof typeof draftTools];
    const row = snapshot.tables[table].find(row => row.id === event.object_id);
    const safe = row && (kind === 'prototype' ? row.draft === 1 : row.status === 'draft')
      && row.created_by?.startsWith('agent:') && runIds.has(row.run_id);
    return { kind, safe, id: event.object_id };
  });
  const mutationTools = events.filter(event => !['reply', 'captureDump'].includes(event.tool) && !event.tool.startsWith('show')).map(event => event.tool);
  return {
    proposals, relationships: [...evidence, ...new Set(filings)], merges, displays, captures, activeSignalCount, filingGroups,
    drafts: drafts.map(draft => draft.kind), unsafeDrafts: drafts.filter(draft => !draft.safe).map(draft => draft.id),
    mutationTools,
    writes: [...proposals, ...evidence, ...new Set(filings), ...merges, ...displays, ...captures].sort(),
  };
}

export function labelledCounts(expected: string[], actual: string[]) {
  const remaining = [...expected];
  const correct: string[] = []; const falseActions: string[] = [];
  for (const action of actual) {
    const index = remaining.indexOf(action);
    if (index < 0) falseActions.push(action);
    else { correct.push(action); remaining.splice(index, 1); }
  }
  return { truePositive: correct.length, falsePositive: falseActions.length, falseNegative: remaining.length, correct, falseActions, missed: remaining };
}

export function scoreActual(fixture: JevFixture | undefined, actions: ActualActions) {
  if (!fixture) return null;
  const proposals = fixture.expected.proposals === undefined ? null : labelledCounts(fixture.expected.proposals, actions.proposals);
  const relationships = fixture.expected.relationships === undefined ? null : labelledCounts(fixture.expected.relationships, actions.relationships.filter(action => action.startsWith('filing:')));
  const finalRelationships = fixture.expected.proposals === undefined && fixture.expected.relationships === undefined ? null : labelledCounts(
    [...(fixture.expected.proposals ?? []), ...(fixture.expected.relationships ?? [])],
    [...actions.proposals, ...actions.relationships],
  );
  const displays = fixture.expected.displays === undefined ? null : labelledCounts(fixture.expected.displays, actions.displays);
  const requiredThemes = (fixture.expected.relationships ?? []).filter(action => action.startsWith('filing:')).map(action => action.slice(7));
  const cofiledSignal = requiredThemes.length < 2 || fixture.expected.cofiled === false ? null : (actions.filingGroups ?? []).some(group => requiredThemes.every(theme => group.themes.includes(theme)));
  const count = actions.activeSignalCount ?? actions.captures.length;
  const signalCount = fixture.expected.signalCount === undefined ? null : {
    expected: fixture.expected.signalCount, actual: count,
    pass: count >= fixture.expected.signalCount[0] && count <= fixture.expected.signalCount[1],
  };
  const drafts = fixture.expected.drafts === undefined ? null : labelledCounts(fixture.expected.drafts, actions.drafts ?? []);
  const mutationTools = fixture.expected.mutationTools === undefined ? null : labelledCounts(fixture.expected.mutationTools, actions.mutationTools ?? []);
  return {
    proposals, relationships, finalRelationships, displays, cofiledSignal, signalCount, drafts, mutationTools,
    unsafeDrafts: actions.unsafeDrafts ?? [],
    falseMerges: fixture.expected.merge === undefined ? null : fixture.expected.merge ? Math.max(0, actions.merges.length - 1) : actions.merges.length,
    missedMerge: fixture.expected.merge === undefined ? null : fixture.expected.merge && actions.merges.length === 0,
    missedRelationships: finalRelationships?.falseNegative ?? 0,
    pass: [proposals, relationships, finalRelationships, displays, drafts, mutationTools].every(count => !count || (count.falsePositive === 0 && count.falseNegative === 0))
      && cofiledSignal !== false
      && signalCount?.pass !== false
      && (fixture.expected.drafts === undefined || !actions.unsafeDrafts?.length)
      && (fixture.expected.merge === undefined || actions.merges.length === (fixture.expected.merge ? 1 : 0)),
  };
}

export function policyDecisions(runs: Row[]): Row[] {
  const decisions = runs.flatMap(run => {
    const trace = parse(run.trace_json, []) as Row[];
    // Staged chat planning can record the same decision again. Keep one exact
    // event per run, but preserve distinct pair/signal decisions.
    const unique = new Map(trace.filter(event => event.type === 'jev_policy').map(event => [JSON.stringify(event), event]));
    return [...unique.values()].map(event => ({ runId: run.id, job: run.job, ...event }));
  }) as Row[];
  const pairKey = (event: Row): string | null => {
    const signalId = event.pair?.signalId ?? event.signalId;
    const theoryId = event.pair?.theoryId ?? event.theoryId;
    return typeof signalId === 'string' && typeof theoryId === 'string'
      ? JSON.stringify([event.job, event.policyVersion ?? null, signalId, theoryId]) : null;
  };
  const originalPairs = new Set(decisions.filter(event => event.action !== 'fallback_agent' && event.mode !== 'off').map(pairKey).filter(key => key !== null));
  // Dispatch bookkeeping is not another semantic judgment. Preserve orphaned
  // dispatches so a missing original record cannot hide fallback load.
  return decisions.filter(event => {
    const key = pairKey(event);
    return event.action !== 'fallback_agent' || key === null || !originalPairs.has(key);
  });
}

export function runLatency(run: Row): number | null {
  const trace = parse(run.trace_json, []) as Row[];
  const latency = trace.find(event => event.type === 'jev' && Number.isFinite(event.latencyMs))?.latencyMs;
  if (latency !== undefined) return latency;
  if (!run.finished_at) return null;
  const duration = Date.parse(run.finished_at) - Date.parse(run.started_at);
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

export function runCost(run: Row): number | null {
  const trace = parse(run.trace_json, []) as Row[];
  if (run.cost_usd === null || run.cost_usd === undefined || trace.some(event => event.costUnknown === true)) return null;
  // A transport failure can be billed even when no usage was returned. Budget/
  // input guards are pre-dispatch and may correctly report zero.
  if (run.status === 'failed' && !run.input_tokens && !run.output_tokens && !run.cost_usd
    && !/budget|spend cap|input exceeds|input limit|input.*bound|missing conservative/i.test(run.error ?? '')) return null;
  return run.cost_usd;
}
const costOfRuns = (runs: Row[]): number | null => runs.some(run => runCost(run) === null) ? null : runs.reduce((sum, run) => sum + runCost(run)!, 0);

export interface MetricSample {
  handled: boolean;
  durationMs: number;
  snapshot: EvalSnapshot;
  score: ReturnType<typeof scoreActual>;
}
export function summarizeMetrics(samples: MetricSample[]) {
  const labelled = samples.flatMap(sample => sample.score ? [sample.score] : []);
  const aggregateLabels = (field: 'finalRelationships' | 'displays' | 'drafts' | 'mutationTools') => {
    const counts = labelled.flatMap(score => score[field] ? [score[field]!] : []);
    if (!counts.length) return null;
    const truePositive = counts.reduce((sum, item) => sum + item.truePositive, 0);
    const falsePositive = counts.reduce((sum, item) => sum + item.falsePositive, 0);
    const falseNegative = counts.reduce((sum, item) => sum + item.falseNegative, 0);
    return { truePositive, falsePositive, falseNegative, precision: ratio(truePositive, truePositive + falsePositive), recall: ratio(truePositive, truePositive + falseNegative) };
  };
  const proposalCounts = labelled.flatMap(score => score.proposals ? [score.proposals] : []);
  const truePositive = proposalCounts.reduce((sum, score) => sum + score.truePositive, 0);
  const falsePositive = proposalCounts.reduce((sum, score) => sum + score.falsePositive, 0);
  const falseNegative = proposalCounts.reduce((sum, score) => sum + score.falseNegative, 0);
  const runs = samples.flatMap(sample => sample.snapshot.runs);
  const capturePolicies = samples.map(sample => policyDecisions(sample.snapshot.runs).filter(event => event.mode !== 'off'));
  const policies = capturePolicies.flat();
  const knownPolicies = policies.filter(event => typeof event.fallback === 'boolean');
  const fallbackCount = knownPolicies.filter(event => event.fallback).length;
  const capturesWithDecisions = capturePolicies.filter(decisions => decisions.length > 0);
  const captureFallbackCount = capturesWithDecisions.filter(decisions => decisions.some(event => event.fallback === true)).length;
  const costUsd = costOfRuns(runs);
  const handled = samples.filter(sample => sample.handled).length;
  const qualityPassed = samples.filter(sample => sample.handled && sample.score?.pass === true).length;
  const jobs = [...new Set(runs.map(run => run.job))].map(job => {
    const group = runs.filter(run => run.job === job);
    const cost = costOfRuns(group);
    return { job, runs: group.length, failedRuns: group.filter(run => run.status === 'failed').length, costUsd: cost, costPerRunUsd: cost === null ? null : ratio(cost, group.length), latencyMs: percentiles(group.flatMap(run => { const ms = runLatency(run); return ms === null ? [] : [ms]; })), rawCostsUsd: group.map(runCost), providers: [...new Set(group.map(run => run.provider))], resolvedModels: [...new Set(group.map(run => run.model))] };
  });
  return {
    captures: samples.length, handledCaptures: handled, labelledCases: labelled.length,
    qualityPassedCaptures: qualityPassed, qualityFailedCaptures: samples.filter(sample => sample.score && (!sample.handled || !sample.score.pass)).length,
    qualityPassFraction: ratio(qualityPassed, labelled.length),
    proposals: { truePositive, falsePositive, falseNegative, precision: ratio(truePositive, truePositive + falsePositive), recall: ratio(truePositive, truePositive + falseNegative), denominatorPredicted: truePositive + falsePositive, denominatorExpected: truePositive + falseNegative },
    finalRelationships: aggregateLabels('finalRelationships'), displays: aggregateLabels('displays'), drafts: aggregateLabels('drafts'), mutationTools: aggregateLabels('mutationTools'),
    missedRelationships: labelled.length ? labelled.reduce((sum, score) => sum + score.missedRelationships, 0) : null,
    falseMerges: labelled.some(score => score.falseMerges !== null) ? labelled.reduce((sum, score) => sum + (score.falseMerges ?? 0), 0) : null,
    missedMerges: labelled.some(score => score.missedMerge !== null) ? labelled.filter(score => score.missedMerge).length : null,
    multiThemeFailures: labelled.some(score => score.cofiledSignal !== null) ? labelled.filter(score => score.cofiledSignal === false).length : null,
    signalCountFailures: labelled.some(score => score.signalCount !== null) ? labelled.filter(score => score.signalCount?.pass === false).length : null,
    draftFailures: labelled.some(score => score.drafts !== null) ? labelled.filter(score => score.drafts && (score.drafts.falsePositive > 0 || score.drafts.falseNegative > 0 || score.unsafeDrafts.length > 0)).length : null,
    finalLabels: labelled,
    fallback: { count: fallbackCount, denominator: knownPolicies.length, fraction: ratio(fallbackCount, knownPolicies.length), unknownDecisions: policies.length - knownPolicies.length, unit: 'unique jev_policy decisions (not requests or captures)' },
    captureFallback: { count: captureFallbackCount, denominator: capturesWithDecisions.length, fraction: ratio(captureFallbackCount, capturesWithDecisions.length), unknownCaptures: capturesWithDecisions.filter(decisions => !decisions.some(event => event.fallback === true) && decisions.some(event => typeof event.fallback !== 'boolean')).length, unit: 'captures with any true fallback / captures with Jev decisions; off excluded' },
    latencyMs: percentiles(samples.map(sample => sample.durationMs)), costUsd, unknownCostRuns: runs.filter(run => runCost(run) === null).length,
    costPerHandledCaptureUsd: costUsd === null ? null : ratio(costUsd, handled),
    costPerQualityPassedCaptureUsd: costUsd === null ? null : ratio(costUsd, qualityPassed),
    rawCaptureCostsUsd: samples.map(sample => costOfRuns(sample.snapshot.runs)),
    jobs,
  };
}
