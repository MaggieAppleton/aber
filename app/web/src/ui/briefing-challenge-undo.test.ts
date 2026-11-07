import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { challengeDecisionNotice, getChallengeUndoFailures, restoreChallengeNotice, retryChallengeUndo } from "./briefing-challenge-state";
import { mutate, world } from "../data/live";
import { onNotice, type Notice } from "./notices";

vi.mock("../data/live", () => ({
  mutate: vi.fn(), clearError: vi.fn(), world: { suggestions: [] },
  field: (row: Record<string, unknown>, key: string) => row[key],
  json: (value: unknown) => value,
}));
const key = "aber.briefingChallengeUndo";
let notices: Notice[], stop: () => void;
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  notices = []; stop = onNotice(notice => notices.push(notice));
  world.suggestions = [{ id: "a", kind: "challenge", status: "accepted" }];
  vi.mocked(mutate).mockReset();
  restoreChallengeNotice(true);
});
afterEach(() => { stop(); vi.unstubAllGlobals(); vi.useRealTimers(); });

test("settling an expired or replaced notice retires only that notice", () => {
  challengeDecisionNotice("a", "A");
  notices[0].settle?.();
  expect(sessionStorage.getItem(key)).toBeNull();
  restoreChallengeNotice(true);
  expect(notices).toHaveLength(1);
  challengeDecisionNotice("a", "A"); challengeDecisionNotice("b", "B");
  notices[1].settle?.();
  expect(JSON.parse(sessionStorage.getItem(key)!).id).toBe("b");
});

test("a failed initial world load preserves Undo until a successful load establishes absence", () => {
  challengeDecisionNotice("a", "A"); world.suggestions = [];
  restoreChallengeNotice(false);
  expect(sessionStorage.getItem(key)).not.toBeNull();
  restoreChallengeNotice(true);
  expect(sessionStorage.getItem(key)).toBeNull();
});

test.each([false, true])("older Undo completion cannot replace or clear a newer notice (failure %s)", async failure => {
  let complete!: () => void, fail!: (error: Error) => void;
  vi.mocked(mutate).mockImplementation(() => new Promise((resolve, reject) => { complete = () => resolve({}); fail = reject; }));
  challengeDecisionNotice("a", "A"); notices[0].undo?.();
  challengeDecisionNotice("b", "B");
  if (failure) fail(new Error("Older failure")); else complete();
  await vi.waitFor(() => expect(vi.mocked(mutate)).toHaveResolvedTimes(failure ? 0 : 1));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(JSON.parse(sessionStorage.getItem(key)!).id).toBe("b");
  expect(notices).toHaveLength(2);
});

test("a reload cannot resurrect a notice beyond its recovery window", () => {
  vi.useFakeTimers(); challengeDecisionNotice("a", "A");
  vi.advanceTimersByTime(5001);
  restoreChallengeNotice(true);
  expect(sessionStorage.getItem(key)).toBeNull();
  expect(notices).toHaveLength(1);
});

test("failed Undo remains contextual across expiry and reload and retries without replacing newer Undo", async () => {
  vi.mocked(mutate).mockRejectedValueOnce(new Error("Raw provider detail"));
  challengeDecisionNotice("a", "A"); notices[0].undo?.();
  await vi.waitFor(() => expect(getChallengeUndoFailures()).toEqual([{ id: "a", busy: false }]));
  expect(notices).toHaveLength(1);
  vi.useFakeTimers(); vi.advanceTimersByTime(6000); restoreChallengeNotice(true); vi.useRealTimers();
  expect(getChallengeUndoFailures()).toEqual([{ id: "a", busy: false }]);
  challengeDecisionNotice("b", "B");
  vi.mocked(mutate).mockResolvedValueOnce({});
  await retryChallengeUndo("a");
  expect(getChallengeUndoFailures()).toEqual([]);
  expect(JSON.parse(sessionStorage.getItem(key)!).id).toBe("b");
});
