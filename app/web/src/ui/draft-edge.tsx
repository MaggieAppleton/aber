import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { TooltipButton } from "./tooltip";
import { Icon, type CardEdge } from "./atoms";
import { decideDraft, useDraftDecision, type DraftKind } from "../data/draft-decisions";

/*
 * A draft acts from its edge. On hover or keyboard focus within the card, two round white mini buttons fade and slide
 * 2px into place: discard (X) at the top right, accept (✓) at the bottom right. A and X do the same while the card
 * has focus. Accepting solidifies the card in place (the dashed outline fades and the card settles); discarding slides
 * it out to the right. Both show the toast, with Undo.
 */
const LEAVE_MS = 180, SETTLE_MS = 700;

export function useDraftEdge(kind: DraftKind, id: string, draft: boolean): { draft: boolean; hidden: boolean; edge?: CardEdge } {
  const decision = useDraftDecision(id);
  const reduce = useReducedMotion();
  const [settling, setSettling] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const busy = useRef(false);
  const live = draft && decision !== "accepted";
  const hidden = draft && decision === "discarded";

  /** Keep keyboard focus on the card (after accept) or move it to the next card (after discard). */
  const hostOf = (el: Element | null) => el?.closest<HTMLElement>(".ab-edge-host, .cd-item") ?? null;
  const cardOf = (el: Element | null) => hostOf(el)?.querySelector<HTMLElement>("[data-edge-card]") ?? null;
  const accept = (from: Element | null) => {
    if (busy.current) return;
    const card = cardOf(from);
    const hadFocus = !!hostOf(from)?.contains(document.activeElement);
    setSettling(true); decideDraft(kind, id, "accepted");
    if (hadFocus) requestAnimationFrame(() => card?.focus({ preventScroll: true }));
    setTimeout(() => setSettling(false), reduce ? 0 : SETTLE_MS);
  };
  const discard = (from: Element | null) => {
    if (busy.current) return;
    busy.current = true;
    const card = cardOf(from);
    if (card && hostOf(from)?.contains(document.activeElement)) {
      const all = [...document.querySelectorAll<HTMLElement>("[data-edge-card]")];
      const i = all.indexOf(card);
      (all[i + 1] ?? all[i - 1])?.focus({ preventScroll: true });
    }
    setLeaving(true);
    setTimeout(() => { decideDraft(kind, id, "discarded"); setLeaving(false); busy.current = false; }, reduce ? 0 : LEAVE_MS);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!live || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const key = e.key.toLowerCase();
    if (key !== "a" && key !== "x") return;
    // Ours, not the pane's: the app's own A and X act on the open object.
    e.preventDefault(); e.stopPropagation();
    (key === "a" ? accept : discard)(e.currentTarget);
  };
  const actions = live ? <span className="ab-edge-acts">
    <TooltipButton type="button" className="ab-mini" data-edge="no" aria-label="Discard draft (X)" tooltip="Discard draft (X)" aria-keyshortcuts="x"
      onClick={e => { e.stopPropagation(); discard(e.currentTarget); }}><Icon name="x" size={14} /></TooltipButton>
    <TooltipButton type="button" className="ab-mini" data-edge="yes" aria-label="Accept draft (A)" tooltip="Accept draft (A)" aria-keyshortcuts="a"
      onClick={e => { e.stopPropagation(); accept(e.currentTarget); }}><Icon name="check" size={14} /></TooltipButton>
  </span> : null;
  // Every card in a list with drafts keeps the same shape, so settling never remounts it (or drops its focus).
  return { draft: live, hidden, edge: { actions, onKeyDown, settling, leaving, shortcuts: live ? "a x" : undefined } };
}

/** The same, as a render prop, for lists that build their rows inline. */
export function DraftEdgeFor({ kind, id, draft, children }: { kind: DraftKind; id: string; draft: boolean; children: (r: ReturnType<typeof useDraftEdge>) => ReactNode }) {
  return <>{children(useDraftEdge(kind, id, draft))}</>;
}
