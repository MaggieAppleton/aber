import { THEMES, theoriesIn, type Theory } from "../data";

/** World size and the territory layout every map style shares. */
export const W = 1240, H = 760;
export const REGION: Record<string, { x: number; y: number; r: number }> = {
  cost: { x: 600, y: 370, r: 150 }, memory: { x: 820, y: 290, r: 160 }, personal: { x: 420, y: 230, r: 130 },
  funding: { x: 520, y: 560, r: 100 }, review: { x: 980, y: 540, r: 120 }, interfaces: { x: 220, y: 500, r: 105 }, identity: { x: 1070, y: 150, r: 75 },
};

export function rand(seed: number) { return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }

/** Where a theory sits: between its themes, or spread around its one theme's centre. */
export function pinPos(t: Theory) {
  const rs = t.themes.map(id => REGION[id]);
  const cx = rs.reduce((a, r) => a + r.x, 0) / rs.length, cy = rs.reduce((a, r) => a + r.y, 0) / rs.length;
  if (rs.length > 1) return { x: cx, y: cy };
  const siblings = theoriesIn(t.themes[0]).filter(x => x.themes.length === 1);
  const k = siblings.findIndex(x => x.id === t.id), n = siblings.length;
  const a = (k / Math.max(1, n)) * Math.PI * 2 - Math.PI / 4;
  const d = n === 1 ? 0 : rs[0].r * 0.45;
  return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d };
}

/**
 * Theme hues for the styles that colour territories. Calm and low in chroma, kept away from
 * blue (new) and red (challenge). Only cost touches others on the map, so its neighbours differ most from it.
 */
export const HUE: Record<string, number> = { cost: 85, personal: 305, memory: 150, funding: 200, review: 55, interfaces: 120, identity: 345 };

/* ── Signals: one deterministic set for the new styles, clustered around the theories they feed ── */
export type Sig = { id: string; theme: string; themes: string[]; x: number; y: number; fresh: boolean; ax: number; ay: number; d: number };

function gauss(r: () => number) { return Math.sqrt(-2 * Math.log(Math.max(1e-6, r()))) * Math.cos(2 * Math.PI * r()); }

export const SIGS: Sig[] = THEMES.flatMap(th => {
  const R = REGION[th.id], r = rand(th.signals * 13 + th.id.length * 7);
  const at = [{ x: R.x, y: R.y, w: 1.3, s: 0.36 }, ...theoriesIn(th.id).map(t => ({ ...pinPos(t), w: t.draft ? 0.6 : 1, s: 0.2 }))];
  const total = at.reduce((a, b) => a + b.w, 0);
  return [...Array(th.signals)].map((_, i) => {
    let pick = r() * total, a = at[0];
    for (const c of at) { pick -= c.w; if (pick <= 0) { a = c; break; } }
    let x = a.x + gauss(r) * R.r * a.s, y = a.y + gauss(r) * R.r * a.s;
    const dx = x - R.x, dy = y - R.y, d = Math.hypot(dx, dy), max = R.r * 0.9;
    if (d > max) { x = R.x + (dx / d) * max; y = R.y + (dy / d) * max; }
    const themes = [th.id, ...THEMES.filter(o => o.id !== th.id && Math.hypot(x - REGION[o.id].x, y - REGION[o.id].y) < REGION[o.id].r * 0.78).map(o => o.id)].slice(0, 2);
    return { id: `${th.id}${i}`, theme: th.id, themes, x, y, fresh: i < th.fresh, ax: a.x, ay: a.y, d: Math.hypot(x - a.x, y - a.y) };
  });
});

/* ── Paths ── */
type P = [number, number];
const f1 = (n: number) => Math.round(n * 10) / 10;
/** A closed Catmull-Rom spline through the points, as cubic Béziers. */
export function closedSpline(pts: P[], tension = 1) {
  const n = pts.length;
  if (n < 3) return "";
  let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const t = tension / 6;
    d += `C${f1(p1[0] + (p2[0] - p0[0]) * t)},${f1(p1[1] + (p2[1] - p0[1]) * t)} ${f1(p2[0] - (p3[0] - p1[0]) * t)},${f1(p2[1] - (p3[1] - p1[1]) * t)} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d + "Z";
}

/* ── Terrain: a density field and its isolines ── */
const G = 8, PAD = 3;
const GX = Math.ceil(W / G) + PAD * 2, GY = Math.ceil(H / G) + PAD * 2;

function field(sigs: Sig[], sigma: number) {
  const f = new Float32Array(GX * GY), cut = sigma * 3, k = 1 / (2 * sigma * sigma);
  for (const s of sigs) {
    const i0 = Math.max(0, Math.floor((s.x - cut) / G) + PAD), i1 = Math.min(GX - 1, Math.ceil((s.x + cut) / G) + PAD);
    const j0 = Math.max(0, Math.floor((s.y - cut) / G) + PAD), j1 = Math.min(GY - 1, Math.ceil((s.y + cut) / G) + PAD);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = (i - PAD) * G - s.x, dy = (j - PAD) * G - s.y;
      f[j * GX + i] += Math.exp(-(dx * dx + dy * dy) * k);
    }
  }
  // Keep the border at zero so every isoline closes.
  for (let i = 0; i < GX; i++) { f[i] = 0; f[(GY - 1) * GX + i] = 0; }
  for (let j = 0; j < GY; j++) { f[j * GX] = 0; f[j * GX + GX - 1] = 0; }
  return f;
}

/** Marching squares, with segments joined into closed rings in world coordinates. */
function isolines(f: Float32Array, lv: number): P[][] {
  const at = (i: number, j: number) => f[j * GX + i];
  const pt = new Map<string, P>(), link = new Map<string, string[]>();
  const edge = (key: string, i0: number, j0: number, i1: number, j1: number) => {
    if (!pt.has(key)) {
      const a = at(i0, j0), b = at(i1, j1), t = (lv - a) / (b - a || 1e-9);
      pt.set(key, [(i0 + (i1 - i0) * t - PAD) * G, (j0 + (j1 - j0) * t - PAD) * G]);
    }
    return key;
  };
  const seg = (a: string, b: string) => { (link.get(a) ?? link.set(a, []).get(a)!).push(b); (link.get(b) ?? link.set(b, []).get(b)!).push(a); };
  for (let j = 0; j < GY - 1; j++) for (let i = 0; i < GX - 1; i++) {
    const tl = at(i, j) >= lv ? 8 : 0, tr = at(i + 1, j) >= lv ? 4 : 0, br = at(i + 1, j + 1) >= lv ? 2 : 0, bl = at(i, j + 1) >= lv ? 1 : 0;
    const c = tl | tr | br | bl;
    if (c === 0 || c === 15) continue;
    const T = () => edge(`h${i},${j}`, i, j, i + 1, j), R = () => edge(`v${i + 1},${j}`, i + 1, j, i + 1, j + 1);
    const B = () => edge(`h${i},${j + 1}`, i, j + 1, i + 1, j + 1), L = () => edge(`v${i},${j}`, i, j, i, j + 1);
    const mid = (at(i, j) + at(i + 1, j) + at(i + 1, j + 1) + at(i, j + 1)) / 4 >= lv;
    switch (c) {
      case 1: case 14: seg(L(), B()); break;
      case 2: case 13: seg(B(), R()); break;
      case 3: case 12: seg(L(), R()); break;
      case 4: case 11: seg(T(), R()); break;
      case 6: case 9: seg(T(), B()); break;
      case 7: case 8: seg(L(), T()); break;
      case 5: if (mid) { seg(L(), T()); seg(B(), R()); } else { seg(L(), B()); seg(T(), R()); } break;
      case 10: if (mid) { seg(L(), B()); seg(T(), R()); } else { seg(L(), T()); seg(B(), R()); } break;
    }
  }
  const seen = new Set<string>(), rings: P[][] = [];
  for (const start of link.keys()) {
    if (seen.has(start)) continue;
    const ring: P[] = [];
    let prev = "", cur = start;
    while (cur && !seen.has(cur)) {
      seen.add(cur); ring.push(pt.get(cur)!);
      const next = link.get(cur)!.find(n => n !== prev && !seen.has(n));
      prev = cur; cur = next ?? "";
    }
    if (ring.length >= 4) rings.push(ring.filter((_, k) => k % 2 === 0 || ring.length < 12));
  }
  return rings;
}

/** A name goes at the top of its ground, or the bottom when the top sits inside another territory. */
function namePlace(id: string, top: number, bottom: number) {
  const R = REGION[id];
  const inOther = (y: number) => [-60, 0, 60].some(dx => Object.entries(REGION).some(([o, Q]) => o !== id && Math.hypot(R.x + dx - Q.x, y + 8 - Q.y) < Q.r * 0.92));
  return { x: R.x, y: inOther(top) && !inOther(bottom) ? bottom : top };
}

const bbox = (rings: P[][]) => rings.flat().reduce((b, [x, y]) => ({ x0: Math.min(b.x0, x), y0: Math.min(b.y0, y), x1: Math.max(b.x1, x), y1: Math.max(b.y1, y) }), { x0: W, y0: H, x1: 0, y1: 0 });
const ringsPath = (rings: P[][]) => rings.map(r => closedSpline(r, 0.9)).join("");
/** Rings smaller than this (in world px across) are one stray signal's bump: noise, not ground. */
const big = (r: P[]) => { const b = bbox([r]); return Math.max(b.x1 - b.x0, b.y1 - b.y0) > 26; };

/** Contour levels in units of one signal's peak height. */
export const LEVELS = [0.32, 0.95, 1.9, 3.1];
export type Terrain = { levels: string[]; hits: { id: string; d: string; name: { x: number; y: number } }[] };
let terrainCache: Terrain | undefined;
export function terrain(): Terrain {
  if (terrainCache) return terrainCache;
  const all = field(SIGS, 22);
  const levels = LEVELS.map(lv => ringsPath(isolines(all, lv).filter(big)));
  const hits = THEMES.map(th => {
    const rings = isolines(field(SIGS.filter(s => s.themes.includes(th.id)), 22), LEVELS[0]);
    // The territory is its largest landmass; stray specks would make poor click targets.
    const land = rings.filter(big).length ? rings.filter(big) : rings;
    const b = bbox(land);
    return { id: th.id, d: ringsPath(land), name: namePlace(th.id, b.y0 + 12, b.y1 - 30) };
  });
  return (terrainCache = { levels, hits });
}

/* ── Cartographic: an organic outline per theme, drawn through its signals ── */
export type Blob = { id: string; d: string; name: { x: number; y: number } };
let blobCache: Blob[] | undefined;
export function blobs(): Blob[] {
  if (blobCache) return blobCache;
  return (blobCache = THEMES.map(th => {
    const R = REGION[th.id], r = rand(th.id.charCodeAt(0) * 31 + th.signals);
    const own = SIGS.filter(s => s.themes.includes(th.id));
    const pins = theoriesIn(th.id).map(pinPos);
    const pts = [...own, ...pins];
    const N = 18;
    let rad = [...Array(N)].map((_, k) => {
      const a = (k / N) * Math.PI * 2;
      let m = R.r * 0.42;
      for (const p of pts) {
        const dx = p.x - R.x, dy = p.y - R.y, d = Math.hypot(dx, dy);
        const da = Math.abs(((Math.atan2(dy, dx) - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (da < Math.PI / 7) m = Math.max(m, d * Math.cos(da) + 18);
      }
      return Math.min(R.r * 1.02, m);
    });
    for (let pass = 0; pass < 2; pass++) rad = rad.map((v, k) => (rad[(k - 1 + N) % N] + v * 2 + rad[(k + 1) % N]) / 4);
    const ring: P[] = rad.map((v, k) => {
      const a = (k / N) * Math.PI * 2 + (r() - 0.5) * 0.12, j = 1 + (r() - 0.5) * 0.1;
      return [R.x + Math.cos(a) * v * j, R.y + Math.sin(a) * v * j];
    });
    const ys = ring.map(p => p[1]);
    return { id: th.id, d: closedSpline(ring, 1), name: namePlace(th.id, Math.min(...ys) + 16, Math.max(...ys) - 34) };
  }));
}

/* ── Tiles: each signal takes a hex, packed tight around what it feeds ── */
export const HEX = 9.5;
export type Cell = { id: string; x: number; y: number; themes: string[]; fresh: boolean };
export type Tiles = { cells: Cell[]; names: Record<string, { x: number; y: number }>; hex: string; halves: [string, string] };
let tileCache: Tiles | undefined;
export function tiles(): Tiles {
  if (tileCache) return tileCache;
  const w = Math.sqrt(3) * HEX;
  const centre = (q: number, rr: number) => ({ x: w * (q + rr / 2), y: 1.5 * HEX * rr });
  const toAxial = (x: number, y: number) => {
    const qf = (Math.sqrt(3) / 3 * x - y / 3) / HEX, rf = (2 / 3 * y) / HEX, sf = -qf - rf;
    let q = Math.round(qf), r = Math.round(rf); const s = Math.round(sf);
    const dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s - sf);
    if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
    return [q, r] as const;
  };
  // Each theme grows as one clump from its centre: every signal takes the free cell touching its theme
  // that sits nearest where the signal wants to be (pulled in toward the theory it feeds).
  const taken = new Set<string>(), cells: Cell[] = [];
  const NB = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  for (const th of [...THEMES].sort((a, b) => b.signals - a.signals)) {
    const R = REGION[th.id], mine = SIGS.filter(s => s.theme === th.id)
      .map(s => ({ s, tx: s.ax + (s.x - s.ax) * 0.4, ty: s.ay + (s.y - s.ay) * 0.4 }))
      .sort((a, b) => Math.hypot(a.tx - R.x, a.ty - R.y) - Math.hypot(b.tx - R.x, b.ty - R.y));
    const own: [number, number][] = [];
    for (const { s, tx, ty } of mine) {
      let cand: [number, number][];
      if (!own.length) { const [q, r] = toAxial(R.x, R.y); cand = [[q, r]]; for (let k = 1; k < 4; k++) for (const [dq, dr] of NB) cand.push([q + dq * k, r + dr * k]); }
      else cand = own.flatMap(([q, r]) => NB.map(([dq, dr]) => [q + dq, r + dr] as [number, number]));
      let best: [number, number] | undefined, bd = Infinity;
      for (const [q, r] of cand) {
        if (taken.has(`${q},${r}`)) continue;
        // Nearest to where it wants to be, but a cell hugged by more of its own theme wins: clumps, not chains.
        const c = centre(q, r), hug = NB.filter(([dq, dr]) => own.some(o => o[0] === q + dq && o[1] === r + dr)).length;
        const d = Math.hypot(c.x - tx, c.y - ty) - hug * HEX * 1.1;
        if (d < bd) { bd = d; best = [q, r]; }
      }
      if (!best) continue;
      taken.add(`${best[0]},${best[1]}`); own.push(best);
      const c = centre(best[0], best[1]);
      cells.push({ id: s.id, x: c.x, y: c.y, themes: s.themes, fresh: s.fresh });
    }
  }
  const names: Tiles["names"] = {};
  for (const th of THEMES) {
    const mine = cells.filter(c => c.themes[0] === th.id);
    names[th.id] = { x: REGION[th.id].x, y: Math.min(...mine.map(c => c.y)) - HEX - 22 };
  }
  // One hex (pointy top) drawn a hair small so cells read as tiles, plus its left and right halves.
  const k = HEX - 0.9, pts = [...Array(6)].map((_, i) => { const a = Math.PI / 180 * (60 * i - 90); return [f1(Math.cos(a) * k), f1(Math.sin(a) * k)] as P; });
  const hex = `M${pts.map(p => p.join(",")).join("L")}Z`;
  const halves: [string, string] = [`M${[pts[0], pts[5], pts[4], pts[3]].map(p => p.join(",")).join("L")}Z`, `M${[pts[0], pts[1], pts[2], pts[3]].map(p => p.join(",")).join("L")}Z`];
  return (tileCache = { cells, names, hex, halves });
}
