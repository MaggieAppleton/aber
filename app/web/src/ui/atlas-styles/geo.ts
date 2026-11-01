import { onWorld } from "../../data/live";
import { THEMES, theoriesIn, type Theory } from "../data";

/** World size and the territory layout both map structures share. */
export const W = 1240, H = 760;
export const REGION: Record<string, {x:number;y:number;r:number}> = {};
/** Stable circle packing: largest themes first, positioned on a golden-angle spiral. */
export function layoutRegions() {
  for(const key of Object.keys(REGION)) delete REGION[key];
  const ordered=[...THEMES].sort((a,b)=>b.signals-a.signals || a.id.localeCompare(b.id));
  const placed: {x:number;y:number;r:number}[]=[];
  ordered.forEach((theme,index)=>{
    const r=Math.min(185,Math.max(110,94+Math.sqrt(Math.max(0,theme.signals))*16,theme.name.length*3.6+24));
    let point={x:W/2,y:H/2,r};
    for(let step=0;step<12000;step++) {
      const angle=step*2.399963229728653, distance=Math.sqrt(step)*7;
      point={x:W/2+Math.cos(angle)*distance,y:H/2+Math.sin(angle)*distance*.72,r};
      if(placed.every(other=>Math.hypot(point.x-other.x,point.y-other.y) >= (r+other.r)*.96)) break;
    }
    REGION[theme.id]=point;placed.push(point);
  });
}
onWorld(layoutRegions);layoutRegions();

export function rand(seed: number) { return () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }

/** Where a theory sits: between its themes, or spread around its one theme's centre. */
export function pinPos(t: Theory) {
  const rs = t.themes.map(id => REGION[id]).filter(Boolean);
  if (!rs.length) return {x: W/2, y:H/2};
  const cx = rs.reduce((a, r) => a + r.x, 0) / rs.length, cy = rs.reduce((a, r) => a + r.y, 0) / rs.length;
  if (rs.length > 1) return { x: cx, y: cy };
  const siblings = theoriesIn(t.themes[0]).filter(x => x.themes.length === 1);
  const k = siblings.findIndex(x => x.id === t.id), n = siblings.length;
  const a = (k / Math.max(1, n)) * Math.PI * 2 - Math.PI / 4;
  const d = n === 1 ? 0 : rs[0].r * 0.45;
  return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d };
}

/* ── Signals: one deterministic set for terrain, clustered around the theories they feed ── */
export type Sig = { id: string; theme: string; themes: string[]; x: number; y: number; fresh: boolean };

function gauss(r: () => number) { return Math.sqrt(-2 * Math.log(Math.max(1e-6, r()))) * Math.cos(2 * Math.PI * r()); }

export let SIGS: Sig[] = [];
function layoutSignals() {
  SIGS=THEMES.flatMap(th=>{
    const region=REGION[th.id], random=rand(th.signals*13+th.id.length*7);
    return Array.from({length:th.signals},(_,index)=>{
      const angle=random()*Math.PI*2, radius=Math.sqrt(random())*region.r*.85;
      return {id:`${th.id}:${index}`,theme:th.id,themes:[th.id],x:region.x+Math.cos(angle)*radius,y:region.y+Math.sin(angle)*radius,fresh:index<th.fresh};
    });
  });
}
onWorld(layoutSignals);layoutSignals();

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
