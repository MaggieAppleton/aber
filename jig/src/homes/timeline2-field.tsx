import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Icon, Conf } from "./atoms";
import { setEdit } from "./edits";
import type { Scale } from "./timeline2-data";
import { H, SPRING, LensFrame, Marks, ThemePicker, chainOf, neighbours, useDwell, useLive, useOpen, wrap, textWidth, yearsFor, type Live } from "./timeline2-shared";

/*
 * A. Field. Across: the year a theory says it happens by. Down: how sure I am, with drafts (no confidence yet)
 * in their own row at the bottom. Nothing is connected at rest. Selecting a theory draws its whole line of
 * reasoning and its rivals; everything else recedes. Labels collapse as the field gets denser: wrapped claims,
 * then one-line claims, then dots that name themselves on hover. Rows take the height their theories need.
 */

const TOP = 72, LEFT = 74, RIGHT = 12, BOTTOM = 12, LINE = 17, PAD = 8, MIN_ROW = 30, DOT = 10;
type Mode = "full" | "line" | "dots";
type Place = { x: number; y: number; cx: number; cy: number; lines: string[]; out: number };

export function Field({ scale }: { scale: Scale }) {
  const { obj, onOpen, close, selected } = useOpen();
  return (
    <LensFrame obj={obj} onOpen={onOpen} onClose={close} className="t2a">
      {w => <FieldPlot scale={scale} width={w} selected={selected} onOpen={onOpen} />}
    </LensFrame>
  );
}

function FieldPlot({ scale, width, selected, onOpen }: { scale: Scale; width: number; selected?: string; onOpen: (k: "theory", id: string) => void }) {
  const reduced = useReducedMotion();
  const live = useLive(scale);
  const [filter, setFilter] = useState<string>();
  const dwell = useDwell();
  const box = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const start = useRef<{ id: string; x: number; y: number; ox: number; oy: number } | null>(null);
  const justDragged = useRef(false);

  const years = yearsFor(live);
  const colW = (width - LEFT - RIGHT) / years.length;
  const labelW = colW - 12 - 6 - DOT - 7 - 1;
  const colX = (y: number) => LEFT + (y - years[0]) * colW;
  const rowOf = (t: Live) => (t.draft ? 5 : 5 - (t.confidence ?? 1));

  const chain = useMemo(() => chainOf(selected, live), [selected, live]);
  const shown = live.filter(t => !filter || t.themes.includes(filter) || chain.has(t.id));
  const by = new Map(live.map(t => [t.id, t]));

  const cells = new Map<string, Live[]>();
  for (const t of shown) { const k = `${t.horizon}:${rowOf(t)}`; cells.set(k, [...(cells.get(k) ?? []), t]); }

  // How tall each row must be in a mode; the densest mode whose rows all fit wins. Spare height is shared out evenly.
  const avail = H - TOP - BOTTOM;
  const perRow = Math.max(1, Math.floor((colW - 14) / 16));
  const need = (mode: Mode) => {
    const rows = [0, 0, 0, 0, 0, 0];
    for (const [k, ts] of cells) {
      const r = Number(k.split(":")[1]);
      const h = mode === "dots" ? Math.ceil(ts.length / perRow) * 16 : ts.reduce((a, t) => a + (mode === "full" ? wrap(t.claim, labelW, t.draft ? 400 : 500).length * LINE + 4 : 20), 0);
      rows[r] = Math.max(rows[r], h + PAD * 2 - 4);
    }
    return rows.map(h => Math.max(MIN_ROW, h));
  };
  const modes: Mode[] = ["full", "line", "dots"];
  const mode = modes.find(m => (m === "dots" || (m === "full" ? colW >= 136 : colW >= 100)) && need(m).reduce((a, b) => a + b, 0) <= avail)!;
  const heights = (() => { const n = need(mode), spare = (avail - n.reduce((a, b) => a + b, 0)) / 6; return n.map(h => h + spare); })();
  const tops = heights.reduce<number[]>((a, h, i) => [...a, i === 0 ? TOP : a[i - 1] + heights[i - 1]], []);

  const pos = useMemo(() => {
    const p = new Map<string, Place>();
    for (const [k, ts] of cells) {
      const [yr, r] = k.split(":").map(Number);
      const x0 = colX(yr) + 8, y0 = tops[r] + PAD;
      let y = y0;
      ts.forEach((t, i) => {
        if (mode === "dots") {
          const x = x0 + (i % perRow) * 16, yy = y0 + Math.floor(i / perRow) * 16;
          p.set(t.id, { x, y: yy, cx: x + 2 + DOT / 2, cy: yy + 2 + DOT / 2, lines: [], out: x + 2 + DOT + 2 });
          return;
        }
        const lines = mode === "full" ? wrap(t.claim, labelW, t.draft ? 400 : 500) : [t.claim];
        const first = Math.min(labelW, textWidth(lines[0], t.draft ? 400 : 500));
        p.set(t.id, { x: x0, y, cx: x0 + 2 + DOT / 2, cy: y + 2 + 8, lines, out: x0 + 2 + DOT + 7 + first + 6 });
        y += mode === "full" ? lines.length * LINE + 4 : 20;
      });
    }
    return p;
  }, [[...cells.keys()].join(), shown.map(t => t.id + t.claim).join(), mode, colW, tops.join()]);

  // Chain members in a dense field are labelled as pills; push a pill down until it clears the pills above it.
  const pills = useMemo(() => {
    const out = new Map<string, number>();
    if (!selected || mode === "full") return out;
    const placed: { x: number; y: number; w: number; h: number }[] = [];
    const ids = [...chain.nodes].filter(id => pos.has(id) && shown.some(t => t.id === id)).sort((a, b) => pos.get(a)!.y - pos.get(b)!.y || pos.get(a)!.x - pos.get(b)!.x);
    for (const id of ids) {
      const p = pos.get(id)!, t = by.get(id)!, w = Math.min(246, width - p.x - 8, textWidth(t.claim) + DOT + 7 + 8), h = wrap(t.claim, w - DOT - 15).length * LINE + 4;
      let y = p.y;
      for (let guard = 0; guard < 40; guard++) {
        const hit = placed.find(r => p.x < r.x + r.w && p.x + w > r.x && y < r.y + r.h && y + h > r.y);
        if (!hit) break;
        y = hit.y + hit.h + 2;
      }
      placed.push({ x: p.x, y, w, h });
      out.set(id, y - p.y);
    }
    return out;
  }, [selected, chain, mode, pos]);
  const preview = !selected ? neighbours(dwell.hot, shown) : { edges: [], rivals: [] };
  const edges = selected ? chain.edges : preview.edges;
  const rivals = selected ? chain.rivals : preview.rivals;

  /* ── drag: change horizon (and confidence, for held theories) by moving the theory itself ── */
  const local = (e: { clientX: number; clientY: number }) => { const r = box.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const target = (t: Live, x: number, y: number) => {
    const yr = Math.max(years[0], Math.min(years.at(-1)!, years[0] + Math.floor((x - LEFT) / colW)));
    let r = 0; for (let i = 0; i < 5; i++) if (y >= tops[i]) r = i;
    return { yr, r: t.draft ? 5 : r };
  };
  const onDown = (e: RPointerEvent, t: Live) => {
    if (e.button !== 0) return;
    const p = local(e), at = pos.get(t.id)!;
    start.current = { id: t.id, x: p.x, y: p.y, ox: p.x - at.x, oy: p.y - at.y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent) => {
    const s = start.current;
    if (!s) return;
    const p = local(e);
    if (!drag && Math.hypot(p.x - s.x, p.y - s.y) < 5) return;
    dwell.clear();
    setDrag({ id: s.id, x: p.x - s.ox, y: by.get(s.id)!.draft ? pos.get(s.id)!.y : p.y - s.oy });
  };
  const onUp = () => {
    const s = start.current;
    start.current = null;
    if (!s || !drag) return;
    const t = by.get(s.id)!, { yr, r } = target(t, drag.x + 7, drag.y + 9);
    setEdit("theory", t.id, t.draft ? { horizon: yr } : { horizon: yr, confidence: 5 - r });
    justDragged.current = true;
    setDrag(null);
  };
  const slot = drag ? (() => { const t = by.get(drag.id)!; const { yr, r } = target(t, drag.x + 7, drag.y + 9); return { x: colX(yr), y: tops[r], h: heights[r] }; })() : null;

  // Links leave from the end of the cause's first line and arrive at the consequence's dot.
  const at = (id: string) => { const p0 = pos.get(id); if (!p0) return undefined; const n = pills.get(id) ?? 0; const p = n ? { ...p0, y: p0.y + n, cy: p0.cy + n } : p0; if (drag?.id !== id) return p; const dx = drag.x - p.x, dy = drag.y - p.y; return { ...p, cx: p.cx + dx, cy: p.cy + dy, out: p.out + dx }; };
  const labelled = (id: string) => mode !== "dots" || (!!selected && chain.has(id));
  const link = (a: string, b: string) => {
    const p = at(a), q = at(b);
    if (!p || !q) return "";
    // Leave the cause's dot straight up or down (never along its own label), arrive at the consequence's dot from the left.
    const dir = q.cy < p.cy - 2 ? -1 : 1, y1 = p.cy + dir * 7, x2 = q.cx - 9;
    if (x2 > p.cx + 12) {
      const ky = Math.max(18, Math.abs(q.cy - y1) * 0.6), kx = Math.max(18, (x2 - p.cx) * 0.55);
      return `M ${p.cx} ${y1} C ${p.cx} ${y1 + dir * ky}, ${x2 - kx} ${q.cy}, ${x2} ${q.cy}`;
    }
    // Same year or earlier: drop out of the dot, swing left of both, come in from the left.
    const k = 26 + Math.abs(q.cy - p.cy) * 0.1, left = Math.min(p.cx, x2) - k;
    return `M ${p.cx} ${y1} C ${p.cx} ${y1 + dir * 24}, ${left} ${q.cy}, ${x2} ${q.cy}`;
  };
  const arc = (a: string, b: string) => {
    const p = at(a), q = at(b);
    if (!p || !q) return { d: "", mx: 0, my: 0 };
    const mx = (p.cx + q.cx) / 2, my = (p.cy + q.cy) / 2, dx = q.cx - p.cx, dy = q.cy - p.cy, len = Math.hypot(dx, dy) || 1;
    const bend = Math.min(48, len * 0.3), cx = mx + (dy / len) * bend, cy = my - (dx / len) * bend;
    return { d: `M ${p.cx} ${p.cy} Q ${cx} ${cy} ${q.cx} ${q.cy}`, mx: (mx + cx) / 2, my: (my + cy) / 2 };
  };
  const tip = mode !== "full" && dwell.hover && !drag && !(selected && chain.has(dwell.hover)) ? by.get(dwell.hover) : undefined;

  return (
    <div className="t2a-plot" ref={box} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { start.current = null; setDrag(null); }}>
      <div className="t2-toolbar"><ThemePicker scale={scale} live={live} value={filter} onChange={setFilter} /></div>

      {years.map(y => <span key={y} className="t2a-year ap-num" style={{ left: colX(y) + 10, top: TOP - 22 }}>{y}</span>)}
      {years.slice(1).map(y => <i key={y} className="t2a-vline" style={{ left: colX(y), top: TOP - 8, height: H - TOP - BOTTOM + 8 }} />)}
      {tops.map((y, r) => <i key={r} className="t2a-hline" data-draft={r === 5 ? "" : undefined} style={{ top: y, left: 10, right: RIGHT }} />)}
      {[5, 4, 3, 2, 1].map((c, r) => <span key={c} className="t2a-conf" style={{ top: tops[r] + PAD + 1, left: 12 }}><Conf n={c} /></span>)}
      <span className="t2a-conf" style={{ top: tops[5] + PAD + 1, left: 12 }} title="Drafts: no confidence yet"><i className="t2a-ring" aria-label="Drafts" /></span>

      {slot && <motion.i className="t2a-slot" initial={false} animate={{ x: slot.x + 1, y: slot.y + 1 }} transition={{ type: "spring", stiffness: 600, damping: 40 }} style={{ width: colW - 2, height: slot.h - 2 }} />}

      <svg className="t2a-links" width={width} height={H} aria-hidden>
        <defs>
          <marker id="t2a-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 1 1.5 L 8.5 5 L 1 8.5 Z" fill="context-stroke" />
          </marker>
        </defs>
        {rivals.map(([a, b]) => <path key={`r${a}${b}`} className="t2-rival-line" data-preview={!selected ? "" : undefined} d={arc(a, b).d} />)}
        {edges.map(([a, b]) => <path key={`${a}>${b}`} className="t2-link" data-preview={!selected ? "" : undefined} d={link(a, b)} markerEnd="url(#t2a-head)" />)}
      </svg>
      {rivals.map(([a, b]) => { const { mx, my } = arc(a, b); return <span key={`rb${a}${b}`} className="t2-rival-badge" data-preview={!selected ? "" : undefined} style={{ left: mx - 9, top: my - 9 }} title="Rivals"><Icon name="swap" size={11} /></span>; })}

      {shown.map(t => {
        const p = pos.get(t.id);
        if (!p) return null;
        const d = drag?.id === t.id ? { x: drag.x, y: drag.y } : { x: p.x, y: p.y + (pills.get(t.id) ?? 0) };
        const isSel = selected === t.id, inChain = chain.has(t.id);
        const lab = labelled(t.id);
        const m = lab ? (mode === "full" ? "full" : selected && inChain ? "pill" : mode) : "dots";
        return (
          <motion.button key={t.id} className="t2a-item" data-mode={m} data-draft={t.draft ? "" : undefined}
            data-sel={isSel ? "" : undefined} data-dim={selected && !inChain ? "" : undefined} data-hover={dwell.hover === t.id ? "" : undefined} data-dragging={drag?.id === t.id ? "" : undefined}
            style={{ width: m === "dots" ? DOT + 4 : m === "pill" ? undefined : colW - 12, maxWidth: m === "pill" ? Math.min(246, width - p.x - 8) : undefined, zIndex: drag?.id === t.id ? 6 : isSel ? 4 : inChain ? 3 : 1 }}
            initial={false} animate={{ x: d.x, y: d.y }} transition={drag?.id === t.id || reduced ? { duration: 0 } : SPRING}
            aria-label={t.claim}
            onPointerEnter={() => dwell.enter(t.id)} onPointerLeave={() => dwell.leave(t.id)} onFocus={() => dwell.enter(t.id)} onBlur={() => dwell.leave(t.id)}
            onPointerDown={e => onDown(e, t)}
            onClick={() => { if (justDragged.current) { justDragged.current = false; return; } onOpen("theory", t.id); }}>
            <i className="t2a-dot" data-challenge={t.challenge ? "" : undefined} title={t.challenge ? "Challenged" : undefined} />
            {lab && <span className="t2a-label">{t.claim}</span>}
          </motion.button>
        );
      })}

      {tip && (() => { const p = pos.get(tip.id)!; const left = Math.max(8, Math.min(p.x - 8, width - 310)); return (
        <div className="t2-tip" style={{ left, top: p.y + (mode === "dots" ? 20 : 22) }} role="tooltip">
          <span className="t2-tip-claim">{tip.claim}</span>
          <span className="t2-tip-meta">{tip.draft ? <i className="t2a-ring" aria-label="Draft" /> : <Conf n={tip.confidence} />}<span className="ap-num ap-muted">{tip.horizon}</span><Marks t={tip} /></span>
        </div>
      ); })()}
    </div>
  );
}

