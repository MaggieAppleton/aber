/**
 * Claim labels that never sit on a pin or another label.
 *
 * Pins and labels are counter-scaled, so their on-screen size is k = min(1, 0.55 + 0.45·scale) times their
 * natural size while the distance between pins grows with scale. Layout runs in natural (label) pixels:
 * a pin's offset from another is its world offset × scale / k. Translation does not change collisions,
 * so only the viewport edge (which side has room) depends on where the camera is.
 */
/** r: how far the label sits from the anchor; ro: the anchor's own radius as an obstacle (default r). */
export type LabelPin = { id: string; x: number; y: number; r: number; ro?: number; prio: number };
/** Marks that labels must keep off but that have no label of their own (world centre, natural radius). */
export type Obstacle = { x: number; y: number; r: number };
export type Place = { side: 1 | -1; dy: number };
type Box = { x0: number; y0: number; x1: number; y1: number };

export const GAP = 6;
/** Vertical nudges tried on each side before giving up; any nudge gets a leader. */
const NUDGES = [0, -12, 12, -22, 22];
const PAD = 2;

export const pinScale = (scale: number) => Math.min(1, 0.55 + 0.45 * scale);

const hit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const hitCircle = (a: Box, cx: number, cy: number, r: number) => {
  const nx = Math.max(a.x0, Math.min(cx, a.x1)), ny = Math.max(a.y0, Math.min(cy, a.y1));
  return (nx - cx) ** 2 + (ny - cy) ** 2 < r * r;
};

export function boxOf(p: { x: number; y: number; r: number }, size: { w: number; h: number }, pl: Place): Box {
  const x0 = pl.side > 0 ? p.x + p.r + GAP : p.x - p.r - GAP - size.w;
  const y0 = p.y - size.h / 2 + pl.dy;
  return { x0, y0, x1: x0 + size.w, y1: y0 + size.h };
}

/**
 * Place the wanted labels in priority order. Returns a place for each label that fits; a label with no clear
 * spot is left out (it shows on hover or selection instead). Forced labels always get a place. `extra` (the hovered
 * landmark) is placed last, after the rest have settled, so hovering never reshuffles the other labels.
 */
export function placeLabels({ pins, obstacles = [], wanted, forced, extra, sizes, scale, tx, vw }: {
  pins: LabelPin[]; obstacles?: Obstacle[]; wanted: Set<string>; forced: Set<string>; extra?: string; sizes: Record<string, { w: number; h: number }>;
  scale: number; tx: number; vw: number;
}): Record<string, Place> {
  const k = pinScale(scale), u = scale / k;
  const at = new Map(pins.map(p => [p.id, { x: p.x * u, y: p.y * u, r: p.r, ro: p.ro ?? p.r }]));
  const obs = obstacles.map(o => ({ x: o.x * u, y: o.y * u, r: o.r }));
  const placed: Box[] = [], out: Record<string, Place> = {};
  const order = pins.filter(p => wanted.has(p.id) || forced.has(p.id))
    .sort((a, b) => Number(forced.has(b.id)) - Number(forced.has(a.id)) || b.prio - a.prio);
  const last = extra && !order.some(p => p.id === extra) ? pins.find(p => p.id === extra) : undefined;
  if (last) order.push(last);
  for (const p of order) {
    const size = sizes[p.id];
    if (!size) continue;
    const me = at.get(p.id)!;
    // Read towards whichever side has room on screen.
    const sx = p.x * scale + tx, room = (size.w + me.r + GAP) * k + 12;
    const sides: (1 | -1)[] = sx + room > vw && sx - room > 0 ? [-1, 1] : [1, -1];
    let best: Place | undefined;
    const clear = (b: Box) => !placed.some(o => hit(b, o)) && ![...at].some(([id, q]) => id !== p.id && q.ro > 0 && hitCircle(b, q.x, q.y, q.ro + PAD))
      && !obs.some(q => hitCircle(b, q.x, q.y, q.r + PAD));
    search: for (const dy of NUDGES) for (const side of sides) {
      if (clear(boxOf(me, size, { side, dy }))) { best = { side, dy }; break search; }
    }
    if (!best && (forced.has(p.id) || p === last)) best = { side: sides[0], dy: 0 };
    if (!best) continue;
    out[p.id] = best;
    const b = boxOf(me, size, best);
    placed.push({ x0: b.x0 - PAD, y0: b.y0 - PAD, x1: b.x1 + PAD, y1: b.y1 + PAD });
  }
  return out;
}
