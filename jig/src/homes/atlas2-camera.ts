import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type RefObject } from "react";
import { animate, useMotionValue } from "motion/react";

/** A camera over a fixed-size world: pan by dragging or two-finger scroll, zoom by pinch, ⌘-wheel, keys or buttons. */
export type Shot = { scale: number; tx: number; ty: number };
type Box = { x0: number; y0: number; x1: number; y1: number };

export const ZOOM_MAX = 4;
const ZOOM_MIN = 0.5;
/** Camera moves the app makes (framing, buttons, keys): critically damped, interruptible, velocity carried on retarget. */
const FLY = { type: "spring", duration: 0.6, bounce: 0 } as const;
const NUDGE = { type: "spring", duration: 0.35, bounce: 0 } as const;
/** Release momentum: exponential decay whose start speed matches the hand (power ≈ timeConstant in s). */
const THROW = { type: "inertia", power: 0.3, timeConstant: 300, bounceStiffness: 300, bounceDamping: 40, restDelta: 0.5 } as const;
const DRAG_SLOP = 4;

const rubber = (over: number, dim: number) => (1 - 1 / ((over * 0.55) / dim + 1)) * dim;
/** Read live, so a change to the OS setting applies to the next move. */
const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function useCamera({ el, vw, vh, world, fit }: {
  el: RefObject<HTMLDivElement | null>; vw: number; vh: number; world: Box; fit: () => Shot;
}) {
  const x = useMotionValue(0), y = useMotionValue(0), s = useMotionValue(1);
  const [snap, setSnap] = useState<Shot>({ scale: 1, tx: 0, ty: 0 });
  const [panning, setPanning] = useState(false);
  // Where spring moves are heading, so repeated presses compound from the goal rather than mid-flight.
  const goal = useRef<Shot | null>(null);
  // True while the camera sits where the app last framed it (the user hasn't moved it since).
  const framed = useRef(true);
  const env = useRef({ vw, vh, world, fit });
  env.current = { vw, vh, world, fit };

  const minScale = () => Math.min(ZOOM_MIN, env.current.fit().scale * 0.8);
  /** Pan limits at a scale: some of the world always stays in view. */
  const bounds = (sc: number) => {
    const { vw, vh, world: w } = env.current;
    const mx = Math.min(120, vw / 3), my = Math.min(120, vh / 3);
    return { x0: mx - w.x1 * sc, x1: vw - mx - w.x0 * sc, y0: my - w.y1 * sc, y1: vh - my - w.y0 * sc };
  };
  const legal = (sh: Shot): Shot => {
    const scale = clamp(sh.scale, minScale(), ZOOM_MAX), b = bounds(scale);
    return { scale, tx: clamp(sh.tx, b.x0, b.x1), ty: clamp(sh.ty, b.y0, b.y1) };
  };
  const now = (): Shot => ({ scale: s.get(), tx: x.get(), ty: y.get() });
  const stop = () => { x.stop(); y.stop(); s.stop(); goal.current = null; };
  const set = (sh: Shot) => { s.set(sh.scale); x.set(sh.tx); y.set(sh.ty); };

  /** Move the camera with a spring (or jump, under reduced motion). */
  const fly = (sh: Shot, opts: { quick?: boolean; auto?: boolean } = {}) => {
    const t = legal(sh);
    framed.current = !!opts.auto;
    goal.current = t;
    if (reducedMotion()) { stop(); set(t); return; }
    const tr = opts.quick ? NUDGE : FLY;
    animate(s, t.scale, tr); animate(x, t.tx, tr); animate(y, t.ty, tr);
  };
  /** Zoom by a factor about a point in map coordinates (default: the centre). */
  const zoomAt = (f: number, px = env.current.vw / 2, py = env.current.vh / 2, from = now()) => {
    const scale = clamp(from.scale * f, minScale(), ZOOM_MAX), k = scale / from.scale;
    return legal({ scale, tx: px - (px - from.tx) * k, ty: py - (py - from.ty) * k });
  };
  const user = () => { framed.current = false; };

  const api = {
    x, y, s, snap, panning, framed,
    atMin: snap.scale <= minScale() + 0.001, atMax: snap.scale >= ZOOM_MAX - 0.001,
    jump: (sh: Shot) => { stop(); set(legal(sh)); framed.current = true; },
    fly,
    /** Keep the view's centre where it is when the viewport resizes. */
    shift: (dx: number, dy: number) => { const g = goal.current; stop(); set(legal({ ...now(), tx: x.get() + dx, ty: y.get() + dy })); if (g) fly({ ...g, tx: g.tx + dx, ty: g.ty + dy }); },
    zoomBy: (f: number) => { user(); const t = zoomAt(f, undefined, undefined, goal.current ?? now()); fly(t, { quick: true }); },
    panBy: (dx: number, dy: number) => { user(); const g = goal.current ?? now(); fly({ ...g, tx: g.tx + dx, ty: g.ty + dy }, { quick: true }); },
    fitAll: () => fly(env.current.fit(), { auto: true }),
  };

  // Mirror the camera into React (one update per frame) for things placed by screen position, and into --z for counter-scaling.
  useEffect(() => {
    let raf = 0;
    const sync = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setSnap(now())); };
    const z = (v: number) => { el.current?.style.setProperty("--z", String(v)); sync(); };
    z(s.get());
    const offs = [s.on("change", z), x.on("change", sync), y.on("change", sync)];
    return () => { cancelAnimationFrame(raf); offs.forEach(f => f()); };
  }, []);

  // Wheel and Safari gesture events need non-passive native listeners so the page neither scrolls nor zooms.
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const local = (cx: number, cy: number) => { const r = node.getBoundingClientRect(); return { px: cx - r.left, py: cy - r.top }; };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      stop(); user();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? env.current.vh : 1;
      let dx = e.deltaX * unit, dy = e.deltaY * unit;
      if (e.ctrlKey || e.metaKey) {
        // Pinch arrives as ctrl+wheel with small deltas; a mouse wheel with ⌘ arrives in big steps, so cap it.
        const { px, py } = local(e.clientX, e.clientY);
        set(zoomAt(Math.exp(-clamp(dy, -50, 50) * 0.01), px, py));
        return;
      }
      if (e.shiftKey && !dx) { dx = dy; dy = 0; }
      set(legal({ ...now(), tx: x.get() - dx, ty: y.get() - dy }));
    };
    let g0 = 1;
    const gStart = (e: Event) => { e.preventDefault(); stop(); user(); g0 = s.get(); };
    const gChange = (e: Event) => {
      e.preventDefault();
      const ge = e as Event & { scale: number; clientX: number; clientY: number };
      const { px, py } = local(ge.clientX, ge.clientY);
      set(zoomAt((g0 * ge.scale) / s.get(), px, py));
    };
    node.addEventListener("wheel", wheel, { passive: false });
    node.addEventListener("gesturestart", gStart);
    node.addEventListener("gesturechange", gChange);
    return () => { node.removeEventListener("wheel", wheel); node.removeEventListener("gesturestart", gStart); node.removeEventListener("gesturechange", gChange); };
  }, []);

  // Drag to pan, with momentum on release. A press that moves less than the slop stays a click.
  const drag = useRef<{ id: number; cx: number; cy: number; tx: number; ty: number; on: boolean; hist: { t: number; x: number; y: number }[] } | null>(null);
  const swallow = useRef(false);
  const handlers = {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as Element).closest("[data-cam-ignore]")) return;
      swallow.current = false;
      stop();
      drag.current = { id: e.pointerId, cx: e.clientX, cy: e.clientY, tx: x.get(), ty: y.get(), on: false, hist: [{ t: e.timeStamp, x: e.clientX, y: e.clientY }] };
    },
    onPointerMove: (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.cx, dy = e.clientY - d.cy;
      if (!d.on) {
        if (Math.hypot(dx, dy) < DRAG_SLOP) return;
        d.on = true; user(); setPanning(true);
        el.current?.setPointerCapture(e.pointerId);
      }
      // Past the edge the map resists instead of stopping dead.
      const b = bounds(s.get()), { vw, vh } = env.current;
      const band = (v: number, lo: number, hi: number, dim: number) => v < lo ? lo - rubber(lo - v, dim) : v > hi ? hi + rubber(v - hi, dim) : v;
      x.set(band(d.tx + dx, b.x0, b.x1, vw)); y.set(band(d.ty + dy, b.y0, b.y1, vh));
      d.hist.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
      while (d.hist.length > 2 && e.timeStamp - d.hist[0].t > 80) d.hist.shift();
    },
    onPointerUp: (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.id) return;
      drag.current = null;
      if (!d.on) return;
      swallow.current = true; setPanning(false);
      const a = d.hist[0], z = d.hist[d.hist.length - 1], dt = Math.max(1, e.timeStamp - a.t);
      // A hand that stopped before lifting throws nothing.
      const still = e.timeStamp - z.t > 60;
      const vx = still ? 0 : ((z.x - a.x) / dt) * 1000, vy = still ? 0 : ((z.y - a.y) / dt) * 1000;
      const b = bounds(s.get());
      if (reducedMotion()) { set(legal(now())); return; }
      animate(x, x.get(), { ...THROW, velocity: vx, min: b.x0, max: b.x1 });
      animate(y, y.get(), { ...THROW, velocity: vy, min: b.y0, max: b.y1 });
    },
    onPointerCancel: () => { if (drag.current?.on) { setPanning(false); set(legal(now())); } drag.current = null; },
    // The click that ends a drag must not open what it landed on.
    onClickCapture: (e: MouseEvent) => { if (swallow.current) { swallow.current = false; e.stopPropagation(); e.preventDefault(); } },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const step = 96;
      const k = e.key;
      if (k === "+" || k === "=") api.zoomBy(1.5);
      else if (k === "-" || k === "_") api.zoomBy(1 / 1.5);
      else if (k === "0") api.fitAll();
      else if (k === "ArrowLeft") api.panBy(step, 0);
      else if (k === "ArrowRight") api.panBy(-step, 0);
      else if (k === "ArrowUp") api.panBy(0, step);
      else if (k === "ArrowDown") api.panBy(0, -step);
      else return;
      e.preventDefault();
    },
  };

  return { ...api, handlers };
}

export type Camera = ReturnType<typeof useCamera>;
