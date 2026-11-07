import type { LocalInput } from './local-input.js';
import { assignProcessingObservations, type ProcessingSnapshot } from './processing-score.js';

/** Display the scorer's exact assignment, including partial matches when a case fails. */
export function localDiagnostics(input: LocalInput, state: ProcessingSnapshot | undefined, checks: Record<string, boolean>) {
  const signals = state?.signals ?? [];
  const checked = input.expected.observations.flatMap((item, index) => item.clauses?.length ? [{ ...item, index, clauses: item.clauses }] : []);
  const assigned = assignProcessingObservations(checked, { signals, themeNames: state?.themeNames ?? {} }, { localInput: true });
  const matchedIds = new Set(assigned.flatMap(signal => signal ? [signal.id] : []));
  const actual = signals.map(signal => ({ ...signal, themes: signal.themes.map(id => ({ id, name: state?.themeNames[id] ?? id })) }));
  const observations = input.expected.observations.map((expected, index) => {
    const match = assigned[checked.findIndex(item => item.index === index)];
    return { expected, status: !expected.clauses?.length ? 'manual-review' : match ? 'lexical-match' : 'missing', actual: match ? actual.find(signal => signal.id === match.id)! : null };
  });
  const failedChecks = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key);
  const manualReviewNeeded = observations.some(item => item.status === 'manual-review');
  return {
    status: !state || failedChecks.length ? 'fail' : manualReviewNeeded ? 'manual-review' : 'pass',
    manualReviewNeeded, expectedCount: input.expected.count, actualCount: signals.length, observations,
    missing: observations.filter(item => item.status === 'missing').map(item => item.expected.key),
    unmatched: actual.filter(signal => !matchedIds.has(signal.id)), actual, failedChecks,
    limits: 'Clauses are optional case-insensitive lexical checks, not semantic truth. Human review is required for expectations without clauses; unmatched outputs require inspection.',
  };
}
