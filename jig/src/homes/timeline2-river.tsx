import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon, Conf } from "./atoms";

const offsetIn = (el: HTMLElement, root: HTMLElement) => el.getBoundingClientRect().top - root.getBoundingClientRect().top;
import type { Scale } from "./timeline2-data";
import { LensFrame, Marks, ThemePicker, chainOf, useLive, useOpen, type Live } from "./timeline2-shared";

/*
 * C. River. Time runs down the page from now: one section per year, theories sorted by how sure I am, drafts last
 * and dashed. A rival sits beside its theory at rest, wherever it falls in time. Selecting a theory draws its
 * chain as rails in the left margin, like a branch graph; the year strip at the top is both index and density.
 */

export function River({ scale }: { scale: Scale }) {
  const { obj, onOpen, close, selected } = useOpen();
  return (
    <LensFrame obj={obj} onOpen={onOpen} onClose={close} className="t2c">
      {w => <RiverView scale={scale} width={w} selected={selected} onOpen={onOpen} />}
    </LensFrame>
  );
}

function RiverView({ scale, width, selected, onOpen }: { scale: Scale; width: number; selected?: string; onOpen: (k: "theory", id: string) => void }) {
  const live = useLive(scale);
  const [filter, setFilter] = useState<string>();
  const chain = useMemo(() => chainOf(selected, live), [selected, live]);
  const shown = live.filter(t => !filter || t.themes.includes(filter) || chain.has(t.id));
  const by = new Map(live.map(t => [t.id, t]));
  const years = [...new Set(shown.map(t => t.horizon))].sort((a, b) => a - b);
  const sorted = (y: number) => shown.filter(t => t.horizon === y).sort((a, b) => Number(a.draft) - Number(b.draft) || (b.confidence ?? 0) - (a.confidence ?? 0));

  /* ── measure rows for the rails and to keep the selection in view (scrolls the list, never the page) ── */
  const scroller = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<Map<string, { y: number; h: number }>>(new Map());
  const [current, setCurrent] = useState<number>();
  const [settled, setSettled] = useState<string>();
  const measure = () => {
    const l = list.current;
    if (!l) return;
    const m = new Map<string, { y: number; h: number }>();
    l.querySelectorAll<HTMLElement>("[data-tid]").forEach(el => { if (el.offsetHeight > 4) m.set(el.dataset.tid!, { y: offsetIn(el, l), h: el.offsetHeight }); });
    setRows(m);
  };
  useLayoutEffect(measure, [shown.map(t => t.id + t.horizon + t.confidence).join(), width]);
  // Unrelated rows fold away when a theory is picked; draw the rails and bring the theory into view once they have.
  useEffect(() => {
    setSettled(undefined);
    const id = window.setTimeout(() => {
      measure(); setSettled(selected);
      const s = scroller.current, el = selected && list.current?.querySelector<HTMLElement>(`[data-tid="${selected}"]`);
      // Show the whole chain if it fits, starting from its first row; otherwise centre the theory.
      const rowsIn = [...(list.current?.querySelectorAll<HTMLElement>("[data-tid]") ?? [])].filter(r => r.offsetHeight > 4 && (!selected || chain.has(r.dataset.tid!)));
      if (s && el && rowsIn.length) {
        const first = offsetIn(rowsIn[0], list.current!) - 52, last = offsetIn(rowsIn.at(-1)!, list.current!) + rowsIn.at(-1)!.offsetHeight + 24;
        const y = offsetIn(el, list.current!);
        s.scrollTo({ top: Math.max(0, last - first <= s.clientHeight ? first : y - s.clientHeight * 0.4), behavior: "smooth" });
      }
    }, 300);
    return () => clearTimeout(id);
  }, [selected, width]);
  const onScroll = () => {
    const s = scroller.current; if (!s) return;
    const heads = [...s.querySelectorAll<HTMLElement>("[data-year]")];
    const top = heads.filter(h => h.offsetTop <= s.scrollTop + 8).at(-1) ?? heads[0];
    setCurrent(top ? Number(top.dataset.year) : undefined);
  };
  useEffect(onScroll, [years.join()]);
  const jump = (y: number) => { const s = scroller.current, h = s?.querySelector<HTMLElement>(`[data-year="${y}"]`); if (s && h) s.scrollTo({ top: h.offsetTop, behavior: "smooth" }); };

  // Rails: each follows-from edge gets its own lane in the margin, so overlapping spans never share a line.
  const rails = useMemo(() => {
    const spans = chain.edges.map(([a, b]) => ({ a, b, y1: rows.get(a), y2: rows.get(b) })).filter(s => s.y1 && s.y2)
      .map(s => ({ ...s, top: Math.min(s.y1!.y, s.y2!.y), bot: Math.max(s.y1!.y, s.y2!.y) })).sort((p, q) => p.top - q.top);
    const ends: number[] = [];
    return spans.map(s => { let lane = ends.findIndex(e => e < s.top - 2); if (lane < 0) { lane = ends.length; ends.push(0); } ends[lane] = s.bot; return { ...s, lane }; });
  }, [chain, rows]);
  const GUT = 56, mid = (id: string) => { const r = rows.get(id)!; return r.y + Math.min(r.h / 2, 16); };

  const maxN = Math.max(1, ...years.map(y => sorted(y).length));
  return (
    <div className="t2c-wrap">
      <div className="t2c-bar">
        <ThemePicker scale={scale} live={live} value={filter} onChange={setFilter} />
        <div className="t2c-years" role="navigation" aria-label="Years">
          {years.map(y => {
            const n = sorted(y).length;
            return (
              <button key={y} className="t2c-ybtn" aria-current={current === y ? "true" : undefined} onClick={() => jump(y)} title={`${n} theories`}>
                <span className="ap-num">{y}</span>
                <i className="t2c-ybar" style={{ width: 4 + (n / maxN) * 32 }} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="t2c-scroll ap-scroll" ref={scroller} onScroll={onScroll}>
        <div className="t2c-list" ref={list} style={{ paddingLeft: GUT }}>
          {years.map(y => (
            <section key={y} className="t2c-year" data-hidden={selected && !sorted(y).some(t => chain.has(t.id)) ? "" : undefined}>
              <h3 className="t2c-yhead" data-year={y}><span className="ap-num">{y}</span>
                <span className="ap-num ap-muted">{selected ? `${sorted(y).filter(t => chain.has(t.id)).length} of ${sorted(y).length}` : sorted(y).length}</span></h3>
              {sorted(y).map(t => (
                <div key={t.id} className="t2c-fold" data-hidden={selected && !chain.has(t.id) ? "" : undefined}>
                  <div><Row t={t} by={by} selected={selected} chain={chain} onOpen={onOpen} /></div>
                </div>
              ))}
            </section>
          ))}
          {selected && settled === selected && (
            <svg className="t2c-rails" width={GUT} aria-hidden>
              <defs><marker id="t2c-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 1 1.5 L 8.5 5 L 1 8.5 Z" fill="context-stroke" /></marker></defs>
              {rails.map(r => {
                const x = GUT - 16 - r.lane * 9, ya = mid(r.a), yb = mid(r.b), rad = Math.min(6, Math.abs(yb - ya) / 2), dir = yb > ya ? 1 : -1, end = GUT - 2;
                return <path key={`${r.a}>${r.b}`} className="t2-link" markerEnd="url(#t2c-head)"
                  d={`M ${end - 4} ${ya} H ${x + rad} Q ${x} ${ya} ${x} ${ya + dir * rad} V ${yb - dir * rad} Q ${x} ${yb} ${x + rad} ${yb} H ${end}`} />;
              })}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ t, by, selected, chain, onOpen }: { t: Live; by: Map<string, Live>; selected?: string; chain: ReturnType<typeof chainOf>; onOpen: (k: "theory", id: string) => void }) {
  const rivals = t.rivals.map(r => by.get(r)).filter(Boolean) as Live[];
  return (
    <div className="t2c-row" data-tid={t.id} data-draft={t.draft ? "" : undefined} data-sel={selected === t.id ? "" : undefined} data-dim={selected && !chain.has(t.id) ? "" : undefined}>
      <button className="t2c-main" aria-label={t.claim} onClick={() => onOpen("theory", t.id)}>
        <span className="t2c-conf">{t.draft ? <i className="t2c-ring" aria-label="Draft: no confidence yet" title="Draft: no confidence yet" /> : <Conf n={t.confidence} />}</span>
        <span className="t2c-claim">{t.claim}</span>
        <span className="t2c-marks"><Marks t={{ ...t, rivals: [] }} /></span>
      </button>
      <div className="t2c-rivals">
        {rivals.map(r => (
          <button key={r.id} className="t2c-rival" onClick={() => onOpen("theory", r.id)} title={`Rival, ${r.horizon}`}>
            <Icon name="swap" size={12} /><span className="t2c-rival-claim">{r.claim}</span><span className="ap-num ap-muted">{r.horizon}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
