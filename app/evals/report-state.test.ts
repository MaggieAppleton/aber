import { it, expect } from 'vitest';
import { evaluationComplete, evaluationExitCode } from './report-state.js';

it('does not report green when a budget skipped requested cases', () => {
  expect(evaluationComplete(8, 28)).toBe(false);
  expect(evaluationExitCode(8, 28, 0)).toBe(1);
});

it('requires completed cases and no failed checks', () => {
  expect(evaluationExitCode(28, 28, 0)).toBe(0);
  expect(evaluationExitCode(28, 28, 1)).toBe(1);
  expect(evaluationExitCode(0, 0, 0)).toBe(1);
  expect(evaluationComplete(28, 28, true)).toBe(false);
});
