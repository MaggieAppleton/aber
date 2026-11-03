import { describe, expect, it } from 'vitest';
import { actualActions, labelledCounts, percentiles, policyDecisions, ratio, scoreActual, summarizeMetrics } from './jev-metrics.js';
import { jevFixtures } from './fixtures/jev-v1.js';
import type { EvalSnapshot } from './jev-observation.js';

const empty = (): EvalSnapshot => ({
  runs: [],
  tables: Object.fromEntries(['signals', 'signal_sources', 'signal_origins', 'signal_themes', 'suggestions', 'evidence', 'merges', 'replies', 'dumps', 'themes', 'theories', 'prototypes', 'events', 'stances'].map(table => [table, []])),
});
describe('Jev metrics use final application writes, not model probabilities', () => {
  it('does not turn empty denominators into perfect scores', () => {
    expect(ratio(0, 0)).toBeNull();
    expect(percentiles([])).toMatchObject({ p50: null, p95: null, p99: null });
    const metrics = summarizeMetrics([]);
    expect(metrics.proposals).toMatchObject({ precision: null, recall: null });
    expect(metrics.costPerHandledCaptureUsd).toBeNull();
    expect(metrics.fallback.fraction).toBeNull();
    expect(metrics.captureFallback).toMatchObject({ count: 0, denominator: 0, fraction: null });
    expect(metrics.missedRelationships).toBeNull();
    expect(metrics.falseMerges).toBeNull();
  });
  it('counts pair fallback once across judgement and dispatch runs, retaining orphan dispatches', () => {
    const snapshot = empty();
    const original = { type: 'jev_policy', policyVersion: 'p1', pair: { signalId: 's1', theoryId: 't3' }, action: 'fallback', fallback: true };
    const dispatch = { ...original, action: 'fallback_agent', fallbackRunId: 'dispatch' };
    const run = (id: string, events: Record<string, unknown>[]) => ({ id, job: 'link_evidence', cost_usd: 0, trace_json: JSON.stringify(events) });
    snapshot.runs = [
      run('judge', [original]),
      run('dispatch', [dispatch, { ...dispatch, pair: { signalId: 's1', theoryId: 't7' } }]),
      run('no-fallback', [{ ...original, pair: { signalId: 's1', theoryId: 't5' }, action: 'skip', fallback: false }]),
    ];
    const raw = JSON.stringify(snapshot.runs);
    expect(policyDecisions(snapshot.runs).map(event => event.action)).toEqual(['fallback', 'fallback_agent', 'skip']);
    const withoutFallback = empty();
    withoutFallback.runs = [run('skip', [{ ...original, action: 'skip', fallback: false }])];
    const off = empty();
    off.runs = [run('off', [{ ...original, mode: 'off' }])];
    const unknown = empty();
    unknown.runs = [run('unknown', [{ type: 'jev_policy', action: 'unknown' }])];
    const samples = [snapshot, withoutFallback, off, empty(), unknown].map(snapshot => ({ snapshot, durationMs: 1, handled: true, score: null }));
    const metrics = summarizeMetrics(samples);
    expect(metrics.fallback).toMatchObject({ count: 2, denominator: 4, fraction: 0.5, unknownDecisions: 1 });
    expect(metrics.captureFallback).toMatchObject({ count: 1, denominator: 3, fraction: 1 / 3, unknownCaptures: 1 });
    expect(JSON.stringify(snapshot.runs)).toBe(raw);
  });
  it('counts false proposals, omissions, and duplicates without set-deduping errors', () => {
    expect(labelledCounts(['evidence:t3:supports'], ['evidence:t3:undermines', 'evidence:t3:undermines'])).toMatchObject({ truePositive: 0, falsePositive: 2, falseNegative: 1 });
    expect(labelledCounts(['evidence:t3:supports'], ['evidence:t3:supports', 'evidence:t3:supports'])).toMatchObject({ truePositive: 1, falsePositive: 1, falseNegative: 0 });
  });
  it('retains per-decision fallback denominators and raw costs/latencies', () => {
    const snapshot = empty();
    const policy = { type: 'jev_policy', action: 'fallback', fallback: true, reason: 'uncertain', policyVersion: 'p1' };
    snapshot.runs = [
      { id: 'a', job: 'chat', cost_usd: 0.1, started_at: '2026-11-03T00:00:00Z', finished_at: '2026-11-03T00:00:01Z', trace_json: JSON.stringify([policy, policy]) },
      { id: 'b', job: 'tripwire', cost_usd: 0.2, trace_json: JSON.stringify([{ type: 'jev', latencyMs: 200 }, { ...policy, fallback: false }, { type: 'jev_policy', action: 'unknown' }]) },
    ];
    expect(policyDecisions(snapshot.runs)).toHaveLength(3);
    const metrics = summarizeMetrics([{ handled: true, durationMs: 1500, snapshot, score: null }, { handled: false, durationMs: 500, snapshot: empty(), score: null }]);
    expect(metrics.fallback).toMatchObject({ count: 1, denominator: 2, fraction: 0.5, unknownDecisions: 1 });
    expect(metrics.costPerHandledCaptureUsd).toBeCloseTo(0.3);
    expect(metrics.latencyMs).toMatchObject({ p50: 500, p95: 1500, p99: 1500 });
    expect(metrics.jobs.find(job => job.job === 'chat')?.latencyMs.p99).toBe(1000);
    snapshot.runs[0].cost_usd = null;
    expect(summarizeMetrics([{ handled: true, durationMs: 10, snapshot, score: null }]).costUsd).toBeNull();
  });
  it('scores missing theme edges, extra proposals, and false merges', () => {
    const actions = { proposals: [], relationships: ['filing:memory'], merges: [], displays: [], captures: [], writes: [] };
    expect(scoreActual(jevFixtures.find(fixture => fixture.id === 'j-dev-multi-theme'), actions)).toMatchObject({ pass: false, missedRelationships: 1 });
    const withFalseMerge = { ...actions, merges: ['merge:a<=b'] };
    expect(scoreActual(jevFixtures.find(fixture => fixture.id === 'j-dev-nonduplicate'), withFalseMerge)).toMatchObject({ pass: false, falseMerges: 1 });
    const falseProposal = { ...actions, proposals: ['evidence:t3:supports'] };
    expect(scoreActual(jevFixtures.find(fixture => fixture.id === 'j-dev-no-match'), falseProposal)).toMatchObject({ pass: false, proposals: { falsePositive: 1 } });
    const splitFilings = { ...actions, relationships: ['filing:memory', 'filing:review'], filingGroups: [{ signal: 'first', themes: ['memory'] }, { signal: 'second', themes: ['review'] }] };
    expect(scoreActual(jevFixtures.find(fixture => fixture.id === 'j-dev-multi-theme'), splitFilings)).toMatchObject({ pass: false, cofiledSignal: false });
    splitFilings.filingGroups[0].themes.push('review');
    expect(scoreActual(jevFixtures.find(fixture => fixture.id === 'j-dev-multi-theme'), splitFilings)).toMatchObject({ pass: true, cofiledSignal: true });
  });
  it('excludes seeded proposals and requires persisted rows, not a policy claiming success', () => {
    const snapshot = empty();
    snapshot.runs = [{ id: 'actual-run', trace_json: '[{"type":"jev_policy","action":"propose","fallback":false}]' }];
    snapshot.tables.suggestions.push({ id: 'seed', run_id: 'seed-run', kind: 'evidence', target_id: 't3', payload_json: '{"stance":"supports"}' });
    expect(actualActions(snapshot).proposals).toEqual([]);
    snapshot.tables.suggestions.push({ id: 'new', run_id: 'actual-run', kind: 'evidence', target_id: 't3', payload_json: '{"stance":"undermines"}' });
    expect(actualActions(snapshot).proposals).toEqual(['evidence:t3:undermines']);
    expect(scoreActual(jevFixtures[0], actualActions(snapshot))).toMatchObject({ pass: false, missedRelationships: 1 });
  });
});
