import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Icon, Conf } from "./atoms";
import { Marks } from "./timeline2-shared";
import { Chevrons, chev } from "./timeline2-chaintools";
import { layoutChain, orthoPath, type Graph } from "./timeline2-graph";

/*
 * The chain layout shared by Field (variant 2) and River (R2). Columns are graph depth from the selected theory:
 * causes to the left, consequences to the right. Cards grow out of wherever the theory sat in the view underneath
 * and return there on exit; links are short orthogonal runs between adjacent columns only.
 */

const SPRING = { type: "spring", stiffness: 380, damping: 36 } as const;

export function ChainView({ g, sel, width, height, from, onOpen }: {
  g: Graph; sel: string; width: number; height: number;
  /** Where each theory sits in the underlying view, so cards can grow from and return to it. */
  from: (id: string) => { x: number; y: number } | undefined;
  onOpen: (kind: "theory", id: string) => void;
}) {
  const reduced = useReducedMotion();
  const L = useMemo(() => layoutChain(g, sel, width, height), [g, sel, width, height]);
  const order = [...L.cards].sort((a, b) => a.col - b.col || a.y - b.y);
  const centre = { x: width / 2, y: height / 2 };
  return (
    <motion.div className="t2x-chain ap-scroll" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
      <div className="t2x-chain-inner" style={{ height: L.height }}>
        <motion.svg className="t2x-chain-links" width={width} height={L.height} aria-hidden
          initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: reduced ? 0 : 0.28, duration: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.08 } }}>
          <Chevrons />
          {L.edges.map(e => <path key={`${e.a}>${e.b}`} data-a={e.a} data-b={e.b} className="t2-link" data-accent={e.a === sel || e.b === sel ? "" : undefined} d={orthoPath(e.pts)} markerEnd={chev(e.a === sel || e.b === sel ? "accent" : "ink")} />)}
          {L.rival && <line className="t2-rival-line" x1={L.rival.x + 9} x2={L.rival.x + 9} y1={L.rival.y - 6} y2={L.rival.y + 24} />}
        </motion.svg>
        {L.rival && (
          <motion.span className="t2-rival-badge" title="Rivals" style={{ left: L.rival.x, top: L.rival.y }}
            initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: reduced ? 0 : 0.28 } }} exit={{ opacity: 0, transition: { duration: 0.08 } }}>
            <Icon name="swap" size={11} />
          </motion.span>
        )}
        {order.map((c, i) => {
          const t = g.by.get(c.id)!, f = from(c.id) ?? centre;
          const delay = reduced ? 0 : i * 0.03;
          return (
            <motion.button key={c.id} className="t2x-card" data-draft={t.draft ? "" : undefined} data-sel={c.id === sel ? "" : undefined} data-rival={c.rival ? "" : undefined}
              aria-label={t.claim} style={{ width: c.w, transformOrigin: "0 0" }}
              initial={{ x: f.x, y: f.y, scale: 0.2, opacity: 0 }}
              animate={{ x: c.x, y: c.y, scale: 1, opacity: 1, transition: reduced ? { duration: 0 } : { ...SPRING, delay, opacity: { duration: 0.14, delay } } }}
              exit={{ x: f.x, y: f.y, scale: 0.2, opacity: 0, transition: reduced ? { duration: 0 } : { ...SPRING, delay: (order.length - i) * 0.015, opacity: { duration: 0.16, delay: 0.1 + (order.length - i) * 0.015 } } }}
              onClick={() => onOpen("theory", c.id)}>
              <span className="t2x-card-claim">{t.claim}</span>
              <span className="t2x-card-meta">
                {t.draft ? <i className="t2a-ring" aria-label="Draft: no confidence yet" title="Draft: no confidence yet" /> : <Conf n={t.confidence} />}
                <span className="ap-num ap-muted">{t.horizon}</span>
                <Marks t={{ ...t, rivals: [] }} />
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

