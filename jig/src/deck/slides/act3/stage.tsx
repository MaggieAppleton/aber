/* Act 3 stage helpers: the real app placed on a slide at a chosen zoom and crop, an authored cursor that presses
   real controls, a cancellable script, and a guard that keeps the real components from stealing the deck's keys. */
import { useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { motion, useReducedMotion } from "motion/react";
import { getEdit, setEdit } from "../../../homes/edits";
import { tripFor } from "../../../homes/trips";
import { theory } from "../../../homes/data";

const NAV = new Set(["ArrowLeft", "ArrowRight", "PageUp", "PageDown", " ", "Home", "End"]);

/** While mounted: only the deck's navigation keys get through (the app's own J/K/A/X, ⌘1–5 and Esc are swallowed),
 *  and anything the real components focus (the pill's composer) is blurred so ←/→ keep moving slides. */
export function useInert(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (!NAV.has(e.key) || e.metaKey || e.ctrlKey || e.altKey) e.stopImmediatePropagation(); };
    const focus = (e: FocusEvent) => { if (root.current?.contains(e.target as Node)) (e.target as HTMLElement).blur?.(); };
    window.addEventListener("keydown", key, true);
    document.addEventListener("focusin", focus, true);
    return () => { window.removeEventListener("keydown", key, true); document.removeEventListener("focusin", focus, true); };
  }, [root]);
}

/** Put a theory back to its seeded state (the demo accepts a challenge; the next visit, and the other slides, start fresh). */
export function resetTheory(id: string) {
  const t = theory(id), trip = tripFor(id);
  getEdit("theory", id);
  setEdit("theory", id, { confidence: t.confidence, decisions: trip.decisions ?? {}, log: [] });
}

/**
 * The real app at a zoom, placed in slide coordinates. The stage clips whatever runs off it; `fade` softens a side
 * that would otherwise be a hard cut through the middle of the app.
 */
export function AppAt({ x, y, scale, w, h, fade, children, layer, style }: {
  x: number; y: number; scale: number; w: number; h: number; fade?: { left?: number; soft?: number; top?: number; bottom?: number };
  children: ReactNode; layer: RefObject<HTMLDivElement | null>; style?: CSSProperties;
}) {
  const masks: string[] = [];
  if (fade?.left != null) masks.push(`linear-gradient(to right, transparent ${fade.left}px, #000 ${fade.left + (fade.soft ?? 200)}px)`);
  if (fade?.top != null) masks.push(`linear-gradient(to bottom, transparent ${fade.top}px, #000 ${fade.top + 140}px)`);
  if (fade?.bottom != null) masks.push(`linear-gradient(to top, transparent ${fade.bottom}px, #000 ${fade.bottom + 140}px)`);
  const mask = masks.length ? masks.join(", ") : undefined;
  return (
    <div className="a3-crop" style={{ maskImage: mask, WebkitMaskImage: mask, maskComposite: "intersect", WebkitMaskComposite: "source-in", ...style } as CSSProperties}>
      <div ref={layer} className="a3-layer" style={{ left: x, top: y, width: w, height: h, transform: `scale(${scale})` }} aria-hidden>
        {children}
      </div>
    </div>
  );
}

/* ── The cursor ── */
export type CursorState = { x: number; y: number; down: boolean; on: boolean };

/** A pointer drawn in the app's own coordinates, so it zooms with the crop. */
export function Cursor({ c, touch }: { c: CursorState; touch?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className="a3-cursor" data-touch={touch ? "" : undefined} initial={false}
      animate={{ x: c.x, y: c.y, opacity: c.on ? 1 : 0, scale: c.down ? 0.86 : 1 }}
      transition={reduced ? { duration: 0 } : { x: { duration: 0.75, ease: [0.45, 0, 0.2, 1] }, y: { duration: 0.75, ease: [0.45, 0, 0.2, 1] }, opacity: { duration: 0.25 }, scale: { duration: 0.1 } }}>
      {touch ? <span className="a3-touch" /> : (
        <svg width="22" height="30" viewBox="0 0 22 30" aria-hidden>
          <path d="M2 2 L2 24 L7.5 18.8 L11.4 27.4 L15 25.8 L11.2 17.4 L18.6 17.4 Z" fill="#1a211e" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )}
    </motion.div>
  );
}

const CANCEL = Symbol("cancel");
export type Script = {
  wait: (ms: number) => Promise<void>;
  /** The element's centre in the layer's own (unscaled) coordinates. */
  at: (sel: string | Element, dx?: number, dy?: number) => { x: number; y: number } | null;
  move: (sel: string | Element, dx?: number, dy?: number) => Promise<void>;
  click: (sel: string | Element) => Promise<void>;
  hide: () => void;
  q: <E extends Element = HTMLElement>(sel: string) => E | null;
  reduced: boolean;
};

/** Runs a scripted walkthrough once per mount. Every wait is cancelled when the slide leaves. */
export function useScript(layer: RefObject<HTMLDivElement | null>, w: number, run: (s: Script) => Promise<void>, start: Partial<CursorState> = {}) {
  const reduced = !!useReducedMotion();
  const [cursor, setCursor] = useState<CursorState>({ x: w * 0.6, y: 900, down: false, on: false, ...start });
  useEffect(() => {
    let dead = false;
    const timers: number[] = [];
    const wait = (ms: number) => new Promise<void>((res, rej) => {
      timers.push(window.setTimeout(() => (dead ? rej(CANCEL) : res()), reduced ? Math.min(ms, 30) : ms));
    });
    const q = <E extends Element = HTMLElement>(sel: string) => layer.current?.querySelector<E>(sel) ?? null;
    const el = (sel: string | Element) => (typeof sel === "string" ? q(sel) : sel);
    const at = (sel: string | Element, dx = 0, dy = 0) => {
      const L = layer.current, e = el(sel);
      if (!L || !e) return null;
      const a = L.getBoundingClientRect(), b = e.getBoundingClientRect(), k = a.width / w;
      return { x: (b.left + b.width / 2 - a.left) / k + dx, y: (b.top + b.height / 2 - a.top) / k + dy };
    };
    const move = async (sel: string | Element, dx = 0, dy = 0) => {
      const p = at(sel, dx, dy);
      if (!p) return;
      setCursor(c => ({ ...c, ...p, on: !reduced }));
      await wait(800);
    };
    const click = async (sel: string | Element) => {
      const e = el(sel) as HTMLElement | null;
      setCursor(c => ({ ...c, down: true }));
      await wait(110);
      e?.click();
      setCursor(c => ({ ...c, down: false }));
      await wait(120);
    };
    const hide = () => setCursor(c => ({ ...c, on: false }));
    run({ wait, at, move, click, hide, q, reduced }).catch(err => { if (err !== CANCEL) console.error(err); });
    return () => { dead = true; timers.forEach(clearTimeout); };
  }, []);
  return cursor;
}
