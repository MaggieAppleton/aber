import { expect, test } from "vitest";
import { pendingDumpLabel } from "./dump-status";

test("a queued budget pause is visible while ordinary processing stays neutral", () => {
  expect(pendingDumpLabel("Daily agent spend cap reached; queued work waits until tomorrow")).toBe("Spend limit, resumes tomorrow");
  expect(pendingDumpLabel("BudgetExceededError: Daily agent spend cap reached; queued work waits until tomorrow")).toBe("Spend limit, resumes tomorrow");
  expect(pendingDumpLabel()).toBeUndefined();
  expect(pendingDumpLabel("Temporary network failure")).toBeUndefined();
});
