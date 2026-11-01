import { TooltipButton } from "./tooltip";
/* The app: one frame holding the four views, the shared object pane, and the dump-or-ask pill.
   Space: the views are the base plane; the object pane and the dump column are both docked peers on the right.
   The dump column owns the far-right edge (it grows out of the corner pill); the pane sits just left of it, and the view compresses. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "motion/react";
import { DUMPS, PROTOTYPES } from "./data";
import { Icon, IconButton, type IconName } from "./atoms";
import { useEdit } from "./edits";
import { ObjectPane, type ObjKind, type PaneNav } from "./panes";
import { CurrentHome } from "./current";
import { ColumnsDeveloped, columnsWidth } from "./columns2";
import { AtlasHosted } from "./atlas2";
import { TimelineHosted } from "./timeline-app";
import { DumpOrAsk, DOCK_W, PRIOR, escapeDump, useDump, type Sees } from "./pill-study";
import { BriefingView } from "./briefing-app";
import { DumpLog, useDumpLog, useLogFromDump } from "./dump-log";
import "./homes.css";
import "./panes.css";
import "./pill-study.css";
import "./app-shell.css";
import { useWorld, clearError, labelFor, rowFor, act, loadObject, refresh, markRead } from "../data/live";
import { flushEdit, failedEditsCount, retryFailedEdits } from "./edits";
import { DialogHost, findObjects, createObject } from "../app/dialogs";
import "../app/production.css";
import "../app/hit-areas.css";
import "./surface-patterns.css";

export const APP_W = 1360, APP_H = 820;
const EASE = [0.16, 1, 0.3, 1] as const;
const DOCK_T = { type: "spring", duration: 0.5, bounce: 0.08 } as const;

export type View = "current" | "columns" | "atlas" | "timeline" | "briefing";
export const VIEWS: { id: View; name: string; icon: IconName }[] = [
  { id: "current", name: "Theme sections", icon: "sections" },
  { id: "columns", name: "Columns", icon: "columns" },
  { id: "atlas", name: "Atlas", icon: "map" },
  { id: "timeline", name: "Timeline", icon: "timeline" },
  { id: "briefing", name: "Briefing", icon: "briefing" },
];
type Obj = { kind: ObjKind; id: string };
type Layer = "pane" | "dump" | "log";

/* Pane widths. Each view has four stops: compact, half (pane and view share the width evenly), wide (the view's own
   default) and full, where the view folds to a thin strip of itself. The chosen stop is remembered per view. */
type Snap = "compact" | "half" | "wide" | "full";
const SNAPS: Snap[] = ["compact", "half", "wide", "full"];
const SNAP_NAME: Record<Snap, string> = { compact: "Compact", half: "Half", wide: "Wide", full: "Full" };
/** Merge threshold (px). When half lands this close to compact, half wins and compact is dropped (d-half-vs-compact);
 *  when it lands this close to wide or full, half merges into that stop. */
const MERGE = 40;
const COMPACT = 480, PANE_MIN = 400;
/** What each view keeps at full width: Columns its rails, Current its index, Atlas and Timeline a strip. */
const STRIP: Record<View, number> = { columns: columnsWidth(undefined, undefined, true), current: 232, atlas: 180, timeline: 200, briefing: 240 };
/** What each view keeps beside the pane by default. */
const KEEP: Record<View, number> = { columns: 0, current: 232 + 296, atlas: 420, timeline: 0, briefing: 560 };
const TIMELINE_PANE = 560;

function paneStops(view: View, avail: number, open?: Obj, unfolded?: string): Record<Snap, number> {
  const full = avail - STRIP[view];
  const clamp = (w: number) => Math.round(Math.max(Math.min(PANE_MIN, full), Math.min(full, w)));
  const keep = view === "columns" ? columnsWidth(open?.kind, unfolded ? (DUMPS.some(d => d.id === unfolded) ? "dump" : "signal") : undefined) : KEEP[view];
  const wide = clamp(view === "timeline" ? TIMELINE_PANE : avail - keep);
  const compact = Math.min(wide, clamp(COMPACT));
  const even = clamp(avail / 2);
  // Half wins over compact: compact takes half's width and drops out of the order.
  if (Math.abs(compact - even) < MERGE) return { compact: even, half: even, wide, full };
  const near = [wide, full].find(w => Math.abs(w - even) < MERGE);
  return { compact, half: near ?? even, wide, full };
}
/** The distinct stops, narrowest first. Compact drops out when it merged into half; half drops out when it merged
 *  into wide or full. */
function snapOrder(stops: Record<Snap, number>): Snap[] {
  const keys = SNAPS.filter(k => k === "compact" ? stops.compact !== stops.half : k !== "half" || stops.half === stops.compact || ![stops.wide, stops.full].includes(stops.half));
  return keys.sort((a, b) => stops[a] - stops[b]);
}
/** The stop nearest a width. */
const nearestSnap = (stops: Record<Snap, number>, w: number) => snapOrder(stops).reduce((a, b) => Math.abs(stops[b] - w) < Math.abs(stops[a] - w) ? b : a);
/** The next distinct stop wider (+1) or narrower (-1) than the current width. */
function stepSnap(stops: Record<Snap, number>, w: number, dir: 1 | -1): Snap | undefined {
  const order = snapOrder(stops);
  return dir > 0 ? order.find(k => stops[k] > w + 1) : [...order].reverse().find(k => stops[k] < w - 1);
}
const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** The open object's live name, for the pill's primary context chip. */
function useObjLabel(o?: Obj) { return o ? labelFor(o.kind,o.id) : ""; }
const stateFromUrl = () => {
  const params = new URLSearchParams(location.search);
  const view = params.get("view") as View | null;
  const value = params.get("open");
  const colon = value?.indexOf(":") ?? -1;
  const kind = value?.slice(0,colon) as ObjKind;
  return {view: VIEWS.some(v=>v.id===view) ? view! : "current" as View, open: value && colon>0 && ["theme","theory","prototype"].includes(kind) ? {kind,id:value.slice(colon+1)} : undefined};
};

export function AppShell({ initial = "current" }: { initial?: View }) {
  const { error, loading, revision } = useWorld();
  const [size,setSize] = useState({w:window.innerWidth,h:window.innerHeight});
  const APP_W = size.w, APP_H = size.h;
  const phone = APP_W < 640;
  useEffect(()=>{ const resize=()=>setSize({w:window.innerWidth,h:window.innerHeight}); window.addEventListener("resize",resize); return ()=>window.removeEventListener("resize",resize); },[]);
  const reduced = !!useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(()=>window.innerWidth<640 ? "briefing" : stateFromUrl().view ?? initial);
  const [open, setOpenState] = useState<Obj|undefined>(()=>stateFromUrl().open);
  const [unfolded, setUnfolded] = useState<string>();
  // The pane's width stop per view (in memory, for the session), the stop to restore from full, and a live drag width.
  const [snaps, setSnaps] = useState<Record<View, Snap>>({ current: "wide", columns: "wide", atlas: "wide", timeline: "wide", briefing: "wide" });
  const [restore, setRestore] = useState<Partial<Record<View, Snap>>>({});
  const [dragW, setDragW] = useState<number | null>(null);
  const { s, api } = useDump({ ctx: [], thread: [] });
  // Dumps are opened from Briefing or the keyboard, independently of capture.
  const dumpLog = useDumpLog();

  const [logOpen, setLogOpenState] = useState(false);
  const logReturnFocus = useRef<HTMLElement | null>(null);
  // One stack of transient surfaces, most recent last: Esc closes from the end.
  const stack = useRef<Layer[]>([]);
  const push = (l: Layer) => { stack.current = [...stack.current.filter(x => x !== l), l]; };
  const drop = (l: Layer) => { stack.current = stack.current.filter(x => x !== l); };

  const openObj = (kind: ObjKind, id: string) => { setUnfolded(undefined);push("pane");setOpenState({kind,id}); if(rowFor(kind,id)?.seenAt===null||rowFor(kind,id)?.seen_at===null)act("markSeen",{kind,id}); };
  useEffect(()=>{if(open)push("pane");},[]);
  const closeObj = () => { drop("pane"); setUnfolded(undefined); setOpenState(undefined); };
  useEffect(() => { if (s.open) push("dump"); else drop("dump"); }, [s.open]);
  const setLogOpen = (o: boolean) => {
    if (o) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body && !active.closest('.ps-log')) logReturnFocus.current = active;
      push("log");
    } else drop("log");
    setLogOpenState(o);
  };
  // Opening the dump column closes the log; the log never sits over the open column.
  useEffect(() => { if (s.open && logOpen) setLogOpen(false); }, [s.open]);
  // A click anywhere outside the log (other than its own toggle) closes it.
  useEffect(() => {
    if (!logOpen) return;
    const down = (e: PointerEvent) => { const t = e.target as Element; if(document.querySelector(".ab-dialog"))return; if (!t.closest(".ps-log, [data-log-toggle]")) setLogOpen(false); };
    window.addEventListener("pointerdown", down, true);
    return () => window.removeEventListener("pointerdown", down, true);
  }, [logOpen]);

  useEffect(()=>{
    const openEvent=(e: Event)=>{ const {kind,id,unfolded}=(e as CustomEvent).detail; openObj(kind,id);if(unfolded){setUnfolded(unfolded);if(rowFor("signal",unfolded))markRead("signal",unfolded);} };
    const closeEvent=()=>closeObj();
    const browseEvent=(e:Event)=>{const {kind,id}=(e as CustomEvent).detail;closeObj();setView("columns");setUnfolded(id);if(kind==="signal")markRead("signal",id);};
    const pop=()=>{ const state=stateFromUrl(); setView(phone ? "briefing" : state.view); setOpenState(state.open); };
    const blur=()=>flushEdit();
    const find=(e: KeyboardEvent)=>{ if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k") {e.preventDefault(); void findObjects();} };
    window.addEventListener("aber:browse",browseEvent);window.addEventListener("aber:open",openEvent); window.addEventListener("aber:close",closeEvent);window.addEventListener("popstate",pop);window.addEventListener("keydown",find);document.addEventListener("focusout",blur);
    return ()=>{window.removeEventListener("aber:browse",browseEvent);window.removeEventListener("aber:open",openEvent);window.removeEventListener("aber:close",closeEvent);window.removeEventListener("popstate",pop);window.removeEventListener("keydown",find);document.removeEventListener("focusout",blur);};
  },[phone]);
  useEffect(()=>{
    const params=new URLSearchParams(location.search); params.set("view",phone?"briefing":view); if(open)params.set("open",`${open.kind}:${open.id}`);else params.delete("open");
    const url=`${location.pathname}?${params}`;if(url!==location.pathname+location.search) history.pushState({},"",url);
  },[view,open?.kind,open?.id,phone]);
  useEffect(()=>{ if(phone && view!=="briefing")setView("briefing"); },[phone,view]);
  useEffect(()=>{ if(open && !loading && !rowFor(open.kind,open.id)) closeObj(); },[revision]);
  useEffect(()=>{if(open)void loadObject(open.kind,open.id);},[open?.kind,open?.id]);
  const dumpW = s.open ? (phone ? APP_W : DOCK_W) : 0;
  const avail = APP_W - dumpW;
  const stops = paneStops(view, avail, open, unfolded);
  const snap = snaps[view];
  const paneW = open ? (phone ? APP_W : (dragW ?? stops[snap])) : 0;
  const contentW = Math.max(0, APP_W - dumpW - (phone ? 0 : paneW));
  // The view folds to its strip once the pane is (or is being dragged) past halfway from wide to full.
  const compact = !!open && paneW > (stops.wide + stops.full) / 2 + 1;
  const setSnap = (k: Snap) => {
    if (k === "full" && snap !== "full") setRestore(r => ({ ...r, [view]: snap }));
    setSnaps(m => ({ ...m, [view]: k }));
  };
  const toggleFull = () => setSnap(snap === "full" ? (restore[view] ?? "wide") : "full");
  const step = (dir: 1 | -1) => { const k = stepSnap(stops, paneW, dir); if (k) setSnap(k); };
  // Keys: ⌘1–4 switch views, ⌘J toggles dump or ask, Esc closes the most recent surface first.
  const live = useRef({ s, open, unfolded, step, logOpen });
  live.current = { s, open, unfolded, step, logOpen };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if(document.querySelector(".ab-dialog"))return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && /^[1-5]$/.test(e.key)) { e.preventDefault(); if (!phone) setView(VIEWS[+e.key - 1].id); return; }
      if (mod && e.shiftKey && e.key.toLowerCase() === "l") { e.preventDefault(); if (live.current.s.open) api.close(); setLogOpen(!live.current.logOpen); return; }
      if (mod && e.key.toLowerCase() === "j") { e.preventDefault(); live.current.s.open ? api.close() : api.open(); return; }
      // ⌘[ / ⌘] (or ⌥← / ⌥→ outside text) widen or narrow the pane by one stop, while focus is in the pane.
      const inPane = e.target instanceof Element && !!e.target.closest(".as-pane");
      if (inPane && live.current.open && ((e.metaKey && (e.key === "[" || e.key === "]")) || (e.altKey && !mod && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !isTyping(e.target)))) {
        e.preventDefault(); live.current.step(e.key === "[" || e.key === "ArrowLeft" ? 1 : -1); return;
      }
      if((inPane||stack.current.at(-1)==="pane")&&!live.current.s.picking&&live.current.s.rec==null&&!mod&&!e.altKey&&!e.shiftKey&&!isTyping(e.target)&&live.current.open&&["a","x"].includes(e.key.toLowerCase())){
        const object=live.current.open,row=rowFor(object.kind,object.id);
        if(row&&(row.status==="draft"||row.draft)){e.preventDefault();act(e.key.toLowerCase()==="a"?"acceptDraft":"discardDraft",{kind:object.kind,id:object.id});return;}
      }
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const { s: st, open: o, unfolded: u } = live.current;
      if (st.picking || st.rec != null) { escapeDump(st, api); return; }
      const top = stack.current.at(-1);
      if (top === "log" && live.current.logOpen) { setLogOpen(false); (logReturnFocus.current?.isConnected ? logReturnFocus.current : frame.current?.querySelector<HTMLElement>(".ps-pill"))?.focus({ preventScroll: true }); return; }
      if (top === "dump" && st.open) { api.close(); return; }
      if (top === "pane" && o) { const timelineEscape=new Event("aber:timeline-escape",{cancelable:true});if(frame.current?.dataset.view==="timeline"){window.dispatchEvent(timelineEscape);if(timelineEscape.defaultPrevented)return;} if (u) setUnfolded(undefined); else closeObj(); return; }
      if (u) setUnfolded(undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api,phone]);

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
  else if (view === "briefing") body = <BriefingView host={{ open, onOpen: openObj, compact, onLog: () => setLogOpen(true) }} phone={phone} />;
  else if (view === "atlas") body = <AtlasHosted open={open} onOpen={openObj} width={contentW} height={APP_H} mapStyle="circles" treatment="paper" signals="zoom" />;
  else body = <TimelineHosted width={contentW} height={APP_H} open={open} onOpen={openObj} compact={compact} />;

  const objKey = open && `${open.kind}:${open.id}`;
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [objKey]);
  const dock = reduced || dragW != null ? { duration: 0 } : DOCK_T;
  const full = snap === "full";
  const keysHint = "⌘[ wider, ⌘] narrower";

  return (
    <MotionConfig reducedMotion="user">
      <div ref={frame} className="ap as ab-production" data-phone={phone ? "" : undefined} data-pill-host="" data-view={view} data-picking={s.picking ? "" : undefined} data-dump={s.open ? "" : undefined} data-compact={compact ? "" : undefined} style={{ width: APP_W, height: APP_H }}>
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
                valueText={dragW == null ? `${SNAP_NAME[snap]} width` : `${Math.round(dragW)} pixels`}
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
        {!phone && <nav className="as-switch" aria-label="Views">
          <LayoutGroup id="as-switch">
            {VIEWS.map((v, i) => {
              const on = v.id === view;
              const label = `${v.name} (⌘${i + 1})`;
              return (
                <TooltipButton key={v.id} className="as-switch-btn" aria-label={label} tooltip={label} aria-pressed={on} onClick={() => setView(v.id)}>
                  {on && <motion.span layoutId="as-switch-on" className="as-switch-on" transition={{ type: "spring", duration: 0.3, bounce: 0.1 }} />}
                  <Icon name={v.icon} size={16} weight={on ? "fill" : "regular"} />
                </TooltipButton>
              );
            })}
          </LayoutGroup>
        </nav>}
        {error && <div role="alert" className="ab-error">{error}<button onClick={()=>{clearError();void (failedEditsCount()?retryFailedEdits():refresh());}}>{failedEditsCount()?"Retry saving":"Retry"}</button><TooltipButton onClick={clearError} aria-label="Dismiss error"><Icon name="x" size={14}/></TooltipButton></div>}
        {loading && <div className="ab-loading" role="status">Loading Aber…</div>}
        <DialogHost/>
        <DumpOrAsk s={s} api={api} w={APP_W} h={APP_H} frameRef={frame} sees={sees} keys={false} closeOnClickAway={false}
          log={{ open: logOpen, onToggle: () => setLogOpen(!logOpen), status: logStatus(dumpLog.entries),
            panel: <DumpLog entries={dumpLog.entries} bin={dumpLog.bin} api={dumpLog.api} onClose={() => setLogOpen(false)} /> }} />
      </div>
    </MotionConfig>
  );
}


/** The pill's log segment carries a dot while a dump is still processing, red when one failed. */
export const logStatus = (es: { status: string }[]) => es.some(e => e.status === "failed") ? "failed" as const : es.some(e => e.status === "processing") ? "processing" as const : undefined;

/* The pane's left edge: a resize handle. A hairline and grip appear on approach; the edge follows the pointer 1:1,
   then settles with a spring on the stop nearest to where the throw was heading. Arrow keys step between stops. */
function PaneEdge({ width, stops, min, label, valueText, onDrag, onSettle, onStep }: {
  width: number; stops: Record<Snap, number>; min: number; label: string; valueText: string;
  onDrag: (w: number) => void; onSettle: (k: Snap) => void; onStep: (dir: 1 | -1) => void;
}) {
  const drag = useRef<{ x: number; w: number; v: number; t: number; last: number } | null>(null);
  const [active, setActive] = useState(false);
  // Past either end the edge resists, so the limit is felt rather than hit.
  const rubber = (w: number) => w > stops.full ? stops.full + (w - stops.full) * 0.2 : w < min ? min - (min - w) * 0.2 : w;
  return (
    <div className="as-pane-edge" role="separator" aria-orientation="vertical" aria-label={label} title={label} tabIndex={0}
      aria-valuemin={min} aria-valuemax={stops.full} aria-valuenow={Math.round(width)} aria-valuetext={valueText} data-active={active ? "" : undefined}
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
        const k = nearestSnap(stops, aim);
        e.currentTarget.releasePointerCapture(e.pointerId);
        onSettle(k);
      }}
      onPointerCancel={() => { drag.current = null; setActive(false); onSettle(nearestSnap(stops, width)); }}
      onKeyDown={e => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); onStep(e.key === "ArrowLeft" ? 1 : -1); }
      }}
    />
  );
}
