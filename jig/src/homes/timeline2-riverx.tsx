import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Icon, Conf } from "./atoms";
import type { Scale } from "./timeline2-data";
import { H, LensFrame, Marks, ThemePicker, useLive, type Live } from "./timeline2-shared";
import { useGraph, useExpansion, visibleSet, reach, type Dir, type Graph } from "./timeline2-graph";
import { ChainView } from "./timeline2-chainview";
import { useDemoOpen, DemoButton, Trail, Chevrons, chev } from "./timeline2-chaintools";
import { Badge } from "./timeline2-fieldx";

/*
 * River, three ways to show a chain without margin rails bunching up.
 *  outline — one hop at a time: the river folds into a nested outline in time order (causes above, consequences
 *            indented below), and a "+n" on a row opens its next level in place.
 *  morph   — the outline, plus Follow chain: rows rearrange into the same layered chain layout as Field 2.
 *  trunk   — the river stays; only direct neighbours remain, joined by a single trunk in the margin with a short
 *            tick into each row. Anything further is a count on the row it runs through.
 */

export type RiverVariant = "outline" | "morph" | "trunk";
const GUT = 40, INDENT = 22, SPRING = { type: "spring", stiffness: 420, damping: 40 } as const;

export function RiverChains({ scale, variant }: { scale: Scale; variant: RiverVariant }) {
  const open = useDemoOpen();
  return (
    <LensFrame obj={open.obj} onOpen={open.onOpen} onClose={open.close} className="t2c t2x">
      {w => <RiverX scale={scale} width={w} variant={variant} open={open} />}
    </LensFrame>
  );
}

type Item = { id: string; depth: number; dir: Dir };

function RiverX({ scale, width, variant, open }: { scale: Scale; width: number; variant: RiverVariant; open: ReturnType<typeof useDemoOpen> }) {
  const reduced = useReducedMotion();
  const { selected, onOpen } = open;
  const live = useLive(scale);
  const g = useGraph(live);
  const [filter, setFilter] = useState<string>();
  const [chainOn, setChainOn] = useState(false);
  const ex = useExpansion(g, selected);
  const direct = useMemo(() => visibleSet(g, selected, []).vis, [g, selected]);
  const vis = variant === "trunk" ? direct : ex.vis;
  const rivals = selected ? (g.by.get(selected)?.rivals ?? []).filter(r => g.by.has(r)) : [];
  const wrapRef = useRef<HTMLDivElement>(null);
  const away = chainOn && !!selected;

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (chainOn) { setChainOn(false); e.stopPropagation(); return; }
    if (variant !== "trunk" && ex.pop()) e.stopPropagation();
  };
  const fromRow = (id: string) => {
    const w = wrapRef.current, el = w?.querySelector<HTMLElement>(`[data-tid="${id}"]`);
    if (!w || !el) return undefined;
    const a = el.getBoundingClientRect(), b = w.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top };
  };

  const badgeOf = (id: string) => {
    if (variant !== "trunk") { const b = ex.badge(id); return b ? { ...b, act: true } : null; }
    const v = vis.get(id);
    if (!v || v.dir === 0) return null;
    const n = [...reach(g, id, v.dir)].filter(x => !vis.has(x)).length;
    return n ? { n, dir: v.dir, act: false } : null;
  };
  const badge = (id: string) => { const b = badgeOf(id); return b ? <Badge n={b.n} dir={b.dir} open={"open" in b ? b.open : undefined} act={b.act} axis="y" onClick={() => ex.toggle(id)} /> : null; };

  return (
    <div className="t2r-wrap" ref={wrapRef} onKeyDown={onKey}>
      <div className="t2c-bar">
        <ThemePicker scale={scale} live={live} value={filter} onChange={setFilter} />
        <DemoButton open={open} onReset={() => { setChainOn(false); ex.reset(); }} />
        {variant === "morph" && selected && (
          <button className="t2-tool" aria-label="Follow chain" title="Follow chain (Esc to return)" aria-pressed={chainOn} onClick={() => setChainOn(c => !c)}>
            <Icon name="chain" size={15} weight={chainOn ? "fill" : "regular"} />
          </button>
        )}
        {variant !== "trunk" && !away && <Trail g={g} exp={ex.exp} vis={ex.vis} onCollapse={ex.toggle} axis="y" />}
      </div>
      <motion.div className="t2r-body" initial={false} animate={{ opacity: away ? 0 : 1 }} transition={{ duration: reduced ? 0 : 0.2, delay: away ? 0.05 : 0.25 }} style={{ pointerEvents: away ? "none" : undefined }}>
        <LayoutGroup id={`river-${variant}`}>
          {selected && variant !== "trunk"
            ? <Outline g={g} sel={selected} vis={ex.vis} rivals={rivals} badge={badge} onOpen={onOpen} />
            : <Flow g={g} live={live} filter={filter} sel={selected} vis={vis} rivals={rivals} badge={badge} onOpen={onOpen} trunk={variant === "trunk"} />}
        </LayoutGroup>
      </motion.div>
      <AnimatePresence>
        {away && selected && <ChainView key={`chain${selected}`} g={g} sel={selected} width={width} height={H} from={fromRow} onOpen={onOpen} />}
      </AnimatePresence>
    </div>
  );
}

/* ── one row: year, confidence, claim, marks; shared by the river and the outline so rows morph between them ── */
function Row({ t, sel, lead, indent = 0, year, after, onOpen }: {
  t: Live; sel?: boolean; lead?: ReactNode; indent?: number; year?: boolean; after?: ReactNode; onOpen: (k: "theory", id: string) => void;
}) {
  return (
    <motion.div layout="position" layoutId={t.id} className="t2r-row" data-tid={t.id} data-sel={sel ? "" : undefined} data-draft={t.draft ? "" : undefined}
      style={{ paddingLeft: indent }} transition={SPRING}>
      {lead !== undefined && <span className="t2r-lead">{lead}</span>}
      <button className="t2r-main" data-year={year ? "" : undefined} aria-label={t.claim} onClick={() => onOpen("theory", t.id)}>
        {year && <span className="ap-num ap-muted t2r-year">{t.horizon}</span>}
        <span className="t2c-conf">{t.draft ? <i className="t2c-ring" aria-label="Draft: no confidence yet" title="Draft: no confidence yet" /> : <Conf n={t.confidence} />}</span>
        <span className="t2c-claim">{t.claim}</span>
        <span className="t2c-marks"><Marks t={{ ...t, rivals: [] }} /></span>
      </button>
      {after}
    </motion.div>
  );
}

const RivalChip = ({ r, onOpen }: { r: Live; onOpen: (k: "theory", id: string) => void }) => (
  <button className="t2c-rival t2r-rival" onClick={() => onOpen("theory", r.id)} title={`Rival, ${r.horizon}`}>
    <Icon name="swap" size={12} /><span className="t2c-rival-claim">{r.claim}</span><span className="ap-num ap-muted">{r.horizon}</span>
  </button>
);

/* ── Outline: the selected theory, causes above, consequences nested below, each level in time order ── */
function Outline({ g, sel, vis, rivals, badge, onOpen }: {
  g: Graph; sel: string; vis: Map<string, { dir: Dir; depth: number; parent?: string }>; rivals: string[];
  badge: (id: string) => ReactNode; onOpen: (k: "theory", id: string) => void;
}) {
  const items: Item[] = [];
  const kids = (id: string, dir: Dir) => [...vis.entries()].filter(([, v]) => v.parent === id && v.dir === dir).map(([k]) => k)
    .sort((a, b) => g.by.get(a)!.horizon - g.by.get(b)!.horizon || (g.by.get(b)!.confidence ?? 0) - (g.by.get(a)!.confidence ?? 0));
  const up = (id: string) => { kids(id, -1).forEach(up); if (id !== sel) items.push({ id, depth: vis.get(id)!.depth, dir: -1 }); };
  const down = (id: string) => { if (id !== sel) items.push({ id, depth: vis.get(id)!.depth, dir: 1 }); kids(id, 1).forEach(down); };
  kids(sel, -1).forEach(up);
  items.push({ id: sel, depth: 0, dir: 0 });
  kids(sel, 1).forEach(down);
  // Causes nest outward above the selection: the furthest cause is the most indented.
  return (
    <div className="t2r-scroll ap-scroll">
      <div className="t2r-list" data-outline="">
        {items.map(it => {
          const t = g.by.get(it.id)!;
          const glyph = it.dir === 0 ? null : <Icon name={it.dir === 1 ? "elbowDown" : "elbowUp"} size={13} />;
          return (
            <Row key={it.id} t={t} sel={it.id === sel} year indent={it.depth * INDENT} lead={glyph} onOpen={onOpen}
              after={<span className="t2r-after">{it.id === sel ? rivals.map(r => <RivalChip key={r} r={g.by.get(r)!} onOpen={onOpen} />) : badge(it.id)}</span>} />
          );
        })}
      </div>
    </div>
  );
}

/* ── Flow: the river itself, year sections, sorted by confidence; in trunk mode only direct neighbours stay ── */
function Flow({ g, live, filter, sel, vis, rivals, badge, onOpen, trunk }: {
  g: Graph; live: Live[]; filter?: string; sel?: string; vis: Map<string, { dir: Dir; depth: number }>; rivals: string[];
  badge: (id: string) => ReactNode; onOpen: (k: "theory", id: string) => void; trunk: boolean;
}) {
  const on = (id: string) => !sel || vis.has(id);
  const shown = live.filter(t => (!filter || t.themes.includes(filter) || vis.has(t.id)) && on(t.id));
  const years = [...new Set(shown.map(t => t.horizon))].sort((a, b) => a - b);
  const sorted = (y: number) => shown.filter(t => t.horizon === y).sort((a, b) => Number(a.draft) - Number(b.draft) || (b.confidence ?? 0) - (a.confidence ?? 0));
  const all = (y: number) => live.filter(t => t.horizon === y && (!filter || t.themes.includes(filter))).length;
  const list = useRef<HTMLDivElement>(null);
  const [mids, setMids] = useState<Map<string, number>>(new Map());
  useLayoutEffect(() => {
    const l = list.current; if (!l || !sel || !trunk) return;
    // offsetTop ignores the transforms of rows still settling, so the trunk lands where rows end up.
    const m = new Map<string, number>();
    l.querySelectorAll<HTMLElement>("[data-tid]").forEach(el => m.set(el.dataset.tid!, el.offsetTop + 16));
    setMids(m);
  }, [sel, trunk, shown.map(t => t.id).join(), filter]);

  const trunkSvg = sel && trunk && mids.has(sel) ? (() => {
    const ys = [...vis.keys()].filter(id => mids.has(id)).map(id => ({ id, y: mids.get(id)!, dir: vis.get(id)!.dir }));
    const y0 = Math.min(...ys.map(r => r.y)), y1 = Math.max(...ys.map(r => r.y)), x = 18, end = GUT - 2, sy = mids.get(sel)!;
    const hasCause = ys.some(r => r.dir === -1);
    return (
      <svg className="t2c-rails" width={GUT} height={y1 + 20} aria-hidden>
        <Chevrons />
        <path className="t2-link" d={`M ${x} ${y0} V ${y1}`} />
        {ys.filter(r => r.id !== sel).map(r => (
          <path key={r.id} className="t2-link" d={`M ${x} ${r.y} H ${end}`} markerEnd={r.dir === 1 ? chev("ink") : undefined} />
        ))}
        <path className="t2-link" d={`M ${x} ${sy} H ${end}`} markerEnd={hasCause ? chev("ink") : undefined} />
        <circle cx={x} cy={sy} r={3.5} className="t2r-knob" />
      </svg>
    );
  })() : null;

  return (
    <div className="t2r-scroll ap-scroll">
      <div className="t2r-list" ref={list} style={{ paddingLeft: GUT }}>
        {years.map(y => (
          <section key={y} className="t2c-year">
            <h3 className="t2c-yhead"><span className="ap-num">{y}</span>
              <span className="ap-num ap-muted">{sel ? `${sorted(y).length} of ${all(y)}` : sorted(y).length}</span></h3>
            {sorted(y).map(t => {
              const rs = sel ? (sel === t.id ? rivals : []) : t.rivals.filter(r => g.by.has(r));
              return (
                <Row key={t.id} t={t} sel={sel === t.id} onOpen={onOpen}
                  after={<span className="t2r-after">{rs.map(r => <RivalChip key={r} r={g.by.get(r)!} onOpen={onOpen} />)}{sel && sel !== t.id && badge(t.id)}</span>} />
              );
            })}
          </section>
        ))}
        {trunkSvg}
      </div>
    </div>
  );
}
