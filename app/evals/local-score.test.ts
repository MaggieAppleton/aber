import { expect, test } from 'vitest';
import { parseLocalInput, processingFixture } from './local-input.js';
import { localDiagnostics } from './local-score.js';
import { scoreProcessing, type ProcessingSnapshot } from './processing-score.js';

test.each([false, true])('overlapping lexical matches pair by asserted themes regardless of output order (reversed %s)', reversed => {
  const input = parseLocalInput({ schemaVersion: 1, id: 'synthetic-overlap', text: 'Synthetic shared findings.', urls: [],
    expected: { count: [2, 2], observations: [
      { key: 'review', finding: 'Shared review finding', clauses: ['shared'], themes: ['review'], ownObservation: true },
      { key: 'memory', finding: 'Shared memory finding', clauses: ['shared'], themes: ['memory'], ownObservation: true },
    ] } });
  const state: ProcessingSnapshot = {
    signals: ['review', 'memory'].map(id => ({ id, gist: `shared ${id} finding`, note: '', themes: [id], sources: [{ ownObservation: true }], origins: ['dump'], fetched: [] })),
    drafts: [], revisions: [], merges: [], themeNames: {}, heldBefore: '', heldAfter: '', providerInput: '', dumpId: 'dump', noAuthorityErrors: true,
  };
  if (reversed) state.signals.reverse();
  const checks = scoreProcessing(processingFixture(input), state, { localInput: true });
  expect(Object.values(checks).every(Boolean)).toBe(true);
  const report = localDiagnostics(input, state, checks);
  expect(report.status).toBe('pass');
  expect(report.observations.map(item => item.actual?.id)).toEqual(['review', 'memory']);
  expect(report.observations.every(item => item.actual?.themes.some(theme => item.expected.themes.includes(theme.id)))).toBe(true);
});

test('omitted local source assertions do not forbid legitimate sources', () => {
  const input = parseLocalInput({ schemaVersion: 1, id: 'synthetic-optional-source', text: 'Synthetic finding.', urls: [],
    expected: { count: [1, 1], observations: [{ key: 'review', finding: 'Review finding', clauses: ['review'], themes: ['review'] }] } });
  const state: ProcessingSnapshot = {
    signals: [{ id: 'review', gist: 'review finding', note: '', themes: ['review'], sources: [{ ownObservation: true }], origins: ['dump'], fetched: [] }],
    drafts: [], revisions: [], merges: [], themeNames: {}, heldBefore: '', heldAfter: '', providerInput: '', dumpId: 'dump', noAuthorityErrors: true,
  };
  const checks = scoreProcessing(processingFixture(input), state, { localInput: true });
  expect(checks.sourcePrecision).toBe(true);
  expect(localDiagnostics(input, state, checks).status).toBe('pass');
  expect(scoreProcessing(processingFixture(input), state).sourcePrecision).toBe(false);
});
