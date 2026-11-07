import { useSyncExternalStore } from "react";
import { clearError, field, json, mutate, world, type Row, type World } from "../data/live";
import { notify } from "./notices";

const inactive = (row: Row) => !!(field(row, "discardedAt") || field(row, "deletedByDumpId") || field(row, "mergedIntoId") || ["retired", "discarded"].includes(row.status));

/** Read the current objects, never a cached confidence or a payload's proposed level. */
export function briefingChallenge(suggestion: Row, data: World = world) {
  const payload = json<Row>(suggestion.payload ?? suggestion.payloadJson ?? suggestion.payload_json, {});
  const theory = data.theories.find(row => row.id === field(suggestion, "targetId"));
  const signal = data.signals.find(row => row.id === (payload.signalId ?? payload.signal_id));
  const confidence = theory?.confidence;
  const level = Number.isInteger(confidence) && confidence >= 1 && confidence <= 5 ? confidence as number : undefined;
  const current = !!theory && (payload.tripwireVersion ?? payload.tripwire_version ?? 0) === (field(theory, "tripwireVersion") ?? 0);
  const unavailable = suggestion.kind !== "challenge" || field(suggestion, "targetKind") !== "theory" || suggestion.status !== "pending" || !theory || inactive(theory) || !signal || inactive(signal) || !theory.tripwire?.trim() || !current;
  const blocked = unavailable ? "This challenge is no longer available. Refresh the Briefing."
    : level === undefined ? "Set confidence on the theory before lowering it."
    : level === 1 ? "Confidence is already at 1. You can keep it here." : undefined;
  return { theory, signal, level, to: level === undefined ? undefined : Math.max(1, level - 1), current, unavailable, blocked,
    reason: payload.why ?? suggestion.reasoning ?? "" };
}

const undoKey = "aber.briefingChallengeUndo";
type SavedNotice = { id: string; text: string; token: string; expiresAt: number };
let active: SavedNotice | undefined;
const failureKey = "aber.briefingChallengeUndoFailures";
type UndoFailure = { id: string; busy: boolean };
let undoFailures: UndoFailure[] = [];
const failureListeners = new Set<() => void>();
const subscribeFailures = (listener: () => void) => { failureListeners.add(listener); return () => { failureListeners.delete(listener); }; };
export const getChallengeUndoFailures = () => undoFailures;
export const useChallengeUndoFailures = () => useSyncExternalStore(subscribeFailures, getChallengeUndoFailures, getChallengeUndoFailures);
function setFailures(next: UndoFailure[]) {
  undoFailures = next;
  try { sessionStorage.setItem(failureKey, JSON.stringify(next.map(item => item.id))); } catch {}
  failureListeners.forEach(listener => listener());
}
export async function retryChallengeUndo(id: string) {
  if (!undoFailures.some(item => item.id === id && !item.busy)) return;
  setFailures(undoFailures.map(item => item.id === id ? { ...item, busy: true } : item));
  try { await mutate("decideSuggestion", { id, decision: "undo" }); setFailures(undoFailures.filter(item => item.id !== id)); }
  catch { clearError(); setFailures(undoFailures.map(item => item.id === id ? { ...item, busy: false } : item)); }
}
function stored(): SavedNotice | undefined {
  try { return JSON.parse(sessionStorage.getItem(undoKey) ?? "null") ?? undefined; } catch { return active; }
}
function forget(notice: SavedNotice) {
  if (active?.token !== notice.token) return;
  active = undefined;
  try { if (stored()?.token === notice.token) sessionStorage.removeItem(undoKey); } catch {}
}

/** Backend Undo restores both the suggestion and its confidence stance, including after refresh. */
export function challengeDecisionNotice(id: string, text: string) {
  present({ id, text, token: crypto.randomUUID(), expiresAt: Date.now() + 5000 });
}

function present(notice: SavedNotice) {
  active = notice;
  try { sessionStorage.setItem(undoKey, JSON.stringify(notice)); } catch {}
  let undoing = false;
  notify({ text: notice.text, settle: () => forget(notice), undo: () => {
    if (undoing || active?.token !== notice.token) return;
    undoing = true;
    void mutate("decideSuggestion", { id: notice.id, decision: "undo" }).then(() => forget(notice)).catch(() => {
      clearError();
      if (active?.token === notice.token) {
        setFailures([...undoFailures.filter(item => item.id !== notice.id), { id: notice.id, busy: false }]);
        forget(notice);
      }
    }).finally(() => { undoing = false; });
  } });
}

export function restoreChallengeNotice(worldLoaded: boolean) {
  if (!worldLoaded) return;
  try {
    const ids: unknown = JSON.parse(sessionStorage.getItem(failureKey) ?? "[]");
    if (Array.isArray(ids)) setFailures([...new Set(ids.filter((id): id is string => typeof id === "string"))]
      .filter(id => world.suggestions.some(row => row.id === id && row.kind === "challenge" && ["accepted", "discarded"].includes(row.status)))
      .map(id => ({ id, busy: undoFailures.find(item => item.id === id)?.busy ?? false })));
  } catch { /* Keep in-memory recovery available when storage is unavailable. */ }
  const saved = stored();
  if (!saved) return;
  active = saved;
  const suggestion = world.suggestions.find(row => row.id === saved.id && row.kind === "challenge");
  if (saved.expiresAt > Date.now() && suggestion && ["accepted", "discarded"].includes(suggestion.status)) present({ ...saved, token: crypto.randomUUID() });
  else forget(saved);
}
