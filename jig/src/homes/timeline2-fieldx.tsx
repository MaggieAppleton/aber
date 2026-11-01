import { useMemo, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon, Conf } from "./atoms";
import type { Scale } from "./timeline2-data";
import { H, SPRING, LensFrame, Marks, ThemePicker, useDwell, useLive, wrap, textWidth, yearsFor, type Live } from "./timeline2-shared";
import { useGraph, useExpansion, visibleSet, reach, type Dir } from "./timeline2-graph";
import { ChainView } from "./timeline2-chainview";
import { useDemoOpen, DemoButton, Trail, Chevrons, chev } from "./timeline2-chaintools";

/*
 * Field, three ways to show a chain without the tangle.
 *  hop    — one hop at a time: direct causes and consequences, each with a "+n" badge that opens the next level.
 *  morph  — hop, plus "Follow chain": the field rearranges into a layered chain and back.
 *  bundle — direct links only, bundled along the row lanes; anything further is a count on the theory it runs through.
 * In every variant labels sit on their own dots: they truncate (full text on dwell) rather than move.
 */

export type FieldVariant = "hop" | "morph" | "bundle";
const TOP = 72, LEFT = 74, RIGHT = 12, BOTTOM = 12, LINE = 17, PAD = 8, MIN_ROW = 30, DOT = 10, TAG_H = 18, TAG_MAX = 230, VLINE = 30, GAP = 6, APPROACH = 22, JOG = 19;
type Mode = "full" | "line" | "dots";
type Place = { x: number; y: number; cx: number; cy: number; lines: string[] };
type Box = { x: number; y: number; w: number; h: number };
type Tag = { id: string; side: "r" | "l"; x: number; w: number; cut: boolean };

export function FieldChains({ scale, variant }: { scale: Scale; variant: FieldVariant }) {
  const open = useDemoOpen();
  return (
    <LensFrame obj={open.obj} onOpen={open.onOpen} onClose={open.close} className="t2a t2x">
      {w => <Plot scale={scale} width={w} variant={variant} open={open} />}
    </LensFrame>
  );
}

function Plot({ scale, width, variant, open }: { scale: Scale; width: number; variant: FieldVariant; open: ReturnType<typeof useDemoOpen> }) {
  const reduced = useReducedMotion();
  const { selected, onOpen } = open;
  const live = useLive(scale);
  const g = useGraph(live);
  const [filter, setFilter] = useState<string>();
  const [chainOn, setChainOn] = useState(false);
  const dwell = useDwell(300);
  const ex = useExpansion(g, selected);
  // Bundle shows direct links only; deeper theories become counts.
  const direct = useMemo(() => visibleSet(g, selected, []).vis, [g, selected]);
  const vis = variant === "bundle" ? direct : ex.vis;
  const rivals = selected ? (g.by.get(selected)?.rivals ?? []).filter(r => g.by.has(r)) : [];
  const isVis = (id: string) => vis.has(id) || rivals.includes(id);
  const edges = useMemo(() => variant === "bundle" ? [...vis.keys()].flatMap(id => g.next(id, 1).filter(n => vis.has(n) && (id === selected || n === selected)).map(n => [id, n] as [string, string])) : ex.edges, [variant, vis, ex.edges, selected]);

  const years = yearsFor(live);
  const colW = (width - LEFT - RIGHT) / years.length;
  const labelW = colW - 12 - 6 - DOT - 7 - 1;
  const colX = (y: number) => LEFT + (y - years[0]) * colW;
  const rowOf = (t: Live) => (t.draft ? 5 : 5 - (t.confidence ?? 1));
  const shown = live.filter(t => !filter || t.themes.includes(filter) || isVis(t.id));

  const cells = new Map<string, Live[]>();
  for (const t of shown) { const k = `${t.horizon}:${rowOf(t)}`; cells.set(k, [...(cells.get(k) ?? []), t]); }
  const avail = H - TOP - BOTTOM;
  const perRow = Math.max(1, Math.floor((colW - 14) / 16));
  /** Visual radius of a dot, including the selected dot's ring, so gaps are measured from what you see. */
  const rOf = (id: string) => (id === selected ? 9.5 : DOT / 2);
  // The dot's box sits at the item's x/y (padding and negative margin cancel), so its centre is x + DOT / 2.
  const dotCx = (t: Live) => colX(t.horizon) + 8 + DOT / 2;

  /* ── badges: hop/morph open the next level; bundle counts what lies beyond ── */
  const badgeOf = (id: string): { n: number; dir: Dir; open?: boolean; act: boolean } | null => {
    if (variant !== "bundle") { const b = ex.badge(id); return b ? { ...b, act: true } : null; }
    const v = vis.get(id);
    if (!v || v.dir === 0) return null;
    const n = [...reach(g, id, v.dir)].filter(x => !vis.has(x)).length;
    return n ? { n, dir: v.dir, act: false } : null;
  };

  /* ── label lines and routes, decided together. In a selection each theory on screen gets a line within its
     confidence row. A line is accepted only if the theory's label, and the link arriving into it from the left, are
     clear of every label, dot and link already placed, and the source's vertical run can reach it without crossing
     anything. Greedy, left to right (sources always sit left of their consequences). Positions are keyed
     row * 100 + line, which orders them top to bottom without knowing pixel heights yet. ── */
  const lineOf = new Map<string, number>(), rowLines = [0, 0, 0, 0, 0, 0], tagW = new Map<string, { w: number; cut: boolean }>();
  const laneOf = new Map<string, number>(); // source id -> x of its vertical run
  if (selected) {
    const ids = shown.filter(t => isVis(t.id));
    const hs: { k: number; x0: number; x1: number; src?: string }[] = [];
    const vs = new Map<string, { x: number; k0: number; k1: number }>();
    const dots: { x: number; k: number; id: string }[] = [];
    const kOf = new Map<string, number>();
    const gutters = new Map<number, number>();
    const between = (k: number, a: number, b: number) => k > Math.min(a, b) && k < Math.max(a, b);
    // Within a column, theories that lead on (with links of their own) take the lower lines, so their runs head away
    // from their siblings instead of past them.
    const outs = (id: string) => edges.filter(([a, b2]) => a === id && isVis(b2)).length;
    [...ids].sort((p, q) => dotCx(p) - dotCx(q) || Number(q.id === selected) - Number(p.id === selected) || outs(p.id) - outs(q.id)).forEach(t => {
      const r = rowOf(t), cx = dotCx(t), b = badgeOf(t.id);
      const want = Math.min(t.id === selected ? 300 : TAG_MAX, textWidth(t.claim, t.id === selected ? 600 : 500) + 10) + (b ? 34 : 0) + (rivals.includes(t.id) ? 18 : 0);
      const w = Math.max(60, Math.min(want, width - 6 - (cx + GAP + rOf(t.id))));
      tagW.set(t.id, { w, cut: w < want });
      // Sources sit left of (or in the same column as) their consequences and are already placed.
      const srcs = edges.filter(([a, b2]) => b2 === t.id && kOf.has(a) && dotCx(g.by.get(a)!) < cx + 4).map(([a]) => a);
      const tryLine = (L: number) => {
        const k = r * 100 + L;
        const label = { k, x0: cx - rOf(t.id) - 2, x1: cx + GAP + rOf(t.id) + w + 4 };
        if (hs.some(h => h.k === k && label.x0 < h.x1 + 4 && label.x1 > h.x0 - 4)) return null;
        // Nor may the label or the dot sit on another source's vertical run.
        let bad0 = 0;
        for (const [o, ov] of vs) if (!srcs.includes(o) && ov.x > label.x0 - 3 && ov.x < label.x1 + 3 && k >= ov.k0 && k <= ov.k1) bad0++;
        const lanes = new Map<string, number>(), arrivals: typeof hs = [];
        let bad = bad0;
        for (const s of srcs) {
          const sk = kOf.get(s)!, scx = dotCx(g.by.get(s)!);
          let lane = laneOf.get(s);
          if (lane === undefined) {
            // Leave straight down/up from the dot, unless another dot in its column is in the way, or the consequence is
            // in the same column: then step out to a lane far enough left that the approach keeps its full length.
            // The lane is chosen once, so judge it against every row the source's links will reach, not just this one.
            const rows = edges.filter(([a2, b2]) => a2 === s && isVis(b2)).map(([, b2]) => rowOf(g.by.get(b2)!));
            const lo = Math.min(sk, k, ...rows.map(x => x * 100)), hi = Math.max(sk, k, ...rows.map(x => x * 100 + 99));
            const blocked = Math.abs(scx - cx) < 4 || dots.some(d => d.id !== s && Math.abs(d.x - scx) < 2 && between(d.k, lo, hi));
            lane = blocked ? scx - DOT / 2 - GAP - APPROACH - 4 - (gutters.get(Math.round(scx)) ?? 0) * 6 : scx;
          }
          const v = vs.get(s), k0 = Math.min(sk, k, v?.k0 ?? sk), k1 = Math.max(sk, k, v?.k1 ?? sk);
          // The vertical run may not cross a label, an arrival or a dot.
          if (hs.some(h => h.src !== s && between(h.k, k0 - 0.5, k1 + 0.5) && h.k !== sk && lane! > h.x0 - 3 && lane! < h.x1 + 3 && (h.k !== k))) bad++;
          if (dots.some(d => d.id !== s && Math.abs(d.x - lane!) < rOf(d.id) + GAP + 1 && between(d.k, k0, k1 + 0.5) && d.k !== k)) bad++;
          // The approach must keep its full length before the arrowhead.
          if (cx - rOf(t.id) - GAP - lane! < APPROACH) return null;
          const arr = { k, x0: lane, x1: cx + rOf(t.id) + GAP, src: s };
          // The arrival may not cross another source's vertical run, or another arrival on this line.
          for (const [o, ov] of vs) if (o !== s && ov.x > arr.x0 + 1 && ov.x < arr.x1 && between(k, ov.k0, ov.k1)) bad++;
          if (hs.some(h => h.k === k && h.src !== s && !(h.src === undefined && h.x0 > cx - DOT) && arr.x0 < h.x1 && arr.x1 > h.x0)) return null;
          lanes.set(s, lane); arrivals.push(arr);
        }
        return { k, label, lanes, arrivals, bad };
      };
      // Take the first clean line; if none is clean within reach, the line with the fewest crossings.
      let L = 0, ok: ReturnType<typeof tryLine> = null;
      for (let i = 0; i < 16; i++) { const c = tryLine(i); if (c && (!ok || c.bad < ok.bad)) { ok = c; L = i; } if (ok && ok.bad === 0) break; }
      if (!ok) { L = 16; while (!(ok = tryLine(L)) && L < 40) L++; }
      if (!ok) { L = rowLines[r]; ok = { k: r * 100 + L, label: { k: r * 100 + L, x0: cx, x1: cx + w }, lanes: new Map(), arrivals: [], bad: 99 }; }
      hs.push(ok.label, ...ok.arrivals);
      for (const [s, lane] of ok.lanes) {
        if (!laneOf.has(s) && lane !== dotCx(g.by.get(s)!)) { const key = Math.round(dotCx(g.by.get(s)!)); gutters.set(key, (gutters.get(key) ?? 0) + 1); }
        laneOf.set(s, lane);
        const v = vs.get(s), sk = kOf.get(s)!;
        // A lane in the gutter is reached by a short jog between lines; keep other runs off it too.
        if (lane !== dotCx(g.by.get(s)!)) hs.push({ k: sk + (ok.k > sk ? 0.5 : -0.5), x0: lane, x1: dotCx(g.by.get(s)!), src: s });
        vs.set(s, { x: lane, k0: Math.min(sk, ok.k, v?.k0 ?? sk), k1: Math.max(sk, ok.k, v?.k1 ?? sk) });
      }
      kOf.set(t.id, ok.k); dots.push({ x: cx, k: ok.k, id: t.id });
      lineOf.set(t.id, L);
      rowLines[r] = Math.max(rowLines[r], L + 1);
    });
  }

  const need = (mode: Mode) => {
    const rows = [0, 0, 0, 0, 0, 0];
    for (const [k, ts] of cells) {
      const r = Number(k.split(":")[1]);
      const rest = selected ? ts.filter(t => !isVis(t.id)).length : ts.length;
      const h = mode === "dots" ? rowLines[r] * VLINE + Math.ceil(rest / perRow) * 16 : ts.reduce((a, t) => a + (mode === "full" ? wrap(t.claim, labelW, t.draft ? 400 : 500).length * LINE + 4 : 20), 0);
      rows[r] = Math.max(rows[r], h + PAD * 2 - 4);
    }
    return rows.map(h => Math.max(MIN_ROW, h));
  };
  // A selection always shows the field as dots, so the only labels are the few that matter, each on its own dot.
  const mode: Mode = selected ? "dots" : (["full", "line", "dots"] as Mode[]).find(m => (m === "dots" || (m === "full" ? colW >= 136 : colW >= 100)) && need(m).reduce((a, b) => a + b, 0) <= avail)!;
  const heights = (() => { const n = need(mode), spare = (avail - n.reduce((a, b) => a + b, 0)) / 6; return n.map(h => h + spare); })();
  const tops = heights.reduce<number[]>((a, _h, i) => [...a, i === 0 ? TOP : a[i - 1] + heights[i - 1]], []);

  const pos = new Map<string, Place>();
  for (const [k, ts] of cells) {
    const [yr, r] = k.split(":").map(Number);
    const x0 = colX(yr) + 8, y0 = tops[r] + PAD;
    let y = y0;
    const on = selected ? ts.filter(t => isVis(t.id)) : [], rest = selected ? ts.filter(t => !isVis(t.id)) : ts;
    on.forEach(t => { const yy = y0 + lineOf.get(t.id)! * VLINE; pos.set(t.id, { x: x0, y: yy, cx: x0 + DOT / 2, cy: yy + DOT / 2, lines: [] }); });
    // The receding rest pack into a grid under the row's label lines.
    const yr0 = y0 + rowLines[r] * VLINE;
    rest.forEach((t, i) => {
      if (mode === "dots") {
        const x = x0 + (i % perRow) * 16, yy = yr0 + Math.floor(i / perRow) * 16;
        pos.set(t.id, { x, y: yy, cx: x + DOT / 2, cy: yy + DOT / 2, lines: [] });
        return;
      }
      const lines = mode === "full" ? wrap(t.claim, labelW, t.draft ? 400 : 500) : [t.claim];
      pos.set(t.id, { x: x0, y, cx: x0 + DOT / 2, cy: y + 3 + DOT / 2, lines });
      y += mode === "full" ? lines.length * LINE + 4 : 20;
    });
  }

  /* ── links: elbows. Leave the cause's dot straight up or down, turn once, arrive at the consequence from the left
     along its own (clear) line. Links from one theory share the vertical run and split at each consequence. ── */
  const links = useMemo(() => {
    const out: { key: string; a: string; b: string; d: string; pts: [number, number][]; arrow: boolean; deep: boolean; hop?: string }[] = [];
    if (!selected) return out;
    const P = (id: string) => pos.get(id);
    // Every end is measured from the dot's centre: leave GAP clear of the source dot, stop GAP short of the target.
    const R = rOf;
    for (const [a, b] of edges) {
      const p = P(a), q = P(b);
      if (!p || !q) continue;
      let pts: [number, number][];
      const lx = laneOf.get(a), end: [number, number] = [q.cx - R(b) - GAP, q.cy], dir = q.cy > p.cy ? 1 : -1;
      if (q.cx > p.cx - 4 && lx !== undefined && Math.abs(lx - p.cx) > 0.5)
        // Out of the dot's bottom (or top), a short jog between lines to the lane, then down and in. Never out of the
        // dot's left side, which is where its own incoming link arrives.
        pts = [[p.cx, p.cy + dir * (R(a) + GAP)], [p.cx, p.cy + dir * JOG], [lx, p.cy + dir * JOG], [lx, q.cy], end];
      else if (q.cx > p.cx + 4) pts = [[p.cx, p.cy + dir * (R(a) + GAP)], [p.cx, q.cy], end];
      else pts = [[p.cx, p.cy + dir * (R(a) + GAP)], [p.cx, p.cy + dir * JOG], [q.cx - 40, p.cy + dir * JOG], [q.cx - 40, q.cy], end];
      const [hx0, hy] = pts[pts.length - 2], hx1 = pts[pts.length - 1][0], hop = Math.abs(pts[pts.length - 1][1] - hy) < 0.5 && hx1 - hx0 > 30 ? `M ${hx0 + 9} ${hy} H ${hx1 - 10}` : undefined;
      out.push({ hop, key: `${a}>${b}`, a, b, d: roundPath(pts), pts: sample(pts), arrow: true, deep: a !== selected && b !== selected });
    }
    return out;
  }, [selected, variant, edges.map(e => e.join()).join(), [...vis.keys()].join(), width, tops.join(), [...pos.values()].map(p => p.cx + p.cy).join()]);

  const tags = new Map<string, Tag>();
  for (const [id, { w, cut }] of tagW) { const p = pos.get(id); if (p) tags.set(id, { id, side: "r", x: p.cx + rOf(id) + GAP, w, cut }); }

  const tipId = dwell.hot && (!selected ? mode === "dots" || mode === "line" : !tags.get(dwell.hot) || tags.get(dwell.hot)!.cut) ? dwell.hot : undefined;
  const tip = tipId ? g.by.get(tipId) : undefined;
  const away = chainOn && !!selected;

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (chainOn) { setChainOn(false); e.stopPropagation(); return; }
    if (variant !== "bundle" && ex.pop()) e.stopPropagation();
  };
  const fromDot = (id: string) => { const p = pos.get(id); return p ? { x: p.cx - DOT / 2, y: p.cy - DOT / 2 } : undefined; };

  return (
    <div className="t2a-plot" onKeyDown={onKey}>
      <div className="t2-toolbar">
        <ThemePicker scale={scale} live={live} value={filter} onChange={setFilter} />
        <DemoButton open={open} onReset={() => { setChainOn(false); ex.reset(); }} />
        {variant === "morph" && selected && (
          <button className="t2-tool" aria-label="Follow chain" title="Follow chain (Esc to return)" aria-pressed={chainOn} onClick={() => setChainOn(c => !c)}>
            <Icon name="chain" size={15} weight={chainOn ? "fill" : "regular"} />
          </button>
        )}
        {variant !== "bundle" && !away && <Trail g={g} exp={ex.exp} vis={ex.vis} onCollapse={ex.toggle} />}
      </div>

      <motion.div className="t2x-layer" initial={false} animate={{ opacity: away ? 0 : 1 }} transition={{ duration: reduced ? 0 : 0.2, delay: away ? 0.05 : 0.25 }} style={{ pointerEvents: away ? "none" : undefined }}>
        {years.map(y => <span key={y} className="t2a-year ap-num" style={{ left: colX(y) + 10, top: TOP - 22 }}>{y}</span>)}
        {years.slice(1).map(y => <i key={y} className="t2a-vline" style={{ left: colX(y), top: TOP - 8, height: H - TOP - BOTTOM + 8 }} />)}
        {tops.map((y, r) => <i key={r} className="t2a-hline" data-draft={r === 5 ? "" : undefined} style={{ top: y, left: 10, right: RIGHT }} />)}
        {[5, 4, 3, 2, 1].map((c, r) => <span key={c} className="t2a-conf" style={{ top: tops[r] + PAD + 1, left: 12 }}><Conf n={c} /></span>)}
        <span className="t2a-conf" style={{ top: tops[5] + PAD + 1, left: 12 }} title="Drafts: no confidence yet"><i className="t2a-ring" aria-label="Drafts" /></span>

        <motion.svg key={`links${selected}${variant}`} className="t2a-links" width={width} height={H} aria-hidden initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: reduced ? 0 : 0.3 }}>
          <Chevrons />
          {[...links].sort((x, y) => Number(y.deep) - Number(x.deep)).map(l => {
            // Dwell on a theory in the chain: its own links stay, the rest step back.
            const hot = dwell.hot && isVis(dwell.hot) ? dwell.hot : undefined;
            return <path key={l.key} data-a={l.a} data-b={l.b} className="t2-link" data-deep={l.deep ? "" : undefined} data-accent={l.deep ? undefined : ""} data-faint={hot && l.a !== hot && l.b !== hot ? "" : undefined} d={l.d} markerEnd={l.arrow ? chev(l.deep ? "deep" : "accent") : undefined} />;
          })}
          {/* Where an arrival has to pass another theory's run, it hops over it: a gap in the run beneath. */}
          {[...links].sort((x, y) => Number(y.deep) - Number(x.deep)).filter(l => l.hop).map(l => <g key={`h${l.key}`} data-faint={dwell.hot && isVis(dwell.hot) && l.a !== dwell.hot && l.b !== dwell.hot ? "" : undefined} className="t2x-hop">
            <path className="t2x-halo" d={l.hop!} />
            <path className="t2-link" data-deep={l.deep ? "" : undefined} data-accent={l.deep ? undefined : ""} d={l.hop!} />
          </g>)}
        </motion.svg>

        {shown.map(t => {
          const p = pos.get(t.id);
          if (!p) return null;
          const on = isVis(t.id), isSel = selected === t.id;
          const m = selected || mode === "dots" ? "dots" : mode;
          return (
            <motion.button key={t.id} data-tid={t.id} className="t2a-item" data-mode={m} data-draft={t.draft ? "" : undefined}
              data-sel={isSel ? "" : undefined} data-dim={selected && !on ? "" : undefined} data-hover={dwell.hover === t.id ? "" : undefined}
              style={{ width: m === "dots" ? DOT + 4 : colW - 12, zIndex: isSel ? 4 : on ? 3 : 1 }}
              initial={false} animate={{ x: p.x, y: p.y }} transition={reduced ? { duration: 0 } : SPRING}
              aria-label={t.claim}
              onPointerEnter={() => dwell.enter(t.id)} onPointerLeave={() => dwell.leave(t.id)} onFocus={() => dwell.enter(t.id)} onBlur={() => dwell.leave(t.id)}
              onClick={() => onOpen("theory", t.id)}>
              <i className="t2a-dot" data-challenge={t.challenge ? "" : undefined} />
              {m !== "dots" && <span className="t2a-label">{t.claim}</span>}
            </motion.button>
          );
        })}

        <AnimatePresence>
          {[...tags.values()].map(tag => {
            const t = g.by.get(tag.id)!, p = pos.get(tag.id)!, b = badgeOf(tag.id);
            return (
              <motion.div key={`${selected}${tag.id}`} className="t2x-tag" data-side={tag.side} data-sel={tag.id === selected ? "" : undefined} data-draft={t.draft ? "" : undefined}
                style={{ left: tag.x, top: p.cy - TAG_H / 2, width: tag.w }}
                initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.16, delay: reduced ? 0 : 0.28 } }} exit={{ opacity: 0, transition: { duration: 0.08 } }}>
                {rivals.includes(tag.id) && <span className="t2x-tag-rival" title="Rival of the selected theory" aria-label="Rival"><Icon name="swap" size={12} /></span>}
                <button className="t2x-tag-text" onClick={() => onOpen("theory", t.id)} tabIndex={-1}
                  onPointerEnter={() => dwell.enter(t.id)} onPointerLeave={() => dwell.leave(t.id)}>{t.claim}</button>
                {b && <Badge n={b.n} dir={b.dir} open={b.open} act={b.act} onClick={() => ex.toggle(tag.id)} />}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {away && selected && <ChainView key={`chain${selected}`} g={g} sel={selected} width={width} height={H} from={fromDot} onOpen={onOpen} />}
      </AnimatePresence>

      {tip && !away && (() => { const p = pos.get(tip.id)!; const left = Math.max(8, Math.min(p.x - 8, width - 310)); const below = p.cy + 12 + 70 < H; return (
        <div className="t2-tip" style={{ left, top: below ? p.cy + 12 : undefined, bottom: below ? undefined : H - p.cy + 12 }} role="tooltip">
          <span className="t2-tip-claim">{tip.claim}</span>
          <span className="t2-tip-meta">{tip.draft ? <i className="t2a-ring" aria-label="Draft" /> : <Conf n={tip.confidence} />}<span className="ap-num ap-muted">{tip.horizon}</span><Marks t={tip} /></span>
        </div>
      ); })()}
    </div>
  );
}

/** "+3 →": how many lie one level further. A button where it opens that level (pressed while open), a mark where it only counts. */
export function Badge({ n, dir, open, act, onClick, axis = "x" }: { n: number; dir: Dir; open?: boolean; act: boolean; onClick?: () => void; axis?: "x" | "y" }) {
  const icon = axis === "x" ? (dir === 1 ? "arrowRight" : "arrowLeft") : dir === 1 ? "arrowDown" : "arrowUp";
  const what = dir === 1 ? (n === 1 ? "consequence" : "consequences") : n === 1 ? "cause" : "causes";
  const label = act ? `${open ? "Hide" : "Show"} ${n} ${dir === 1 ? "further" : "earlier"} ${what}` : `${n} further ${what}`;
  const body = <><span className="ap-num">{open ? "−" : "+"}{n}</span><Icon name={icon} size={11} /></>;
  return act
    ? <button className="t2x-badge" aria-pressed={!!open} aria-label={label} title={label} onClick={e => { e.stopPropagation(); onClick?.(); }}>{body}</button>
    : <span className="t2x-badge" data-static="" title={label} aria-label={label}>{body}</span>;
}

/* ── geometry ── */
function roundPath(pts: [number, number][], r = 6) {
  const p = pts.filter((q, i) => i === 0 || Math.abs(q[0] - pts[i - 1][0]) + Math.abs(q[1] - pts[i - 1][1]) > 0.5);
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) {
    const [ax, ay] = p[i - 1], [bx, by] = p[i], [cx, cy] = p[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by), rr = Math.min(r, l1 / 2, l2 / 2);
    const sx = bx - ((bx - ax) / (l1 || 1)) * rr, sy = by - ((by - ay) / (l1 || 1)) * rr, ex = bx + ((cx - bx) / (l2 || 1)) * rr, ey = by + ((cy - by) / (l2 || 1)) * rr;
    d += ` L ${sx} ${sy} Q ${bx} ${by} ${ex} ${ey}`;
  }
  const last = p[p.length - 1];
  return d + ` L ${last[0]} ${last[1]}`;
}
function sample(pts: [number, number][]) {
  const out: [number, number][] = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 4));
    for (let k = 0; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
}
