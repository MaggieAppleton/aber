import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cases } from '../../../evals/cases.js';
import { selectCases } from '../../../evals/selection.js';
import { dumpFixtures, evidenceFixtures, tripwireFixtures } from '../../../evals/fixtures/synthetic.js';
import { novelEvidenceFixtures, NOVEL_EVIDENCE_VERSION } from '../../../evals/fixtures/novel-evidence-v1.js';

it('retains all original cases and adds three independently versioned evidence cases', () => {
  const all = cases();
  expect(all).toHaveLength(36);
  expect(all.slice(0, 31).map(item => item.id)).toEqual([...dumpFixtures, ...evidenceFixtures, ...novelEvidenceFixtures, ...tripwireFixtures].map(item => item.id));
  const originals = [...dumpFixtures, ...evidenceFixtures, ...tripwireFixtures];
  expect(originals).toHaveLength(28);
  expect(all.map(fixture => fixture.id)).toEqual(expect.arrayContaining(originals.map(fixture => fixture.id)));
  const selected = selectCases(all, ['--case', 'e4-novel,e7-novel,e8-novel']);
  expect(selected).toHaveLength(3);
  for (const fixture of selected) {
    expect(fixture.fixture?.version).toBe(NOVEL_EVIDENCE_VERSION);
    expect(fixture.fixture?.text).toBe(novelEvidenceFixtures.find(item => item.id === fixture.id)?.gist);
    expect(fixture.fixture?.expected.theoryId).toMatch(/^t[35]$/);
  }
});
it('does not rename or relabel the original diagnosed cases', () => {
  expect(evidenceFixtures.find(fixture => fixture.id === 'e4')).toMatchObject({ gist: 'Assistant memory was withdrawn after privacy complaints.', stance: 'undermines' });
  expect(evidenceFixtures.find(fixture => fixture.id === 'e7')).toMatchObject({ gist: 'A friend built a personal household budgeting app for herself.', stance: 'supports' });
  expect(evidenceFixtures.find(fixture => fixture.id === 'e8')).toMatchObject({ gist: 'Personal household apps remain expensive to maintain and were abandoned.', stance: 'undermines' });
});

it('preserves original fixture files byte for byte, including all 31 texts and labels', () => {
  expect(createHash('sha256').update(JSON.stringify([...dumpFixtures, ...evidenceFixtures, ...novelEvidenceFixtures, ...tripwireFixtures])).digest('hex')).toBe('74a5aea6eef4498565bdfbbb2540fca28b0b03f0ce9fa3b88f3448f68c42ce3c');
  expect(createHash('sha256').update(readFileSync(new URL('../../../evals/fixtures/synthetic.ts', import.meta.url))).digest('hex')).toBe('40abca554b9153baf8c8fefd02f53f68ad415f370534f14a98401b90c94b51aa');
  expect(createHash('sha256').update(readFileSync(new URL('../../../evals/fixtures/novel-evidence-v1.ts', import.meta.url))).digest('hex')).toBe('41372e38d36dd032dc5973d006c12426b0b929d47b338fb24740c405441a377b');
});
