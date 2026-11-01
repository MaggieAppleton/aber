import { expect, it } from 'vitest';
import { cases } from '../../../evals/cases.js';
import { selectCases } from '../../../evals/selection.js';
import { dumpFixtures, evidenceFixtures, tripwireFixtures } from '../../../evals/fixtures/synthetic.js';
import { novelEvidenceFixtures, NOVEL_EVIDENCE_VERSION } from '../../../evals/fixtures/novel-evidence-v1.js';

it('retains all original cases and adds three independently versioned evidence cases', () => {
  const all = cases();
  expect(all).toHaveLength(31);
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
