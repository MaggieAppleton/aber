import { useSyncExternalStore } from "react";
import { mutate } from "./live";
import { notify } from "../ui/notices";

/*
 * Accepting or discarding a draft from its card's edge. The card settles on screen at once; the decision is sent
 * (with the same acceptDraft and discardDraft tools the pane and Briefing use) once its toast has gone, so Undo can
 * take it back without a server-side inverse. Leaving the page sends whatever is still waiting.
 */
export type DraftKind = "theme" | "theory" | "prototype";
export type DraftDecision = "accepted" | "discarded";
type Pending = { kind: DraftKind; id: string; decision: DraftDecision; sending?: boolean };

const pending = new Map<string, Pending>();
const listeners = new Set<() => void>();
let version = 0;
const changed = () => { version++; listeners.forEach(listener => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const tool = (p: Pending) => p.decision === "accepted" ? "acceptDraft" : "discardDraft";

/** The decision waiting on a draft, if any. Components re-render when it changes. */
export function useDraftDecision(id: string): DraftDecision | undefined {
  useSyncExternalStore(subscribe, () => version);
  return pending.get(id)?.decision;
}
export const draftDecision = (id: string) => pending.get(id)?.decision;
/** For lists: re-render on any change and look decisions up by id. */
export function useDraftDecisions(): (id: string) => DraftDecision | undefined {
  useSyncExternalStore(subscribe, () => version);
  return draftDecision;
}

function send(p: Pending) {
  if (p.sending || pending.get(p.id) !== p) return;
  p.sending = true;
  // The card stays settled until the refreshed world agrees with it.
  void mutate(tool(p), { kind: p.kind, id: p.id }).catch(() => {}).finally(() => {
    if (pending.get(p.id) === p) { pending.delete(p.id); changed(); }
  });
}

export function decideDraft(kind: DraftKind, id: string, decision: DraftDecision) {
  if (pending.has(id)) return;
  const p: Pending = { kind, id, decision };
  pending.set(id, p); changed();
  notify({
    text: decision === "accepted" ? "Draft accepted as yours" : "Draft discarded",
    undo: () => { if (!p.sending && pending.get(id) === p) { pending.delete(id); changed(); } },
    settle: () => send(p),
  });
}

if (typeof window !== "undefined") window.addEventListener("pagehide", () => {
  for (const p of pending.values()) {
    if (p.sending) continue;
    p.sending = true;
    void fetch(`/api/tools/${tool(p)}`, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: p.kind, id: p.id }) }).catch(() => {});
  }
});
