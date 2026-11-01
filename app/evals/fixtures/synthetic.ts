import { SYNTHETIC_D1 } from '../../server/src/agents/fixtures.js';

// These are authored examples from the jig world, not Maggie's personal dumps.
export const provenance = 'Synthetic fixtures authored for the local build. No validation on personal material is claimed.';
export const dumpFixtures = [
  { id: 'D1', text: SYNTHETIC_D1.text, count: [3, 3], theme: 'cost' },
  { id: 'cheap-model', text: 'A lab cut the price of its small inference model by half.', count: [1, 1], theme: 'cost' },
  { id: 'memory', text: 'An assistant recalled project decisions across a month of sessions.', count: [1, 1], theme: 'memory' },
  { id: 'review', text: 'A team reports agents opening forty pull requests a day.', count: [1, 1], theme: 'review' },
  { id: 'personal', text: 'My friend built a personal budgeting app just for her household.', count: [1, 1], theme: 'personal' },
  { id: 'question', text: 'What would change my mind about routine intelligence costs?', count: [0, 0] },
  { id: 'repeat', text: 'The same saved report again.', urls: ['https://example.org/eval/repeat?utm_source=fixture'], setup: 'repeat', count: [1, 1], delta: 0 },
  { id: 'tombstone', text: 'This is a discarded observation being shared again.', urls: ['https://example.org/eval/discarded'], setup: 'tombstone', count: [0, 0], delta: 0 },
  { id: 'near-duplicate', text: 'Lab Aurora cuts its small-model price by half on 1 November.', urls: ['https://example.org/eval/same-finding-b'], setup: 'duplicate', count: [1, 1], merge: true },
  { id: 'same-topic-decoy', text: 'Lab Aurora improves its small-model reasoning benchmark on 2 November.', urls: ['https://example.org/eval/different-finding'], setup: 'duplicate', count: [1, 1], merge: false },
] as const;

export const evidenceFixtures = [
  { id: 'e1', theoryId: 't1', gist: 'Small model API prices fell by half for routine work.', stance: 'supports' },
  { id: 'e2', theoryId: 't1', gist: 'Small model inference costs rise despite hardware improvements.', stance: 'undermines' },
  { id: 'e3', theoryId: 't3', gist: 'An assistant can recall project decisions across a month of sessions.', stance: 'supports' },
  { id: 'e4', theoryId: 't3', gist: 'Assistant memory was withdrawn after privacy complaints.', stance: 'undermines' },
  { id: 'e5', theoryId: 't4', gist: 'Human review queues grew while agents generated code faster.', stance: 'supports' },
  { id: 'e6', theoryId: 't4', gist: 'The review bottleneck failed to materialise because agents caught errors themselves.', stance: 'undermines' },
  { id: 'e7', theoryId: 't5', gist: 'A friend built a personal household budgeting app for herself.', stance: 'supports' },
  { id: 'e8', theoryId: 't5', gist: 'Personal household apps remain expensive to maintain and were abandoned.', stance: 'undermines' },
  { id: 'e9', theoryId: 't6', gist: 'Funding for model labs fell for a second quarter before agent revenue arrived.', stance: 'supports' },
  { id: 'e10', theoryId: 't3', gist: 'After an upgrade the assistant cannot recall any prior project context.', stance: 'undermines' },
] as const;

export const tripwireFixtures = [
  { id: 'w1', gist: 'A major assistant withdrew its memory feature after privacy complaints.', hit: true },
  { id: 'w2', gist: 'Memory was withdrawn by a major assistant after users inspected what it kept.', hit: true },
  { id: 'w3', gist: 'An assistant recalls my project across thirty sessions.', hit: false },
  { id: 'w4', gist: 'A small lab launches a new memory feature.', hit: false },
  { id: 'w5', gist: 'A major assistant explains its memory feature in a blog post.', hit: false },
  { id: 'w6', gist: 'A user wonders whether memory could cause privacy problems.', hit: false },
  { id: 'w7', gist: 'A benchmark measures memory accuracy across a month of sessions.', hit: false },
  { id: 'w8', gist: 'A major assistant makes its memory feature faster and easier to inspect.', hit: false },
] as const;
