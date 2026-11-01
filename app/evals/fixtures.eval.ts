import { describe, expect, it } from 'vitest';
import { cases } from './cases.js';

describe('synthetic agent fixture evaluations', () => {
  for (const fixture of cases()) it(`${fixture.job}: ${fixture.id}`, async () => {
    // Deterministic plumbing validation. Provider quality comparisons are the
    // explicitly costed `npm run eval -- --compare` entry point.
    process.env.AGENT_MODE = 'fake'; process.env.DAILY_SPEND_CAP_USD = '5';
    const result = await fixture.run('fake');
    expect(result.pass, JSON.stringify(result.checks)).toBe(true);
    expect(result.costUsd).toBe(0);
  });
});
