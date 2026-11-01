import { useEffect, useMemo, useState } from "react";
import type { Live } from "./timeline2-shared";
import { wrap } from "./timeline2-shared";

/*
 * Graph helpers for the "Clearer chains" variants: one-hop neighbourhoods, progressive expansion, counts of what
 * lies further out, and a layered chain layout (Sugiyama-lite: longest-path layers, dummy slots for long edges,
 * one barycentre pass kept only when it removes crossings).
 */

export type Dir = -1 | 0 | 1;
export type Graph = { by: Map<string, Live>; next: (id: string, dir: Dir) => string[] };

export function useGraph(live: Live[]): Graph {
  return useMemo(() => {
    const by = new Map(live.map(t => [t.id, t]));
    const down = new Map<string, string[]>();
    for (const t of live) for (const f of t.follows) if (by.has(f)) down.set(f, [...(down.get(f) ?? []), t.id]);
    const order = (ids: string[]) => [...ids].sort((a, b) => by.get(a)!.horizon - by.get(b)!.horizon || (by.get(b)!.confidence ?? 0) - (by.get(a)!.confidence ?? 0));
    const next = (id: string, dir: Dir) => order(dir === 1 ? down.get(id) ?? [] : dir === -1 ? (by.get(id)?.follows ?? []).filter(f => by.has(f)) : []);
    return { by, next };
  }, [live]);
}

/** Every theory reachable from id in one direction, not counting id. */
export function reach(g: Graph, id: string, dir: Dir) {
  const seen = new Set<string>();
  const go = (x: string) => g.next(x, dir).forEach(n => { if (!seen.has(n)) { seen.add(n); go(n); } });
  go(id);
  return seen;
}

export type Vis = { dir: Dir; depth: number; parent?: string };

/** What a one-hop selection shows: the theory, its direct causes and consequences, plus each expanded branch. */
export function visibleSet(g: Graph, sel: string | undefined, exp: string[]) {
  const vis = new Map<string, Vis>();
  if (!sel || !g.by.has(sel)) return { vis, exp: [] as string[] };
  vis.set(sel, { dir: 0, depth: 0 });
  for (const d of [-1, 1] as const) for (const n of g.next(sel, d)) if (!vis.has(n)) vis.set(n, { dir: d, depth: 1, parent: sel });
  const kept: string[] = [];
  for (const e of exp) {
    const v = vis.get(e);
    if (!v || v.dir === 0) continue;
    kept.push(e);
    for (const n of g.next(e, v.dir)) if (!vis.has(n)) vis.set(n, { dir: v.dir, depth: v.depth + 1, parent: e });
  }
  return { vis, exp: kept };
}

/** Selection plus a stack of expanded branches; Esc pops the last one. Resets when the selection changes. */
export function useExpansion(g: Graph, sel: string | undefined) {
  const [exp, setExp] = useState<string[]>([]);
  useEffect(() => setExp([]), [sel]);
  const { vis, exp: kept } = useMemo(() => visibleSet(g, sel, exp), [g, sel, exp]);
  const edges = useMemo(() => {
    const out: [string, string][] = [];
    for (const id of vis.keys()) for (const n of g.next(id, 1)) if (vis.has(n)) out.push([id, n]);
    return out;
  }, [vis, g]);
  /** How many of a theory's next-level neighbours are not on screen, and whether it is the one that put them there. */
  const badge = (id: string) => {
    const v = vis.get(id);
    if (!v || v.dir === 0) return null;
    const open = kept.includes(id);
    const n = open ? [...vis.values()].filter(x => x.parent === id).length : g.next(id, v.dir).filter(x => !vis.has(x)).length;
    return n > 0 ? { n, open, dir: v.dir } : null;
  };
  const toggle = (id: string) => setExp(() => {
    if (!kept.includes(id)) return [...kept, id];
    // Collapsing a level drops every expansion that hung off it.
    const without = kept.filter(x => x !== id);
    return visibleSet(g, sel, without).exp;
  });
  const pop = () => { if (!kept.length) return false; setExp(kept.slice(0, -1)); return true; };
  return { vis, exp: kept, edges, badge, toggle, pop, reset: () => setExp([]) };
}

/* ── Layered chain layout ── */

export type ChainCard = { id: string; col: number; x: number; y: number; w: number; h: number; lines: string[]; rival?: boolean; dummy?: boolean };
export type ChainEdge = { a: string; b: string; pts: [number, number][] };
export type ChainLayout = { cards: ChainCard[]; edges: ChainEdge[]; width: number; height: number; rival?: { x: number; y: number }; crossings: number };

export const CARD = { pad: 10, line: 17, meta: 22, gap: 10, colGap: 44, maxW: 210 };

export function layoutChain(g: Graph, sel: string, width: number, height: number): ChainLayout {
  const t0 = g.by.get(sel)!;
  const up = reach(g, sel, -1), down = reach(g, sel, 1);
  // Longest-path depth, so every link runs left to right.
  const depth = new Map<string, number>([[sel, 0]]);
  const dd = (id: string): number => { if (depth.has(id)) return depth.get(id)!; const v = Math.max(...g.next(id, -1).filter(p => p === sel || down.has(p)).map(p => dd(p) + 1)); depth.set(id, v); return v; };
  const du = (id: string): number => { if (depth.has(id)) return depth.get(id)!; const v = Math.min(...g.next(id, 1).filter(c => c === sel || up.has(c)).map(c => du(c) - 1)); depth.set(id, v); return v; };
  down.forEach(dd); up.forEach(du);
  const edges: [string, string][] = [];
  for (const id of depth.keys()) for (const n of g.next(id, 1)) if (depth.has(n)) edges.push([id, n]);

  const min = Math.min(...depth.values()), max = Math.max(...depth.values()), ncol = max - min + 1;
  const cols: string[][] = Array.from({ length: ncol }, () => []);
  depth.forEach((d, id) => cols[d - min].push(id));
  const key = (id: string) => { const t = g.by.get(id)!; return t.horizon * 10 - (t.confidence ?? 0); };
  cols.forEach(c => c.sort((a, b) => key(a) - key(b)));

  // Dummy slots carry links that skip a column, so a long link passes through a gap instead of over a card.
  const chainsOf = new Map<string, string[]>();
  for (const [a, b] of edges) {
    const da = depth.get(a)!, db = depth.get(b)!;
    const path = [a];
    for (let d = da + 1; d < db; d++) { const id = `~${a}>${b}@${d}`; cols[d - min].push(id); path.push(id); }
    path.push(b);
    chainsOf.set(`${a}>${b}`, path);
  }
  const segs = [...chainsOf.values()].flatMap(p => p.slice(1).map((b, i) => [p[i], b] as [string, string]));
  const colOf = new Map<string, number>(); cols.forEach((c, i) => c.forEach(id => colOf.set(id, i)));

  const crossings = (order: string[][]) => {
    const idx = new Map<string, number>(); order.forEach(c => c.forEach((id, i) => idx.set(id, i)));
    let n = 0;
    for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
      const [a, b] = segs[i], [c, d] = segs[j];
      if (colOf.get(a) !== colOf.get(c)) continue;
      if ((idx.get(a)! - idx.get(c)!) * (idx.get(b)! - idx.get(d)!) < 0) n++;
    }
    return n;
  };
  // Sweep outward from the selected column: each column is ordered by the mean position of its neighbours in the
  // column nearer the selection (parents for consequences, children for causes), ties by year then confidence.
  const s0 = -min;
  const place = (order: string[][], sweep: boolean) => {
    const cols2 = [...Array.from({ length: ncol - s0 - 1 }, (_, i) => s0 + 1 + i), ...Array.from({ length: s0 }, (_, i) => s0 - 1 - i)];
    for (const ci of cols2) {
      const ref = order[ci > s0 ? ci - 1 : ci + 1], pos = new Map(ref.map((id, i) => [id, i]));
      const bary = (id: string) => {
        const ns = segs.filter(([a, b]) => (ci > s0 ? b === id && pos.has(a) : a === id && pos.has(b))).map(([a, b]) => pos.get(ci > s0 ? a : b)!);
        return ns.length ? ns.reduce((s, x) => s + x, 0) / ns.length : 0;
      };
      const k = (id: string) => (id.startsWith("~") ? Infinity : key(id));
      order[ci] = [...order[ci]].sort((a, b) => (sweep || a.startsWith("~") || b.startsWith("~") ? bary(a) - bary(b) : 0) || k(a) - k(b));
    }
    return order;
  };
  const yo = place(cols.map(c => [...c]), false), bo = place(cols.map(c => [...c]), true);
  const cy = crossings(yo), cb = crossings(bo);
  const order = cb < cy ? bo : yo;

  // Rival sits directly under the selected theory.
  const rivals = t0.rivals.filter(r => g.by.has(r) && !depth.has(r));
  const c0 = order[0 - min];
  c0.splice(c0.indexOf(sel) + 1, 0, ...rivals);

  const w = Math.min(CARD.maxW, Math.floor((width - 32 - CARD.colGap * (ncol - 1)) / ncol));
  const x0 = Math.max(16, (width - (ncol * w + (ncol - 1) * CARD.colGap)) / 2);
  const cards: ChainCard[] = [];
  const colH: number[] = [];
  order.forEach((c, ci) => {
    let y = 0;
    c.forEach(id => {
      if (id.startsWith("~")) { cards.push({ id, col: ci, x: x0 + ci * (w + CARD.colGap), y, w, h: 14, lines: [], dummy: true }); y += 14 + CARD.gap; return; }
      const t = g.by.get(id)!, lines = wrap(t.claim, w - CARD.pad * 2, 600);
      const h = CARD.pad * 2 + lines.length * CARD.line + CARD.meta;
      const rival = rivals.includes(id);
      if (rival) y += 18;
      cards.push({ id, col: ci, x: x0 + ci * (w + CARD.colGap), y, w, h, lines, rival });
      y += h + CARD.gap;
    });
    colH.push(y - CARD.gap);
  });
  const tall = Math.max(...colH);
  const top = 64, avail = height - top - 24;
  // Centre each column on the available height (or on the tallest column when it overflows).
  const frame = Math.max(avail, tall);
  cards.forEach(c => { c.y += top + (frame - colH[c.col]) / 2; });
  const at = new Map(cards.map(c => [c.id, c]));
  const anchor = (c: ChainCard) => c.dummy ? c.y + 7 : c.y + CARD.pad + CARD.line / 2;
  // Each source gets its own vertical lane in the gap after its column, so links from different cards never share a run.
  // Lanes are ordered by how far down a source's links travel: links heading furthest down take the rightmost lane,
  // so a source's exit never has to cross another source's vertical run.
  const lane = new Map<string, number>();
  const at0 = new Map(cards.map(c => [c.id, c]));
  const anchorOf = (id: string) => { const c = at0.get(id)!; return c.dummy ? c.y + 7 : c.y + CARD.pad + CARD.line / 2; };
  order.forEach(c => {
    const srcs = c.filter(id => segs.some(([a]) => a === id));
    const drop = (id: string) => { const ts = segs.filter(([a]) => a === id).map(([, b]) => anchorOf(b) - anchorOf(id)); return ts.reduce((s, x) => s + x, 0) / ts.length; };
    // Sources heading up sit left, lower ones further right; sources heading down sit right, upper ones further
    // right. Either way a vertical run never has to pass another source's exit.
    const rank = (id: string) => (drop(id) < 0 ? anchorOf(id) : 1e6 - anchorOf(id));
    [...srcs].sort((a, b) => rank(a) - rank(b)).forEach((id, k) => lane.set(id, k));
  });
  const laneN = order.map(c => c.filter(id => lane.has(id)).length);
  const chainEdges: ChainEdge[] = [...chainsOf.entries()].map(([k, path]) => {
    const [a, b] = k.split(">");
    const pts: [number, number][] = [];
    path.forEach((id, i) => {
      const c = at.get(id)!, y = anchor(c);
      // The last hop stops short of the card, so the arrowhead has room to breathe.
      if (i > 0) pts.push([i === path.length - 1 ? c.x - 6 : c.x, y]);
      if (i < path.length - 1) {
        const n = laneN[c.col], step = Math.min(7, (CARD.colGap - 20) / Math.max(1, n - 1));
        pts.push([c.x + c.w, y]);
        pts.push([c.x + c.w + CARD.colGap / 2 - ((n - 1) * step) / 2 + lane.get(id)! * step, NaN]);
      }
    });
    return { a, b, pts };
  });
  const s = at.get(sel)!, r = rivals.length ? at.get(rivals[0]) : undefined;
  return { cards: cards.filter(c => !c.dummy), edges: chainEdges, width, height: top + frame + 24, rival: r ? { x: s.x + 14, y: r.y - 14 - 9 } : undefined, crossings: Math.min(cy, cb) };
}

/** Orthogonal path with soft corners through a list of points (each hop: across, down, across). */
export function orthoPath(pts: [number, number][], r = 6) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  let lx: number | undefined;
  for (let i = 1; i < pts.length; i++) {
    // A point with no y names the lane (x) where the next hop turns.
    if (Number.isNaN(pts[i][1])) { lx = pts[i][0]; continue; }
    const [x1, y1] = pts[i - 1][1] !== pts[i - 1][1] ? pts[i - 2] : pts[i - 1], [x2, y2] = pts[i];
    if (Math.abs(y2 - y1) < 0.5) { d += ` H ${x2}`; lx = undefined; continue; }
    const mx = lx ?? (x1 + x2) / 2; lx = undefined;
    const dir = y2 > y1 ? 1 : -1, rr = Math.min(r, Math.abs(y2 - y1) / 2, Math.abs(mx - x1));
    d += ` H ${mx - rr} Q ${mx} ${y1} ${mx} ${y1 + dir * rr} V ${y2 - dir * rr} Q ${mx} ${y2} ${mx + rr} ${y2} H ${x2}`;
  }
  return d;
}
