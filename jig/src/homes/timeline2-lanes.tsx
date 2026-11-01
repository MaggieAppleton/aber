import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { THEMES } from "./data";
import { Icon, Conf } from "./atoms";
import { setEdit } from "./edits";
import { ThemeName } from "./panes";
import type { Scale } from "./timeline2-data";
import { LensFrame, Marks, ThemePicker, chainOf, useDwell, useLive, useOpen, yearsFor, type Live } from "./timeline2-shared";

/*
 * B. Lanes. One lane per theme, years across. A theory sits in every lane it positions on (hovering one copy rings
 * the others). Confidence is a small meter on the card. Lanes fold to a strip of dots, so 150 themes stay a list
 * you can scan; the theme picker opens and folds lanes. Selecting a theory draws its chain across lanes.
 */

const HEAD = 196, MIN_COL = 172;

export function Lanes({ scale }: { scale: Scale }) {
  const { obj, onOpen, close, selected } = useOpen();
  return (
    <LensFrame obj={obj} onOpen={onOpen} onClose={close} className="t2b">
      {w => <LanesView scale={scale} width={w} selected={selected} onOpen={onOpen} />}
    </LensFrame>
  );
}

type Box = { x: number; y: number; w: number; h: number };

function LanesView({ scale, width, selected, onOpen }: { scale: Scale; width: number; selected?: string; onOpen: (k: "theory" | "theme", id: string) => void }) {
  const live = useLive(scale);
  const years = yearsFor(live);
  const colW = Math.max(MIN_COL, Math.floor((width - HEAD - 12) / years.length));
  const dwell = useDwell();
  const chain = useMemo(() => chainOf(selected, live), [selected, live]);

  const lanes = useMemo(() => THEMES.map(th => ({ id: th.id, ts: live.filter(t => t.themes.includes(th.id)) }))
    .filter(l => l.ts.length > 0).sort((a, b) => b.ts.length - a.ts.length), [live]);
  const [folded, setFolded] = useState<Set<string>>(() => new Set(scale === "year1" ? lanes.slice(2).map(l => l.id) : []));
  const toggle = (id: string) => setFolded(f => { const n = new Set(f); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOpen = folded.size === 0;
  // A theory gets one card, in the first open lane it belongs to; other open lanes show a light reference.
  const order = new Map(lanes.map((l, i) => [l.id, i]));
  const home = (t: Live) => [...t.themes].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99)).find(th => !folded.has(th));

  /* ── measure chain cards so links can be drawn across lanes ── */
  const grid = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Map<string, Box[]>>(new Map());
  useLayoutEffect(() => {
    const g = grid.current;
    if (!g || !selected) { setBoxes(new Map()); return; }
    const gr = g.getBoundingClientRect(), m = new Map<string, Box[]>();
    g.querySelectorAll<HTMLElement>("[data-tid]").forEach(el => {
      const id = el.dataset.tid!; if (!chain.has(id)) return;
      const r = el.getBoundingClientRect();
      m.set(id, [...(m.get(id) ?? []), { x: r.left - gr.left, y: r.top - gr.top, w: r.width, h: r.height }]);
    });
    setBoxes(m);
  }, [selected, chain, folded, width, live]);

  // Bring the selected card into view by scrolling the lane view (never the page).
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const s = scroller.current, b = selected && boxes.get(selected)?.[0];
    if (!s || !b) return;
    const left = b.x - HEAD - 24, top = b.y - 52 - 24;
    const x = b.x < s.scrollLeft + HEAD || b.x + b.w > s.scrollLeft + s.clientWidth ? Math.max(0, left) : s.scrollLeft;
    const y = b.y < s.scrollTop + 52 || b.y + b.h > s.scrollTop + s.clientHeight ? Math.max(0, top) : s.scrollTop;
    if (x !== s.scrollLeft || y !== s.scrollTop) s.scrollTo({ left: x, top: y, behavior: "smooth" });
  }, [boxes]);
  const nearest = (a: string, b: string) => {
    let best: [Box, Box] | undefined, d = Infinity;
    for (const p of boxes.get(a) ?? []) for (const q of boxes.get(b) ?? []) { const k = Math.hypot(q.x - p.x, q.y - p.y); if (k < d) { d = k; best = [p, q]; } }
    return best;
  };
  const link = (p: Box, q: Box) => {
    const y1 = p.y + p.h / 2, y2 = q.y + q.h / 2;
    if (q.x > p.x + p.w + 8) { const x1 = p.x + p.w, x2 = q.x - 3, k = Math.max(24, (x2 - x1) / 2); return `M ${x1} ${y1} C ${x1 + k} ${y1}, ${x2 - k} ${y2}, ${x2} ${y2}`; }
    const x1 = p.x, x2 = q.x - 3, k = 28; return `M ${x1} ${y1} C ${x1 - k} ${y1}, ${x2 - k} ${y2}, ${x2} ${y2}`;
  };

  /* ── drag a card sideways to change its horizon ── */
  const [drag, setDrag] = useState<{ id: string; lane: string; dx: number } | null>(null);
  const start = useRef<{ id: string; lane: string; x: number } | null>(null);
  const justDragged = useRef(false);
  const onDown = (e: RPointerEvent, id: string, lane: string) => { if (e.button !== 0) return; start.current = { id, lane, x: e.clientX }; (e.currentTarget as Element).setPointerCapture(e.pointerId); };
  const onMove = (e: RPointerEvent) => { const s = start.current; if (!s) return; const dx = e.clientX - s.x; if (!drag && Math.abs(dx) < 5) return; dwell.clear(); setDrag({ id: s.id, lane: s.lane, dx }); };
  const onUp = () => {
    const s = start.current; start.current = null;
    if (!s || !drag) return;
    const t = live.find(x => x.id === s.id)!, yr = Math.max(years[0], Math.min(years.at(-1)!, t.horizon + Math.round(drag.dx / colW)));
    setEdit("theory", t.id, { horizon: yr }); justDragged.current = true; setDrag(null);
  };
  const dropYear = drag ? (() => { const t = live.find(x => x.id === drag.id)!; return Math.max(years[0], Math.min(years.at(-1)!, t.horizon + Math.round(drag.dx / colW))); })() : undefined;

  const card = (t: Live, lane: string) => {
    const dragging = drag?.id === t.id && drag.lane === lane;
    return (
      <button key={t.id} className="t2b-card" data-tid={t.id} data-draft={t.draft ? "" : undefined} data-sel={selected === t.id ? "" : undefined}
        data-dim={selected && !chain.has(t.id) ? "" : undefined} data-twin={dwell.hover === t.id ? "" : undefined} data-dragging={dragging ? "" : undefined}
        style={dragging ? { transform: `translateX(${drag!.dx}px) rotate(-0.6deg)` } : undefined}
        aria-label={t.claim} onPointerEnter={() => dwell.enter(t.id)} onPointerLeave={() => dwell.leave(t.id)}
        onPointerDown={e => onDown(e, t.id, lane)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { start.current = null; setDrag(null); }}
        onClick={() => { if (justDragged.current) { justDragged.current = false; return; } onOpen("theory", t.id); }}>
        <span className="t2b-claim">{t.claim}</span>
        <span className="t2b-meta">{!t.draft && <Conf n={t.confidence} />}<Marks t={t} rivalName={t.rivals.map(r => live.find(x => x.id === r)?.claim).filter(Boolean).join(", ")} /></span>
      </button>
    );
  };

  return (
    <div className="t2b-scroll ap-scroll" ref={scroller}>
      <div className="t2b-grid" ref={grid} style={{ gridTemplateColumns: `${HEAD}px repeat(${years.length}, ${colW}px)` }}>
        <div className="t2b-corner">
          <ThemePicker scale={scale} live={live} mode="lanes" folded={folded} onToggleFold={toggle} />
          <button className="t2-tool" aria-label={allOpen ? "Fold every lane" : "Open every lane"} title={allOpen ? "Fold every lane" : "Open every lane"}
            onClick={() => setFolded(allOpen ? new Set(lanes.map(l => l.id)) : new Set())}><Icon name={allOpen ? "collapse" : "expand"} size={15} /></button>
        </div>
        {years.map(y => <div key={y} className="t2b-year ap-num">{y}</div>)}

        {lanes.map(l => {
          const isFolded = folded.has(l.id);
          return [
            <div key={`h${l.id}`} className="t2b-lanehead" data-folded={isFolded ? "" : undefined}>
              <button className="t2b-fold" aria-label={isFolded ? "Open lane" : "Fold lane"} title={isFolded ? "Open lane" : "Fold lane"} aria-expanded={!isFolded} onClick={() => toggle(l.id)}>
                <Icon name={isFolded ? "chevron" : "down"} size={12} />
              </button>
              <button className="t2b-lanename" onClick={() => onOpen("theme", l.id)} title="Open theme"><ThemeName id={l.id} /></button>
              <span className="ap-num ap-muted">{l.ts.length}</span>
            </div>,
            ...years.map(y => {
              const ts = l.ts.filter(t => t.horizon === y).sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
              const target = drag && drag.lane === l.id && dropYear === y;
              return isFolded ? (
                <div key={`${l.id}${y}`} className="t2b-cell" data-folded="" onClick={() => toggle(l.id)}>
                  {ts.map(t => <button key={t.id} className="t2b-pip" data-tid={t.id} data-draft={t.draft ? "" : undefined} data-dim={selected && !chain.has(t.id) ? "" : undefined} data-sel={selected === t.id ? "" : undefined}
                    title={t.claim} aria-label={t.claim} onClick={e => { e.stopPropagation(); onOpen("theory", t.id); }} />)}
                </div>
              ) : (
                <div key={`${l.id}${y}`} className="t2b-cell" data-target={target ? "" : undefined}>
                  {ts.filter(t => home(t) === l.id).map(t => card(t, l.id))}
                  {ts.filter(t => home(t) !== l.id).map(t => (
                    <button key={t.id} className="t2b-ref" data-tid={t.id} data-draft={t.draft ? "" : undefined} data-dim={selected && !chain.has(t.id) ? "" : undefined} data-sel={selected === t.id ? "" : undefined}
                      data-twin={dwell.hover === t.id ? "" : undefined} title={`In ${THEMES.find(x => x.id === home(t))?.name}`} aria-label={t.claim}
                      onPointerEnter={() => dwell.enter(t.id)} onPointerLeave={() => dwell.leave(t.id)} onClick={() => onOpen("theory", t.id)}>
                      <Icon name="theory" size={12} /><span>{t.claim}</span>
                    </button>
                  ))}
                </div>
              );
            }),
          ];
        })}

        {selected && (
          <svg className="t2b-links" aria-hidden>
            <defs><marker id="t2b-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 1 1.5 L 8.5 5 L 1 8.5 Z" fill="context-stroke" /></marker></defs>
            {chain.rivals.map(([a, b]) => { const n = nearest(a, b); return n && <path key={`r${a}${b}`} className="t2-rival-line" d={link(n[0], n[1])} />; })}
            {chain.edges.map(([a, b]) => { const n = nearest(a, b); return n && <path key={`${a}>${b}`} className="t2-link" d={link(n[0], n[1])} markerEnd="url(#t2b-head)" />; })}
          </svg>
        )}
      </div>
    </div>
  );
}
