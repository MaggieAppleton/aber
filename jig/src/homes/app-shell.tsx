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
import { ColumnsDeveloped } from "./columns2";
import { AtlasHosted } from "./atlas2";
import { Timeline } from "./timeline";
import { DumpOrAsk, DOCK_W, PRIOR, escapeDump, useDump, type Sees } from "./pill-study";
import "./homes.css";
import "./panes.css";
import "./pill-study.css";
import "./app-shell.css";

export const APP_W = 1360, APP_H = 820;
const PANE_W = 560, PANE_W_BESIDE = 500;
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
  const { s, api } = useDump({ ctx: [], thread: PRIOR });
  // One stack of transient surfaces, most recent last: Esc closes from the end.
  const stack = useRef<Layer[]>([]);
  const push = (l: Layer) => { stack.current = [...stack.current.filter(x => x !== l), l]; };
  const drop = (l: Layer) => { stack.current = stack.current.filter(x => x !== l); };

  const openObj = (kind: ObjKind, id: string) => { setUnfolded(undefined); setOpenState(o => { if (!o) push("pane"); return { kind, id }; }); };
  const closeObj = () => { drop("pane"); setUnfolded(undefined); setOpenState(undefined); };
  useEffect(() => { if (s.open) push("dump"); else drop("dump"); }, [s.open]);

  // Keys: ⌘1–4 switch views, ⌘J toggles dump or ask, Esc closes the most recent surface first.
  const live = useRef({ s, open, unfolded });
  live.current = { s, open, unfolded };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && /^[1-4]$/.test(e.key)) { e.preventDefault(); setView(VIEWS[+e.key - 1].id); return; }
      if (mod && e.key.toLowerCase() === "j") { e.preventDefault(); live.current.s.open ? api.close() : api.open(); return; }
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

  const dumpW = s.open ? DOCK_W : 0;
  const paneW = open ? (s.open ? PANE_W_BESIDE : PANE_W) : 0;
  const contentW = APP_W - dumpW - paneW;
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
  if (view === "current") body = <CurrentHome host={{ open, onOpen: openObj }} />;
  else if (view === "columns") body = <ColumnsDeveloped fold="rails" host={{ open, onOpen: (k, id) => openObj(k as ObjKind, id), onClose: closeObj, unfolded, onUnfold: setUnfolded }} />;
  else if (view === "atlas") body = <AtlasHosted open={open} onOpen={openObj} width={contentW} height={APP_H} />;
  else body = <Timeline width={contentW} height={APP_H} open={open} onOpen={openObj} />;

  const objKey = open && `${open.kind}:${open.id}`;
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [objKey]);
  const dock = reduced ? { duration: 0 } : DOCK_T;

  return (
    <MotionConfig reducedMotion="user">
      <div ref={frame} className="ap as" data-pill-host="" data-view={view} data-picking={s.picking ? "" : undefined} data-dump={s.open ? "" : undefined} style={{ width: APP_W, height: APP_H }}>
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
              initial={{ x: PANE_W + DOCK_W, width: paneW, right: dumpW }} animate={{ x: 0, width: paneW, right: dumpW }} exit={{ x: PANE_W + dumpW + 24 }}
              transition={dock}>
              <div className="as-pane-close"><IconButton icon="x" label="Close (Esc)" onClick={closeObj} /></div>
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

