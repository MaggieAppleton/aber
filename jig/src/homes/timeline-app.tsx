import { useEffect, useRef, useState } from "react";
import { FieldPlot } from "./timeline2-fieldx";
import type { ObjKind, OnOpen } from "./panes";
import "./timeline2.css";

/*
 * Timeline, as the app hosts it: the Field (year across, confidence down) with one hop at a time, "+n" level badges and
 * Follow chain. The open theory is the selection; clicking a theory opens it in the shell's pane. Below MIN_W the field
 * keeps its width and scrolls sideways, so labels are never squeezed or hidden under the pane.
 */

const MIN_W = 760;
/** Room under the field for the view switcher and the pill. */
const BOTTOM = 72;

export function TimelineHosted({ width, height, open, onOpen, compact }: {
  width: number; height: number; open?: { kind: ObjKind; id: string }; onOpen: OnOpen; compact?: boolean;
}) {
  // The chain view lays itself out to what is visible (and scrolls on its own), so the field only keeps its minimum
  // width while it is showing.
  const [chain, setChain] = useState(false);
  const w = chain ? width : Math.max(width, MIN_W);
  const selected = open?.kind === "theory" ? open.id : undefined;
  const scroller = useRef<HTMLDivElement>(null);
  // Keep the selected theory in view when the field is narrower than its content (a wide pane, or the strip).
  useEffect(() => {
    const sc = scroller.current;
    if (!sc || !selected || sc.scrollWidth <= sc.clientWidth) return;
    const el = sc.querySelector<HTMLElement>(`[data-tid="${selected}"]`);
    if (!el) return;
    const a = el.getBoundingClientRect(), b = sc.getBoundingClientRect();
    if (a.left < b.left + 24 || a.right > b.right - 24) sc.scrollTo({ left: sc.scrollLeft + a.left - b.left - Math.min(80, sc.clientWidth / 3), behavior: "smooth" });
  }, [selected, width, chain]);
  return (
    <div className="ap t2 t2a t2x tla" data-compact={compact ? "" : undefined}>
      <div className="tla-scroll" ref={scroller}>
        <div className="tla-field" style={{ width: w, height }}>
          <FieldPlot scale="now" width={w} height={height} bottom={BOTTOM} variant="morph" selected={selected} onOpen={onOpen} draggable onChain={setChain} />
        </div>
      </div>
    </div>
  );
}
