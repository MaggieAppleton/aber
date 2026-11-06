import type { LocalInput } from './local-input.js';
import type { ProcessingSnapshot } from './processing-score.js';

/** Maximum distinct lexical matching, including partial matches when a case fails. */
export function localDiagnostics(input: LocalInput, state: ProcessingSnapshot | undefined, checks: Record<string, boolean>) {
  const signals = state?.signals ?? [];
  const owner = new Map<number, number>();
  const place = (index: number, seen: Set<number>): boolean => {
    const expected = input.expected.observations[index];
    if (!expected.clauses?.length) return false;
    for (const [signalIndex, signal] of signals.entries()) {
      if (seen.has(signalIndex) || !expected.clauses.every(clause => new RegExp(clause, 'i').test(signal.gist))) continue;
      seen.add(signalIndex);
      const previous = owner.get(signalIndex);
      if (previous === undefined || place(previous, seen)) { owner.set(signalIndex, index); return true; }
    }
    return false;
  };
  input.expected.observations.forEach((_, index) => place(index, new Set()));
  const actual = signals.map(signal => ({ ...signal, themes: signal.themes.map(id => ({ id, name: state?.themeNames[id] ?? id })) }));
  const observations = input.expected.observations.map((expected, index) => {
    const match = [...owner].find(([, value]) => value === index);
    return { expected, status: !expected.clauses?.length ? 'manual-review' : match ? 'lexical-match' : 'missing', actual: match ? actual[match[0]] : null };
  });
  const failedChecks = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key);
  const manualReviewNeeded = observations.some(item => item.status === 'manual-review');
  return {
    status: !state || failedChecks.length ? 'fail' : manualReviewNeeded ? 'manual-review' : 'pass',
    manualReviewNeeded, expectedCount: input.expected.count, actualCount: signals.length, observations,
    missing: observations.filter(item => item.status === 'missing').map(item => item.expected.key),
    unmatched: actual.filter((_, index) => !owner.has(index)), actual, failedChecks,
    limits: 'Clauses are optional case-insensitive lexical checks, not semantic truth. Human review is required for expectations without clauses; unmatched outputs require inspection.',
  };
}
