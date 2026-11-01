/* The app: one frame holding the four views, the shared object pane, and the dump-or-ask pill.
   Space: the views are the base plane; the object pane and the dump column are both docked peers on the right.
   The dump column owns the far-right edge (it grows out of the corner pill); the pane sits just left of it, and the view compresses. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import { PROTOTYPES } from "./data";
import { Icon, IconButton, type IconName } from "./atoms";
import { useEdit } from "./edits";
import { ObjectPane, type ObjKind, type PaneNav } from "./panes";
import { CurrentHome } from "./current";
import { ColumnsDeveloped, columnsWidth } from "./columns2";
import { AtlasHosted } from "./atlas2";
import { Timeline } from "./timeline";
import { DumpOrAsk, DOCK_W, PRIOR, escapeDump, useDump, type Sees } from "./pill-study";
import "./homes.css";
import "./panes.css";
import "./pill-study.css";
import "./app-shell.css";

export const APP_W = 1360, APP_H = 820;
const EASE = [0.16, 1, 0.3, 1] as const;
const DOCK_T = { type: "spring", duration: 0.5, bounce: 0.08 } as const;

export type View = "current" | "columns" | "atlas" | "timeline";
export const VIEWS: { id: View; name: string; icon: IconName }[] = [
  { id: "current", name: "Theme sections", icon: "sections" },
  { id: "columns", name: "Columns", icon: "columns" },
  { id: "atlas", name: "Atlas", icon: "map" },
  { id: "timeline", name: "Timeline", icon: "timeline" },
];
type Obj = { kind: ObjKind; id: string };
type Layer = "pane" | "dump";

/* Pane widths. Each view has three stops: compact, wide (the view's own default) and full,
   where the view folds to a thin strip of itself. The chosen stop is remembered per view. */
type Snap = "compact" | "wide" | "full";
const SNAPS: Snap[] = ["compact", "wide", "full"];
const COMPACT = 480, PANE_MIN = 400;
/** What each view keeps at full width: Columns its rails, Current its index, Atlas and Timeline a strip. */
const STRIP: Record<View, number> = { columns: columnsWidth(undefined, undefined, true), current: 232, atlas: 180, timeline: 200 };
/** What each view keeps beside the pane by default. */
const KEEP: Record<View, number> = { columns: 0, current: 232 + 296, atlas: 420, timeline: 0 };
const TIMELINE_PANE = 560;

function paneStops(view: View, avail: number, open?: Obj, unfolded?: string): Record<Snap, number> {
  const full = avail - STRIP[view];
  const clamp = (w: number) => Math.round(Math.max(Math.min(PANE_MIN, full), Math.min(full, w)));
  const keep = view === "columns" ? columnsWidth(open?.kind, unfolded ? (unfolded.startsWith("D") ? "dump" : "signal") : undefined) : KEEP[view];
  const wide = clamp(view === "timeline" ? TIMELINE_PANE : avail - keep);
  return { compact: Math.min(wide, clamp(COMPACT)), wide, full };
}
/** The next distinct stop wider (+1) or narrower (-1) than the current width. */
function stepSnap(stops: Record<Snap, number>, w: number, dir: 1 | -1): Snap | undefined {
  const order = [...SNAPS].sort((a, b) => stops[a] - stops[b]);
  return dir > 0 ? order.find(k => stops[k] > w + 1) : [...order].reverse().find(k => stops[k] < w - 1);
}
const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** The open object's live name, for the pill's primary context chip. */
function useObjLabel(o?: Obj) {
  const th = useEdit("theory", o?.kind === "theory" ? o.id : "t1")[0].claim;
  const tm = useEdit("theme", o?.kind === "theme" ? o.id : "cost")[0].name;
  const pr = useEdit("prototype", o?.kind === "prototype" ? o.id : PROTOTYPES[0].id)[0].name;
  if (!o) return "";
  return o.kind === "theory" ? th : o.kind === "theme" ? tm : pr;
}

export function AppShell({ initial = "current" }: { initial?: View }) {
  const reduced = !!useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(initial);
  const [open, setOpenState] = useState<Obj>();
  const [unfolded, setUnfolded] = useState<string>();
  // The pane's width stop per view (in memory, for the session), the stop to restore from full, and a live drag width.
  const [snaps, setSnaps] = useState<Record<View, Snap>>({ current: "wide", columns: "wide", atlas: "wide", timeline: "wide" });
  const [restore, setRestore] = useState<Partial<Record<View, Snap>>>({});
  const [dragW, setDragW] = useState<number | null>(null);
  const { s, api } = useDump({ ctx: [], thread: PRIOR });
  // One stack of transient surfaces, most recent last: Esc closes from the end.
  const stack = useRef<Layer[]>([]);
  const push = (l: Layer) => { stack.current = [...stack.current.filter(x => x !== l), l]; };
  const drop = (l: Layer) => { stack.current = stack.current.filter(x => x !== l); };

  const openObj = (kind: ObjKind, id: string) => { setUnfolded(undefined); setOpenState(o => { if (!o) push("pane"); return { kind, id }; }); };
  const closeObj = () => { drop("pane"); setUnfolded(undefined); setOpenState(undefined); };
  useEffect(() => { if (s.open) push("dump"); else drop("dump"); }, [s.open]);

  const dumpW = s.open ? DOCK_W : 0;
  const avail = APP_W - dumpW;
  const stops = paneStops(view, avail, open, unfolded);
  const snap = snaps[view];
  const paneW = open ? (dragW ?? stops[snap]) : 0;
  const contentW = APP_W - dumpW - paneW;
  // The view folds to its strip once the pane is (or is being dragged) past halfway from wide to full.
  const compact = !!open && paneW > (stops.wide + stops.full) / 2 + 1;
  const setSnap = (k: Snap) => {
    if (k === "full" && snap !== "full") setRestore(r => ({ ...r, [view]: snap }));
    setSnaps(m => ({ ...m, [view]: k }));
  };
  const toggleFull = () => setSnap(snap === "full" ? (restore[view] ?? "wide") : "full");
  const step = (dir: 1 | -1) => { const k = stepSnap(stops, paneW, dir); if (k) setSnap(k); };
  // Keys: ⌘1–4 switch views, ⌘J toggles dump or ask, Esc closes the most recent surface first.
  const live = useRef({ s, open, unfolded, step });
  live.current = { s, open, unfolded, step };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && /^[1-4]$/.test(e.key)) { e.preventDefault(); setView(VIEWS[+e.key - 1].id); return; }
      if (mod && e.key.toLowerCase() === "j") { e.preventDefault(); live.current.s.open ? api.close() : api.open(); return; }
      // ⌘[ / ⌘] (or ⌥← / ⌥→ outside text) widen or narrow the pane by one stop, while focus is in the pane.
      const inPane = e.target instanceof Element && !!e.target.closest(".as-pane");
      if (inPane && live.current.open && ((e.metaKey && (e.key === "[" || e.key === "]")) || (e.altKey && !mod && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !isTyping(e.target)))) {
        e.preventDefault(); live.current.step(e.key === "[" || e.key === "ArrowLeft" ? 1 : -1); return;
      }
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const { s: st, open: o, unfolded: u } = live.current;
      if (st.picking || st.rec != null) { escapeDump(st, api); return; }
      const top = stack.current.at(-1);
      if (top === "dump" && st.open) { api.close(); return; }
      if (top === "pane" && o) { if (u) setUnfolded(undefined); else closeObj(); return; }
      if (u) setUnfolded(undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);

  const viewName = VIEWS.find(v => v.id === view)!.name;
  const objLabel = useObjLabel(open);
  const sees: Sees[] = open
    ? [{ label: objLabel, kind: open.kind, id: open.id, region: "pane" }, { label: viewName, kind: "screen", region: "main" }]
    : [{ label: viewName, kind: "screen", region: "main" }];

  const toggleUnfold = (id: string) => setUnfolded(u => (u === id ? undefined : id));
  const nav: PaneNav = view === "columns"
    ? { onOpen: openObj, onUnfold: (_k, id) => toggleUnfold(id), unfolded }
    : { onOpen: openObj, inline: true, unfolded, onUnfold: (_k, id) => toggleUnfold(id) };

  let body: ReactNode;
  if (view === "current") body = <CurrentHome host={{ open, onOpen: openObj, compact }} />;
  else if (view === "columns") body = <ColumnsDeveloped fold="rails" host={{ open, onOpen: (k, id) => openObj(k as ObjKind, id), onClose: closeObj, unfolded, onUnfold: setUnfolded, compact, onRestore: () => setSnap(restore[view] ?? "wide") }} />;
  else if (view === "atlas") body = <AtlasHosted open={open} onOpen={openObj} width={contentW} height={APP_H} />;
  else body = <Timeline width={contentW} height={APP_H} open={open} onOpen={openObj} />;

  const objKey = open && `${open.kind}:${open.id}`;
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [objKey]);
  const dock = reduced || dragW != null ? { duration: 0 } : DOCK_T;
  const full = snap === "full";
  const keysHint = "⌘[ wider, ⌘] narrower";

  return (
    <MotionConfig reducedMotion="user">
      <div ref={frame} className="ap as" data-pill-host="" data-view={view} data-picking={s.picking ? "" : undefined} data-dump={s.open ? "" : undefined} data-compact={compact ? "" : undefined} style={{ width: APP_W, height: APP_H }}>
        <motion.div className="as-content" data-region="main" initial={false} animate={{ width: contentW }} transition={dock}>
          <AnimatePresence initial={false}>
            <motion.div key={view} className="as-view" style={{ width: contentW }}
              initial={{ opacity: 0, scale: reduced ? 1 : 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reduced ? 1 : 1.01 }}
              transition={{ duration: 0.22, ease: EASE }}>
              {body}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* The object pane: docked, enters from the right edge and leaves the same way */}
        <AnimatePresence>
          {open && (
            <motion.aside key="pane" className="as-pane" data-region="pane" aria-label="Open object"
              initial={{ x: paneW + DOCK_W, width: paneW, right: dumpW }} animate={{ x: 0, width: paneW, right: dumpW }} exit={{ x: paneW + dumpW + 24 }}
              transition={dock}>
              <PaneEdge width={paneW} stops={stops} min={Math.min(PANE_MIN, stops.full)} label={`Resize pane (${keysHint})`}
                onDrag={setDragW} onSettle={k => { setDragW(null); setSnap(k); }} onStep={step} />
              <div className="as-pane-close">
                <IconButton icon={full ? "collapse" : "expand"} label={full ? "Restore width (⌘])" : "Full width (⌘[)"} onClick={toggleFull} />
                <IconButton icon="x" label="Close (Esc)" onClick={closeObj} />
              </div>
              <div className="as-pane-scroll ap-scroll" ref={scroller}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={objKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14, ease: "easeOut" }}>
                    <ObjectPane kind={open.kind} id={open.id} nav={nav} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* View switcher: functional chrome, floating bottom-left, opposite the pill */}
        <nav className="as-switch" aria-label="Views">
          <LayoutGroup id="as-switch">
            {VIEWS.map((v, i) => {
              const on = v.id === view;
              const label = `${v.name} (⌘${i + 1})`;
              return (
                <button key={v.id} className="as-switch-btn" aria-label={label} title={label} aria-pressed={on} onClick={() => setView(v.id)}>
                  {on && <motion.span layoutId="as-switch-on" className="as-switch-on" transition={{ type: "spring", duration: 0.3, bounce: 0.1 }} />}
                  <Icon name={v.icon} size={16} weight={on ? "fill" : "regular"} />
                </button>
              );
            })}
          </LayoutGroup>
        </nav>

        <DumpOrAsk s={s} api={api} w={APP_W} h={APP_H} frameRef={frame} sees={sees} keys={false} closeOnClickAway={false} />
      </div>
    </MotionConfig>
  );
}


/* The pane's left edge: a resize handle. A hairline and grip appear on approach; the edge follows the pointer 1:1,
   then settles with a spring on the stop nearest to where the throw was heading. Arrow keys step between stops. */
function PaneEdge({ width, stops, min, label, onDrag, onSettle, onStep }: {
  width: number; stops: Record<Snap, number>; min: number; label: string;
  onDrag: (w: number) => void; onSettle: (k: Snap) => void; onStep: (dir: 1 | -1) => void;
}) {
  const drag = useRef<{ x: number; w: number; v: number; t: number; last: number } | null>(null);
  const [active, setActive] = useState(false);
  // Past either end the edge resists, so the limit is felt rather than hit.
  const rubber = (w: number) => w > stops.full ? stops.full + (w - stops.full) * 0.2 : w < min ? min - (min - w) * 0.2 : w;
  return (
    <div className="as-pane-edge" role="separator" aria-orientation="vertical" aria-label={label} title={label} tabIndex={0}
      aria-valuemin={min} aria-valuemax={stops.full} aria-valuenow={Math.round(width)} data-active={active ? "" : undefined}
      onPointerDown={e => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, w: width, v: 0, t: e.timeStamp, last: width };
        setActive(true);
      }}
      onPointerMove={e => {
        const d = drag.current;
        if (!d) return;
        const w = d.w + (d.x - e.clientX);
        const dt = Math.max(1, e.timeStamp - d.t);
        d.v = d.v * 0.4 + ((w - d.last) / dt) * 0.6;   // px per ms, smoothed
        d.t = e.timeStamp; d.last = w;
        onDrag(rubber(w));
      }}
      onPointerUp={e => {
        const d = drag.current;
        drag.current = null; setActive(false);
        if (!d) return;
        const v = e.timeStamp - d.t > 80 ? 0 : d.v;   // a held pointer has no throw
        const aim = d.last + v * 160;   // where the throw was heading
        const k = SNAPS.reduce((a, b) => Math.abs(stops[b] - aim) < Math.abs(stops[a] - aim) ? b : a);
        e.currentTarget.releasePointerCapture(e.pointerId);
        onSettle(k);
      }}
      onPointerCancel={() => { drag.current = null; setActive(false); onSettle(SNAPS.reduce((a, b) => Math.abs(stops[b] - width) < Math.abs(stops[a] - width) ? b : a)); }}
      onKeyDown={e => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); onStep(e.key === "ArrowLeft" ? 1 : -1); }
      }}
    />
  );
}
