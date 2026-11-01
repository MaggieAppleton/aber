import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "./atoms";
import type { ObjKind, OnOpen } from "./panes";
import type { Graph, Vis } from "./timeline2-graph";

/* Small pieces shared by the Clearer-chains variants: a demo selection, a rest/replay button and the expansion trail. */

export const DEMO = "t1"; // "Tokens become nearly free for routine work"
const EASE = [0.16, 1, 0.3, 1] as const;

/** Like useOpen, but starts with the demo theory selected. */
export function useDemoOpen() {
  const [obj, setObj] = useState<{ kind: ObjKind; id: string } | undefined>({ kind: "theory", id: DEMO });
  const onOpen: OnOpen = (kind, id) => setObj({ kind, id });
  const close = () => setObj(undefined);
  const selected = obj?.kind === "theory" ? obj.id : undefined;
  return { obj, onOpen, close, selected };
}

export function DemoButton({ open, onReset }: { open: ReturnType<typeof useDemoOpen>; onReset: () => void }) {
  const busy = !!open.obj;
  const label = busy ? "Return to rest" : "Replay demo selection";
  return (
    <button className="t2-tool" aria-label={label} title={label} onClick={() => { onReset(); if (busy) open.close(); else open.onOpen("theory", DEMO); }}>
      <Icon name={busy ? "undo" : "replay"} size={15} />
    </button>
  );
}

/** The stack of opened levels, newest last. Each chip collapses its level (and anything opened from it). */
export function Trail({ g, exp, vis, onCollapse, axis = "x" }: { g: Graph; exp: string[]; vis: Map<string, Vis>; onCollapse: (id: string) => void; axis?: "x" | "y" }) {
  return (
    <div className="t2x-trail" aria-label="Opened levels">
      <AnimatePresence initial={false}>
        {exp.map(id => {
          const v = vis.get(id), t = g.by.get(id);
          if (!t || !v) return null;
          return (
            <motion.button key={id} className="t2-active t2x-crumb" onClick={() => onCollapse(id)} title={`Hide what follows from: ${t.claim}`} aria-label={`Collapse ${t.claim}`}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.16, ease: EASE }}>
              <Icon name={axis === "x" ? (v.dir === 1 ? "arrowRight" : "arrowLeft") : v.dir === 1 ? "arrowDown" : "arrowUp"} size={12} />
              <span className="t2x-crumb-text">{t.claim}</span>
              <Icon name="x" size={12} />
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/** Open chevron arrowheads: two short strokes, same weight as the line, round caps. One per link colour, because
 *  context-stroke is not dependable in markers. Sized in user space so they never scale with stroke width. */
export function Chevrons() {
  return (
    <defs>
      {(["ink", "deep", "accent"] as const).map(c => (
        <marker key={c} id={`t2x-chev-${c}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
          <path className="t2x-chev" data-c={c} d="M 4 1.5 L 9 5 L 4 8.5" />
        </marker>
      ))}
    </defs>
  );
}
export const chev = (c: "ink" | "deep" | "accent") => `url(#t2x-chev-${c})`;
