import { useWorld } from "../data/live";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { THEMES, THEORIES, type Theory } from "./data";
import { Icon, IconButton, Mark } from "./atoms";
import { getEdit, useEdit } from "./edits";
import { ObjectPane, ThemeName, type ObjKind, type OnOpen, type PaneNav } from "./panes";
import { inScale, themeInScale, type Scale } from "./timeline2-data";
import "./timeline2.css";

export const W = 1240, H = 760, PANE = 460;
export const SPRING = { type: "spring", stiffness: 420, damping: 38 } as const;
const EASE = [0.16, 1, 0.3, 1] as const;

export type Live = Theory & { draft: boolean };

/** Every theory in the chosen scale, with live claim / confidence / horizon from the edits store.
 *  Subscribes to all theories (a fixed list once installed) so hook order never changes with the scale. */
export function useLive(scale: Scale): Live[] {
  const {revision}=useWorld();
  const edits = THEORIES.map(t => getEdit("theory", t.id));
  const key = edits.map(e => `${e.claim}${e.confidence}${e.horizon}`).join("|");
  return useMemo(() => THEORIES.flatMap((t, i) => inScale(scale, t.id)
    ? [{ ...t, draft: !!t.draft, claim: edits[i].claim, confidence: t.draft ? null : edits[i].confidence, horizon: edits[i].horizon }]
    : []), [key, scale, revision]);
}

/** A theory's whole line of reasoning: everything it rests on, everything resting on it, and its rivals. */
export function chainOf(id: string | undefined, live: Live[]) {
  const nodes = new Set<string>(), edges: [string, string][] = [], rivals: [string, string][] = [];
  if (!id) return { nodes, edges, rivals, has: (_: string) => false };
  const by = new Map(live.map(t => [t.id, t]));
  const t0 = by.get(id);
  if (!t0) return { nodes, edges, rivals, has: (_: string) => false };
  nodes.add(id);
  const up = (x: Live) => x.follows.forEach(f => { const p = by.get(f); if (!p) return; edges.push([f, x.id]); if (!nodes.has(f)) { nodes.add(f); up(p); } });
  const down = (x: Live) => live.filter(y => y.follows.includes(x.id)).forEach(y => { edges.push([x.id, y.id]); if (!nodes.has(y.id)) { nodes.add(y.id); down(y); } });
  up(t0); down(t0);
  t0.rivals.forEach(r => { if (by.has(r)) { nodes.add(r); rivals.push([id, r]); } });
  const uniq = [...new Map(edges.map(e => [e.join(">"), e])).values()];
  return { nodes, edges: uniq, rivals, has: (x: string) => nodes.has(x) };
}

/** Direct neighbours only, for a dwell preview. */
export function neighbours(id: string | undefined, live: Live[]) {
  if (!id) return { edges: [] as [string, string][], rivals: [] as [string, string][] };
  const t = live.find(x => x.id === id);
  if (!t) return { edges: [], rivals: [] };
  const ids = new Set(live.map(x => x.id));
  return {
    edges: [...t.follows.filter(f => ids.has(f)).map(f => [f, id] as [string, string]), ...live.filter(y => y.follows.includes(id)).map(y => [id, y.id] as [string, string])],
    rivals: t.rivals.filter(r => ids.has(r)).map(r => [id, r] as [string, string]),
  };
}

export const yearsFor = (live: Live[], min = 5) => {
  const ys = live.map(t => t.horizon);
  const y0 = Math.min(2027, ...ys), y1 = Math.max(y0 + min - 1, ...ys);
  return Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i);
};

/** Hover that only becomes "hot" after a deliberate dwell. */
export function useDwell(ms = 380) {
  const [hover, setHover] = useState<string>();
  const [hot, setHot] = useState<string>();
  const t = useRef<number>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);
  return {
    hover, hot,
    enter: (id: string) => { setHover(id); clearTimeout(t.current); t.current = window.setTimeout(() => setHot(id), ms); },
    leave: (id: string) => { setHover(h => (h === id ? undefined : h)); clearTimeout(t.current); setHot(h => (h === id ? undefined : h)); },
    clear: () => { clearTimeout(t.current); setHover(undefined); setHot(undefined); },
  };
}

/* ── Theme picker: one icon button; opens a searchable list; the active theme shows as a chip beside it ── */
export function ThemePicker({ scale, live, value, onChange, mode = "filter", folded, onToggleFold }: {
  scale: Scale; live: Live[]; value?: string; onChange?: (id: string | undefined) => void;
  /** "filter" picks one theme; "lanes" toggles which lanes are open. */
  mode?: "filter" | "lanes"; folded?: Set<string>; onToggleFold?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) { setQ(""); setCursor(0); input.current?.focus({ preventScroll: true }); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [open]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    live.forEach(t => t.themes.forEach(th => m.set(th, (m.get(th) ?? 0) + 1)));
    return m;
  }, [live]);
  const all = THEMES.filter(t => themeInScale(scale, t.id) && (mode === "filter" || (counts.get(t.id) ?? 0) > 0))
    .map(t => ({ ...t, n: counts.get(t.id) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  const list = q ? all.filter(t => t.name.toLowerCase().includes(q.toLowerCase())) : all;
  const pick = (id: string) => {
    if (mode === "lanes") onToggleFold?.(id);
    else { onChange?.(value === id ? undefined : id); setOpen(false); }
  };
  return (
    <div className="t2-picker" ref={box}>
      <button className="t2-tool" aria-label={mode === "lanes" ? "Lanes" : "Theme"} title={mode === "lanes" ? "Lanes" : "Filter by theme"} aria-expanded={open} aria-pressed={open || !!value} onClick={() => setOpen(o => !o)}>
        <Icon name="theme" size={15} weight={value ? "fill" : "regular"} />
      </button>
      <AnimatePresence initial={false}>
        {value && mode === "filter" && (
          <motion.button key="chip" className="t2-active" onClick={() => onChange?.(undefined)} title="Show every theme" aria-label="Clear theme filter"
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.16, ease: EASE }}>
            <ThemeName id={value} /><span className="ap-num ap-muted">{counts.get(value) ?? 0}</span><Icon name="x" size={12} />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {open && (
          <motion.div className="t2-pop" role="dialog" aria-label="Themes" initial={{ opacity: 0, scale: 0.97, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -4 }} transition={{ duration: 0.16, ease: EASE }}>
            <label className="t2-search"><Icon name="search" size={14} />
              <input ref={input} value={q} placeholder={`${all.length} themes`} aria-label="Search themes"
                onChange={e => { setQ(e.target.value); setCursor(0); }}
                onKeyDown={e => {
                  if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
                  if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(list.length - 1, c + 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
                  if (e.key === "Enter" && list[cursor]) pick(list[cursor].id);
                }} />
            </label>
            <div className="t2-pop-list ap-scroll" role="listbox">
              {list.map((t, i) => {
                const on = mode === "lanes" ? !folded?.has(t.id) : value === t.id;
                return (
                  <button key={t.id} role="option" aria-selected={on} className="t2-pop-row" data-cursor={i === cursor ? "" : undefined} onPointerEnter={() => setCursor(i)} onClick={() => pick(t.id)}>
                    <Icon name="theme" size={13} weight={on ? "fill" : "regular"} />
                    <span className="t2-pop-name"><ThemeName id={t.id} /></span>
                    {t.n === 0 ? <Mark kind="open" /> : <span className="ap-num ap-muted">{t.n}</span>}
                  </button>
                );
              })}
              {list.length === 0 && <div className="t2-pop-empty ap-muted">No theme</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── The lens frame: the view on the left, the shared object pane docked on the right (a peer that pushes) ── */
export function LensFrame({ obj, onOpen, onClose, children, className }: {
  obj?: { kind: ObjKind; id: string }; onOpen: OnOpen; onClose: () => void; className?: string;
  children: (width: number) => ReactNode;
}) {
  const reduced = useReducedMotion();
  const [unfolded, setUnfolded] = useState<string>();
  const scroller = useRef<HTMLDivElement>(null);
  const key = obj && `${obj.kind}:${obj.id}`;
  useEffect(() => { setUnfolded(undefined); if (scroller.current) scroller.current.scrollTop = 0; }, [key]);
  const nav: PaneNav = { onOpen, inline: true, unfolded, onUnfold: (_k, id) => setUnfolded(u => (u === id ? undefined : id)) };
  const contentW = obj ? W - PANE : W;
  const t = reduced ? { duration: 0 } : { duration: 0.32, ease: EASE };
  return (
    <div className={"ap t2" + (className ? " " + className : "")} style={{ width: W, height: H }} tabIndex={-1}
      onKeyDown={e => { if (e.key === "Escape") { if (unfolded) setUnfolded(undefined); else onClose(); } }}>
      <motion.div className="t2-content" initial={false} animate={{ width: contentW }} transition={t}>{children(contentW)}</motion.div>
      <AnimatePresence>
        {obj && (
          <motion.aside key="pane" className="t2-pane" style={{ width: PANE }} initial={{ x: PANE }} animate={{ x: 0 }} exit={{ x: PANE }} transition={t}>
            <div className="t2-pane-close"><IconButton icon="x" label="Close (Esc)" onClick={onClose} /></div>
            <div className="t2-pane-scroll ap-scroll" ref={scroller}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <ObjectPane kind={obj.kind} id={obj.id} nav={nav} />
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Open-object state shared by each direction: the open theory is also the selection. */
export function useOpen() {
  const [obj, setObj] = useState<{ kind: ObjKind; id: string }>();
  const onOpen: OnOpen = (kind, id) => setObj({ kind, id });
  const close = () => setObj(undefined);
  const selected = obj?.kind === "theory" ? obj.id : undefined;
  return { obj, onOpen, close, selected };
}

/** Marks a theory carries at rest: challenge, pending suggestions, a rival. */
export function Marks({ t, rivalName }: { t: Live; rivalName?: string }) {
  return (
    <>
      {t.challenge && <Mark kind="challenge" />}
      {t.pending > 0 && <Mark kind="pending" n={t.pending} />}
      {t.rivals.length > 0 && <span className="t2-rivalmark" role="img" title={rivalName ? `Rival: ${rivalName}` : "Has a rival"} aria-label="Has a rival"><Icon name="swap" size={12} /></span>}
    </>
  );
}

/* ── Text measurement, so label layout is computed rather than guessed ── */
let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, string[]>();
/** Wrap text to a width in 13px Inter at the given weight; returns the lines. */
export function wrap(text: string, width: number, weight = 500): string[] {
  const k = `${weight}|${width}|${text}`;
  const hit = cache.get(k); if (hit) return hit;
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return [text];
  ctx.font = `${weight} 13px Inter, system-ui, sans-serif`;
  const out: string[] = [];
  let line = "";
  for (const w of text.split(" ")) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > width) { out.push(line); line = w; } else line = next;
  }
  if (line) out.push(line);
  cache.set(k, out);
  return out;
}
export function textWidth(text: string, weight = 500) {
  ctx ??= document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * 7;
  ctx.font = `${weight} 13px Inter, system-ui, sans-serif`;
  return ctx.measureText(text).width;
}
