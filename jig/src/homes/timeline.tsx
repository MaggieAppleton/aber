import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { THEMES, THEORIES, theoriesIn, type Theory } from "./data";
import { Icon, Mark, Conf } from "./atoms";
import { useEdit, setEdit } from "./edits";
import { ThemeName, type ObjKind, type OnOpen } from "./panes";

/*
 * Timeline: a chart of the future. x = the year a theory says it happens by, y = how sure I am (top = surest).
 * Drafts have no confidence yet, so they wait in a strip under the chart. Cards read live values from the edits store,
 * so changing confidence or horizon anywhere moves the card here; dragging a card here writes back to the store.
 */

const Y0 = 2026, Y1 = 2032, YEARS = Array.from({ length: Y1 - Y0 + 1 }, (_, i) => Y0 + i);
const NOW = Y0 + (31 + 28 + 31 + 30 + 31 + 30 + 31 + 31 + 30 + 31) / 365;   // 31 Oct 2026
const GUTTER = 76, RIGHT = 24, PT = 76, CARD_H = 64, GAP = 8, DRAFT_GAP = 26;
const SPRING = { type: "spring", stiffness: 380, damping: 34 } as const;

type Live = Theory & { at: { x: number; y: number } };

/** Spread cards that share a column so they never overlap: merge colliding neighbours into runs, centre each run on its ideals. */
function spread(items: { id: string; y: number }[], top: number, bottom: number) {
  const out = new Map<string, number>();
  const runs: { ids: string[]; ideal: number[] }[] = [];
  for (const it of [...items].sort((a, b) => a.y - b.y)) {
    runs.push({ ids: [it.id], ideal: [it.y] });
    while (runs.length > 1 && placedBottom(runs[runs.length - 2]) + GAP > placedTop(runs[runs.length - 1])) {
      const b = runs.pop()!, a = runs.at(-1)!;
      a.ids.push(...b.ids); a.ideal.push(...b.ideal);
    }
  }
  for (const r of runs) {
    const t = Math.max(top, Math.min(placedTop(r), bottom - runH(r.ids.length)));
    r.ids.forEach((id, i) => out.set(id, t + i * (CARD_H + GAP)));
  }
  return out;
}
const runH = (n: number) => n * CARD_H + (n - 1) * GAP;
const placedTop = (r: { ids: string[]; ideal: number[] }) => r.ideal.reduce((a, b) => a + b, 0) / r.ideal.length - runH(r.ids.length) / 2;
const placedBottom = (r: { ids: string[]; ideal: number[] }) => placedTop(r) + runH(r.ids.length);

export function Timeline({ width, height, open, onOpen }: { width: number; height: number; open?: { kind: ObjKind; id: string }; onOpen: OnOpen }) {
  const reduced = useReducedMotion();
  // Live values for every theory (a fixed list, so the hooks run in a stable order).
  const edits = THEORIES.map(t => useEdit("theory", t.id)[0]);
  const [filter, setFilter] = useState<string>();
  const [hover, setHover] = useState<string>();
  const [hot, setHot] = useState<string>();
  const dwell = useRef<number>(undefined);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const start = useRef<{ x: number; y: number; id: string } | null>(null);
  const justDragged = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);

  const yw = Math.max(160, Math.floor((width - GUTTER - RIGHT) / YEARS.length));
  const cw = Math.min(yw - 24, 196);
  const chartW = GUTTER + yw * YEARS.length + RIGHT;
  const pb = height - 166;
  const rh = (pb - PT) / 5;
  const draftY = pb + DRAFT_GAP;
  const xOf = (year: number) => GUTTER + (year - Y0) * yw;
  const yOf = (conf: number) => PT + (5 - conf + 0.5) * rh;

  // Ideal slots, then spread within each year column.
  const live: Live[] = useMemo(() => {
    const ts = THEORIES.map((t, i) => ({ ...t, claim: edits[i].claim, confidence: t.draft ? null : edits[i].confidence, horizon: Math.min(Y1, Math.max(Y0, edits[i].horizon)) }));
    const pos = new Map<string, { x: number; y: number }>();
    for (const year of YEARS) {
      const held = ts.filter(t => !t.draft && t.horizon === year);
      const ys = spread(held.map(t => ({ id: t.id, y: yOf(t.confidence ?? 1) })), PT + 4, pb - 4);
      held.forEach(t => pos.set(t.id, { x: xOf(year) + (yw - cw) / 2, y: ys.get(t.id)! }));
    }
    // Drafts wait in one row under the chart, at their year where there is room, pushed right where there isn't.
    let edge = -Infinity;
    for (const t of ts.filter(t => t.draft).sort((a, b) => a.horizon - b.horizon)) {
      const x = Math.max(xOf(t.horizon) + (yw - cw) / 2, edge + GAP);
      pos.set(t.id, { x, y: draftY });
      edge = x + cw;
    }
    return ts.map(t => ({ ...t, at: pos.get(t.id)! }));
  }, [edits.map(e => `${e.claim}${e.confidence}${e.horizon}`).join("|"), yw, cw, height]);
  const byId = new Map(live.map(t => [t.id, t]));

  // Where a card is drawn: its slot, or under the pointer while dragged.
  const drawn = (t: Live) => (drag?.id === t.id ? { x: t.at.x + drag.dx, y: t.at.y + drag.dy } : t.at);
  const snap = (t: Live) => {
    const p = drawn(t);
    const year = Math.min(Y1, Math.max(Y0, Math.round((p.x - (yw - cw) / 2 - GUTTER) / yw) + Y0));
    const conf = t.draft ? null : Math.min(5, Math.max(1, Math.round(5 - (p.y + CARD_H / 2 - PT) / rh + 0.5)));
    return { year, conf };
  };

  const focus = hot;
  const related = useMemo(() => {
    if (!focus) return undefined;
    const t = byId.get(focus)!;
    return new Set([focus, ...t.follows, ...t.rivals, ...live.filter(x => x.follows.includes(focus) || x.rivals.includes(focus)).map(x => x.id)]);
  }, [focus, live]);
  const inFilter = (t: Theory) => !filter || t.themes.includes(filter);
  const dim = (t: Theory) => !inFilter(t) || (related ? !related.has(t.id) : false);

  // Keep the open theory in view when the chart is narrower than its viewport (scroll the chart, never the page).
  useEffect(() => {
    const el = scroller.current;
    const t = open?.kind === "theory" ? byId.get(open.id) : undefined;
    if (!el || !t) return;
    const id = window.setTimeout(() => {
      const l = t.at.x - 24, r = t.at.x + cw + 24;
      if (l < el.scrollLeft) el.scrollTo({ left: l, behavior: "smooth" });
      else if (r > el.scrollLeft + el.clientWidth) el.scrollTo({ left: r - el.clientWidth, behavior: "smooth" });
    }, 420);
    return () => clearTimeout(id);
  }, [open?.kind, open?.id, width]);

  const enter = (id: string) => { setHover(id); clearTimeout(dwell.current); dwell.current = window.setTimeout(() => setHot(id), 300); };
  const leave = (id: string) => { setHover(h => (h === id ? undefined : h)); clearTimeout(dwell.current); setHot(h => (h === id ? undefined : h)); };
  useEffect(() => () => clearTimeout(dwell.current), []);

  const onDown = (e: RPointerEvent, id: string) => {
    if (e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY, id };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    const t = byId.get(s.id)!;
    if (!drag && Math.hypot(dx, dy) < 5) return;
    setHot(undefined); clearTimeout(dwell.current);
    setDrag({ id: s.id, dx, dy: t.draft ? 0 : dy, moved: true });
  };
  const onUp = () => {
    const s = start.current;
    start.current = null;
    if (!s || !drag) return;
    const t = byId.get(s.id)!;
    const { year, conf } = snap(t);
    setEdit("theory", t.id, t.draft ? { horizon: year } : { horizon: year, confidence: conf });
    justDragged.current = true;
    setDrag(null);
  };
  const target = drag ? (() => { const t = byId.get(drag.id)!; const { year, conf } = snap(t); return { x: xOf(year) + (yw - cw) / 2, y: t.draft ? t.at.y : yOf(conf!) - CARD_H / 2 }; })() : null;

  const arrows = live.flatMap(t => t.follows.map(from => ({ from: byId.get(from)!, to: t })));
  // Arrows run cause to consequence: out of the right edge, into the left edge; into a waiting draft from above.
  // Arrows that skip a column bow upward so they never read as passing through the card between.
  // Several arrows meeting one edge spread along it; arrows into drafts each get their own lane under the chart.
  const slot = (list: string[], id: string) => (list.indexOf(id) - (list.length - 1) / 2) * 10;
  const ins = (t: Live) => t.follows.filter(f => byId.has(f));
  const outs = (t: Live) => live.filter(x => x.follows.includes(t.id) && !x.draft).map(x => x.id);
  const draftLanes = arrows.filter(r => r.to.draft && !r.from.draft).map(r => `${r.from.id}-${r.to.id}`);
  const path = (a: Live, b: Live) => {
    const p = drawn(a), q = drawn(b);
    const x1 = p.x + cw, y1 = p.y + CARD_H / 2 + (b.draft ? 0 : slot(outs(a), b.id));
    if (b.draft && !a.draft) {
      // Down the next year line (cards never sit on it), along under the chart, then into the draft from above.
      const lane = draftLanes.indexOf(`${a.id}-${b.id}`);
      const gx = xOf(Math.min(Y1 + 1, a.horizon + 1)) + lane * 4, sy = pb + 15 + (lane % 2) * 5, tx = q.x + Math.min(cw / 2, 36) + lane * 6, r = 6;
      const sx = Math.sign(tx - gx) || 1;
      return `M ${x1} ${y1} L ${gx - r} ${y1} Q ${gx} ${y1} ${gx} ${y1 + r} L ${gx} ${sy - r} Q ${gx} ${sy} ${gx + sx * r} ${sy} L ${tx - sx * r} ${sy} Q ${tx} ${sy} ${tx} ${sy + r} L ${tx} ${q.y - 4}`;
    }
    if (q.x >= x1 - 4) {
      const x2 = q.x - 4, y2 = q.y + CARD_H / 2 + slot(ins(b), a.id);
      const k = Math.max(30, (x2 - x1) / 2);
      const others = live.filter(t => t.id !== a.id && t.id !== b.id && !t.draft).map(drawn);
      // Bow over any card standing between the two ends.
      const between = others.filter(c => c.x + cw > x1 + 8 && c.x < x2 - 8);
      const minTop = Math.min(...between.map(c => c.y), Infinity);
      const lift = between.length ? Math.min(0, (minTop - 14 - (y1 + y2) / 2) / 0.75) : 0;
      // A card just left of the target in its row: drop into the gap from above (or below) instead of running through it.
      const blockIn = others.find(c => c.x < x2 && c.x + cw > x2 - 40 && Math.abs(c.y - q.y) < CARD_H);
      const blockOut = others.find(c => c.x > x1 - 4 && c.x < x1 + 40 && Math.abs(c.y - p.y) < CARD_H);
      const c1 = blockOut ? `${x1 + 6} ${y1 + (q.y < p.y ? -90 : 90)}` : `${x1 + k} ${y1 + lift}`;
      const c2 = blockIn ? `${x2 - 6} ${y2 + (p.y < q.y ? -90 : 90)}` : `${x2 - k} ${y2 + lift}`;
      return `M ${x1} ${y1} C ${c1} ${c2} ${x2} ${y2}`;
    }
    // Backwards (a consequence dated before its cause): loop under from the bottom edge to the bottom edge.
    const bx = p.x + cw / 2, by = p.y + CARD_H, ex = q.x + cw / 2, ey = q.y + CARD_H + 4;
    return `M ${bx} ${by} C ${bx} ${by + 60} ${ex} ${ey + 60} ${ex} ${ey}`;
  };
  const instant = reduced || !!drag;

  return (
    <div className="ap tl" data-hosted="" style={{ width, height }}>
      <div className="tl-scroll" ref={scroller}>
        <div className="tl-chart" style={{ width: chartW, height }} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { start.current = null; setDrag(null); }}>
          <div className="tl-filter" role="group" aria-label="Themes">
            {THEMES.map(th => {
              const on = filter === th.id, empty = theoriesIn(th.id).length === 0;
              return (
                <button key={th.id} className="tl-chip" aria-pressed={on} title={on ? "Show every theme" : "Only this theme"} onClick={() => setFilter(f => (f === th.id ? undefined : th.id))}>
                  <Icon name="theme" size={13} weight={on ? "fill" : "regular"} /><ThemeName id={th.id} />
                  {empty ? <Mark kind="open" /> : th.fresh > 0 ? <Mark kind="fresh" /> : null}
                </button>
              );
            })}
          </div>

          {YEARS.map(y => (
            <span key={y} className="tl-year ap-num" style={{ left: xOf(y), top: PT - 26 }}>{y}</span>
          ))}
          {YEARS.map(y => <i key={y} className="tl-vline" style={{ left: xOf(y), top: PT - 6, height: pb - PT + 6 }} />)}
          {[5, 4, 3, 2, 1].map(c => (
            <span key={c} className="tl-conf" style={{ top: yOf(c) - 6, left: 8 }} title={`Confidence ${c} of 5`}><Conf n={c} /></span>
          ))}
          <i className="tl-now" style={{ left: xOf(NOW), top: PT - 30, height: pb - PT + 30 }} title="Today" />
          <i className="tl-floor" style={{ top: pb + 10, left: GUTTER, width: yw * YEARS.length }} />

          <svg className="tl-arrows" width={chartW} height={height} aria-hidden>
            <defs>
              <marker id="tl-head" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M 1 1 L 7 4 L 1 7" fill="none" stroke="context-stroke" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </marker>
            </defs>
            {arrows.map(({ from, to }) => {
              const lit = related ? related.has(from.id) && related.has(to.id) && (from.id === focus || to.id === focus) : false;
              const faded = (!!related && !lit) || !inFilter(from) || !inFilter(to);
              return (
                <motion.path key={`${from.id}-${to.id}`} className="tl-arrow" data-lit={lit ? "" : undefined} data-draft={to.draft ? "" : undefined}
                  initial={false} animate={{ d: path(from, to), opacity: faded ? 0.25 : 1 }} transition={instant ? { duration: 0 } : SPRING}
                  markerEnd="url(#tl-head)" />
              );
            })}
          </svg>

          {target && <motion.i className="tl-slot" initial={false} animate={{ x: target.x, y: target.y }} transition={{ type: "spring", stiffness: 600, damping: 40 }} style={{ width: cw, height: CARD_H }} />}

          {live.map(t => {
            const p = drawn(t);
            const isOpen = open?.kind === "theory" && open.id === t.id;
            const dragging = drag?.id === t.id;
            return (
              <motion.button key={t.id} className="tl-card" data-draft={t.draft ? "" : undefined} data-open={isOpen ? "" : undefined} data-dim={dim(t) ? "" : undefined}
                data-hover={hover === t.id ? "" : undefined} data-dragging={dragging ? "" : undefined}
                data-pick={t.id} data-region={t.id} data-label={t.claim} data-kind="theory"
                style={{ width: cw, height: CARD_H, zIndex: dragging ? 4 : isOpen ? 2 : 1 }}
                initial={false} animate={{ x: p.x, y: p.y, scale: dragging ? 1.03 : 1, rotate: dragging ? -1 : 0 }}
                transition={dragging ? { x: { duration: 0 }, y: { duration: 0 }, default: { duration: 0.15 } } : reduced ? { duration: 0 } : SPRING}
                aria-label={t.claim}
                onPointerEnter={() => enter(t.id)} onPointerLeave={() => leave(t.id)} onFocus={() => enter(t.id)} onBlur={() => leave(t.id)}
                onPointerDown={e => onDown(e, t.id)}
                onClick={() => { if (justDragged.current) { justDragged.current = false; return; } onOpen("theory", t.id); }}>
                <span className="tl-claim">{t.claim}</span>
                <span className="tl-marks">
                  {t.challenge && <Mark kind="challenge" />}
                  {t.pending > 0 && <Mark kind="pending" n={t.pending} />}
                  {t.rivals.length > 0 && <span className="tl-rival" title={`Rival: ${t.rivals.map(r => byId.get(r)!.claim).join(", ")}`} aria-label="Has a rival"><Icon name="swap" size={12} /></span>}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
