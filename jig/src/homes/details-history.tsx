import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon } from "./atoms";
import { LEVELS, SPAN, dayOf, type Stance } from "./details-data";
import { EASE, Tip } from "./details-pane";

/* Five ways to show a theory's confidence over time. Rises are green, falls amber; red marks a fall that came from a tripwire challenge. */

export type HistProps = { stances: Stance[] };

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el); setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const dir = (s: Stance[], i: number) => i === 0 ? 0 : Math.sign(s[i].level - s[i - 1].level);
const DIR_CLASS = ["dt-flat", "dt-up", "dt-down"];
const dc = (d: number) => DIR_CLASS[d === 0 ? 0 : d > 0 ? 1 : 2];
const delta = (s: Stance[], i: number) => i === 0 ? 0 : s[i].level - s[i - 1].level;
const Delta = ({ d }: { d: number }) => d === 0 ? <span className="dt-delta" data-dir="flat">Set</span>
  : <span className="dt-delta" data-dir={d > 0 ? "up" : "down"}><Icon name={d > 0 ? "arrowUp" : "arrowDown"} size={12} />{Math.abs(d)}</span>;

function TipBody({ s, i }: { s: Stance[]; i: number }) {
  const st = s[i];
  return (
    <>
      <span className="dt-tip-head"><span className="ap-muted">{st.date}</span><Delta d={delta(s, i)} /><span className="dt-tip-level">{st.level} {LEVELS[st.level]}</span>{st.challenge && <span className="ap-mark" data-kind="challenge" title="From a challenge" aria-label="From a challenge" />}</span>
      <span>{st.note || "No note"}</span>
    </>
  );
}

const label = (s: Stance[], i: number) => `${s[i].date}, confidence ${s[i].level} of 5, ${s[i].note || "no note"}`;

/* ── A. Tall step chart: named levels, runs coloured by the move that began them ── */
export function StepChart({ stances: s, height = 132, compact, hover, setHover }: HistProps & { height?: number; compact?: boolean; hover?: number; setHover?: (i?: number) => void }) {
  const [ref, w] = useWidth();
  const [own, setOwn] = useState<number>();
  const reduce = useReducedMotion();
  const hi = setHover ? hover : own, setHi = setHover ?? setOwn;
  const gl = compact ? 4 : 70, gr = compact ? 8 : 16, top = 10, bot = compact ? 8 : 24, ph = height - top - bot;
  const x = (d: number) => gl + (d / SPAN) * Math.max(0, w - gl - gr);
  const y = (l: number) => top + ((5 - l) / 4) * ph;
  const pts = s.map(st => ({ x: x(Math.min(dayOf(st.date), SPAN)), y: y(st.level) }));
  const end = x(SPAN);
  const ticks = ["1 Jul 2025", "1 Jan 2026", "1 Jul 2026"];
  return (
    <div className="dt-chart" ref={ref} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={`Confidence history, now ${s.at(-1)!.level} of 5`}>
          {[1, 2, 3, 4, 5].map(l => (
            <g key={l}>
              <line x1={gl} x2={w - gr} y1={y(l)} y2={y(l)} className="dt-grid" />
              {!compact && <text x={gl - 10} y={y(l)} dy="0.35em" textAnchor="end" className="dt-axis" data-on={l === s.at(-1)!.level ? "" : undefined}>{LEVELS[l]}</text>}
            </g>
          ))}
          {!compact && ticks.map(t => <text key={t} x={x(dayOf(t))} y={height - 6} textAnchor="middle" className="dt-axis">{t.replace(/^1 /, "").replace(/ 20/, " ")}</text>)}
          {pts.map((p, i) => {
            const nx = i < pts.length - 1 ? pts[i + 1].x : end;
            const run = <motion.line key={"r" + s[i].id} x1={p.x} x2={nx} y1={p.y} y2={p.y} className={"dt-run " + dc(dir(s, i))}
              initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: reduce ? 0 : 0.08 * i, ease: EASE }} />;
            const riser = i < pts.length - 1 && <motion.line key={"v" + s[i].id} x1={nx} x2={nx} y1={p.y} y2={pts[i + 1].y} className={"dt-riser " + dc(dir(s, i + 1))}
              initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.2, delay: reduce ? 0 : 0.08 * i + 0.3, ease: EASE }} />;
            return <g key={s[i].id}>{run}{riser}</g>;
          })}
          {pts.map((p, i) => (
            <g key={"d" + s[i].id} className="dt-pt" data-hot={hi === i ? "" : undefined} tabIndex={0} role="button" aria-label={label(s, i)}
              onPointerEnter={() => setHi(i)} onPointerLeave={() => setHi(undefined)} onFocus={() => setHi(i)} onBlur={() => setHi(undefined)}>
              <circle cx={p.x} cy={p.y} r={12} className="dt-hit-area" />
              <circle cx={p.x} cy={p.y} r={compact ? 3.5 : 4.5} className={"dt-dot " + dc(dir(s, i))} data-challenge={s[i].challenge ? "" : undefined} />
            </g>
          ))}
        </svg>
      )}
      <AnimatePresence>{hi !== undefined && pts[hi] && !compact && <Tip key="tip" x={pts[hi].x} y={pts[hi].y < 50 ? pts[hi].y + 14 : pts[hi].y - 12} below={pts[hi].y < 50} w={w}><TipBody s={s} i={hi} /></Tip>}</AnimatePresence>
    </div>
  );
}
export const HistA = ({ stances }: HistProps) => <div className="dt-hist"><StepChart stances={stances} /></div>;

/* ── B. Curve: an S-curve between stances, its stroke coloured by height, events along the bottom ── */
export function HistB({ stances: s }: HistProps) {
  const [ref, w] = useWidth();
  const [hi, setHi] = useState<number>();
  const reduce = useReducedMotion();
  const H = 168, gl = 28, gr = 16, top = 12, plot = 112, lane = top + plot + 14;
  const x = (d: number) => gl + (d / SPAN) * Math.max(0, w - gl - gr);
  const y = (l: number) => top + ((5 - l) / 4) * plot;
  const pts = s.map(st => [x(Math.min(dayOf(st.date), SPAN)), y(st.level)] as const);
  const all = [...pts, [x(SPAN), pts.at(-1)![1]] as const];
  let d = `M${all[0][0]},${all[0][1]}`;
  for (let i = 1; i < all.length; i++) { const [x0, y0] = all[i - 1], [x1, y1] = all[i], xm = (x0 + x1) / 2; d += ` C${xm},${y0} ${xm},${y1} ${x1},${y1}`; }
  const area = `${d} L${all.at(-1)![0]},${top + plot} L${all[0][0]},${top + plot} Z`;
  const nearest = (px: number) => pts.reduce((b, p, i) => Math.abs(p[0] - px) < Math.abs(pts[b][0] - px) ? i : b, 0);
  const id = useRef("g" + Math.random().toString(36).slice(2)).current;
  return (
    <div className="dt-hist">
      <div className="dt-chart" ref={ref} style={{ height: H }}>
        {w > 0 && (
          <svg width={w} height={H} role="img" aria-label={`Confidence history, now ${s.at(-1)!.level} of 5`}
            onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); setHi(nearest(e.clientX - r.left)); }} onPointerLeave={() => setHi(undefined)}>
            <defs>
              <linearGradient id={id + "s"} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={y(5)} y2={y(1)}>
                <stop offset="0" stopColor="var(--dt-up)" /><stop offset="0.5" stopColor="var(--ap-ink-2)" /><stop offset="1" stopColor="var(--dt-down)" />
              </linearGradient>
              <linearGradient id={id + "f"} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={y(5)} y2={y(1)}>
                <stop offset="0" stopColor="var(--dt-up)" stopOpacity="0.22" /><stop offset="0.5" stopColor="var(--ap-ink)" stopOpacity="0.06" /><stop offset="1" stopColor="var(--dt-down)" stopOpacity="0.04" />
              </linearGradient>
            </defs>
            {[1, 2, 3, 4, 5].map(l => <g key={l}><line x1={gl} x2={w - gr} y1={y(l)} y2={y(l)} className="dt-grid" /><text x={gl - 10} y={y(l)} dy="0.35em" textAnchor="end" className="dt-axis" data-on={l === s.at(-1)!.level ? "" : undefined}>{l}</text></g>)}
            <motion.path d={area} fill={`url(#${id}f)`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }} />
            <motion.path d={d} fill="none" stroke={`url(#${id}s)`} strokeWidth={2.5} strokeLinecap="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: EASE }} />
            {hi !== undefined && <line x1={pts[hi][0]} x2={pts[hi][0]} y1={top} y2={lane + 6} className="dt-cross" />}
            {pts.map((p, i) => <circle key={s[i].id} cx={p[0]} cy={p[1]} r={hi === i ? 5 : 3.5} className={"dt-dot " + dc(dir(s, i))} data-challenge={s[i].challenge ? "" : undefined} />)}
            <line x1={gl} x2={w - gr} y1={lane} y2={lane} className="dt-grid" />
            {pts.map((p, i) => {
              const dd = dir(s, i);
              return (
                <g key={"e" + s[i].id} className="dt-pt" tabIndex={0} role="button" aria-label={label(s, i)} onFocus={() => setHi(i)} onBlur={() => setHi(undefined)}>
                  <rect x={p[0] - 8} y={lane - 10} width={16} height={20} className="dt-hit-area" />
                  {s[i].challenge ? <circle cx={p[0]} cy={lane} r={4} className="dt-ev-challenge" />
                    : dd === 0 ? <circle cx={p[0]} cy={lane} r={3} className="dt-ev-flat" />
                    : <path d={dd > 0 ? `M${p[0] - 4},${lane + 3} L${p[0]},${lane - 4} L${p[0] + 4},${lane + 3} Z` : `M${p[0] - 4},${lane - 3} L${p[0]},${lane + 4} L${p[0] + 4},${lane - 3} Z`} className={dc(dd)} />}
                </g>
              );
            })}
            <text x={gl} y={H - 4} className="dt-axis">{s[0].short}</text>
            <text x={w - gr} y={H - 4} textAnchor="end" className="dt-axis">Today</text>
          </svg>
        )}
        <AnimatePresence>{hi !== undefined && pts[hi] && <Tip key="tip" x={pts[hi][0]} y={pts[hi][1] < 50 ? pts[hi][1] + 14 : pts[hi][1] - 12} below={pts[hi][1] < 50} w={w}><TipBody s={s} i={hi} /></Tip>}</AnimatePresence>
      </div>
    </div>
  );
}

/* ── C. Ladder: five rungs across, time running down, every note in view ── */
export function HistC({ stances }: HistProps) {
  const [more, setMore] = useState(false);
  const every = [...stances].map((st, i) => ({ st, i })).reverse();
  const rows = more ? every : every.slice(0, 5);
  const box = useRef<HTMLDivElement>(null);
  const [ys, setYs] = useState<number[]>([]);
  const [hi, setHi] = useState<number>();
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const measure = () => setYs([...el.querySelectorAll<HTMLElement>(".dt-lad-row")].map(r => r.offsetTop + 11));
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [stances.length, rows.length]);
  const cx = (l: number) => 8 + (l - 1) * 22;
  return (
    <div className="dt-hist dt-lad" ref={box}>
      <div className="dt-lad-head">
        <span className="dt-lad-rungs">{[1, 2, 3, 4, 5].map(l => <span key={l} className="ap-num" data-on={l === stances.at(-1)!.level ? "" : undefined} title={LEVELS[l]}>{l}</span>)}</span>
      </div>
      <svg className="dt-lad-svg" width={104} height={ys.length ? ys.at(-1)! + 12 : 0} aria-hidden>
        {[1, 2, 3, 4, 5].map(l => <line key={l} x1={cx(l)} x2={cx(l)} y1={ys[0] ?? 0} y2={ys.at(-1) ?? 0} className="dt-grid" />)}
        {ys.length === rows.length && rows.map((r, k) => k < rows.length - 1 && (
          <line key={r.st.id} x1={cx(rows[k + 1].st.level)} y1={ys[k + 1]} x2={cx(r.st.level)} y2={ys[k]} className={"dt-riser " + dc(dir(stances, r.i))} />
        ))}
        {ys.length === rows.length && rows.map((r, k) => <circle key={"d" + r.st.id} cx={cx(r.st.level)} cy={ys[k]} r={hi === r.i ? 5.5 : 4.5} className={"dt-dot " + dc(dir(stances, r.i))} data-challenge={r.st.challenge ? "" : undefined} />)}
      </svg>
      {rows.map(({ st, i }) => (
        <div key={st.id} className="dt-lad-row" data-hot={hi === i ? "" : undefined} onPointerEnter={() => setHi(i)} onPointerLeave={() => setHi(undefined)}>
          <span className="dt-lad-when ap-muted ap-num" title={st.date}>{st.short}</span>
          <span className="dt-lad-text">
            <span className="dt-lad-level">{LEVELS[st.level]}<Delta d={delta(stances, i)} />{st.challenge && <span className="ap-mark" data-kind="challenge" title="From a challenge" aria-label="From a challenge" />}</span>
            <span className="dt-lad-note">{st.note || "No note"}</span>
          </span>
        </div>
      ))}
      {every.length > 5 && <button className="dt-more dt-lad-more" aria-expanded={more} onClick={() => setMore(m => !m)}>{more ? "Fewer" : `All ${every.length}`}</button>}
    </div>
  );
}

/* ── D. Chart and log: a short step chart over a change log, each pointing at the other ── */
export function HistD({ stances: s }: HistProps) {
  const [hi, setHi] = useState<number>();
  const [all, setAll] = useState(false);
  const rows = s.map((st, i) => ({ st, i })).reverse();
  const shown = all ? rows : rows.slice(0, 4);
  return (
    <div className="dt-hist dt-log2">
      <StepChart stances={s} height={64} compact hover={hi} setHover={setHi} />
      <div className="dt-log2-rows">
        <AnimatePresence initial={false}>
          {shown.map(({ st, i }) => (
            <motion.div key={st.id} className="dt-log2-row" data-hot={hi === i ? "" : undefined} onPointerEnter={() => setHi(i)} onPointerLeave={() => setHi(undefined)}
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: EASE }}>
              <div className="dt-log2-in">
                <span className="ap-muted ap-num dt-log2-date">{st.date.replace(/ 20(\d\d)$/, " ’$1")}</span>
                <span className="dt-log2-delta"><Delta d={delta(s, i)} />{st.challenge && <span className="ap-mark" data-kind="challenge" title="From a challenge" aria-label="From a challenge" />}</span>
                <span className="dt-log2-text">
                  <span>{st.note || "No note"}</span>
                  {st.signal && <span className="dt-log2-sig ap-muted"><Icon name="signal" size={12} /><span>{st.signal}</span></span>}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {rows.length > 4 && <button className="dt-more" aria-expanded={all} onClick={() => setAll(a => !a)}>{all ? "Fewer" : `All ${rows.length}`}</button>}
    </div>
  );
}

/* ── E. Stripes: one band per stance, as wide as it lasted, shaded by level ── */
export function HistE({ stances: s }: HistProps) {
  const [ref, w] = useWidth();
  const [hi, setHi] = useState<number>();
  const cur = s.at(-1)!;
  const bands = s.map((st, i) => { const a = dayOf(st.date), b = i < s.length - 1 ? dayOf(s[i + 1].date) : SPAN; return { st, i, l: a / SPAN, r: Math.max(b, a + 6) / SPAN }; });
  return (
    <div className="dt-hist dt-stripes">
      <div className="dt-stripes-now">
        <span className="dt-big ap-num">{cur.level}</span>
        <span className="dt-stripes-now-t"><strong>{LEVELS[cur.level]}</strong><span className="ap-muted">Since {cur.short === "Now" ? "today" : cur.date.replace(/ \d{4}$/, "")}</span></span>
      </div>
      <div className="dt-stripes-strip" ref={ref}>
        {bands.map(b => (
          <button key={b.st.id} className="dt-band" data-level={b.st.level} data-hot={hi === b.i ? "" : undefined} style={{ left: `${b.l * 100}%`, width: `calc(${(b.r - b.l) * 100}% - 2px)` }}
            aria-label={label(s, b.i)} onPointerEnter={() => setHi(b.i)} onPointerLeave={() => setHi(undefined)} onFocus={() => setHi(b.i)} onBlur={() => setHi(undefined)}>
            {(b.r - b.l) * w > 22 && <span className="ap-num">{b.st.level}</span>}
            {b.st.challenge && <span className="dt-band-ch ap-mark" data-kind="challenge" />}
          </button>
        ))}
        <AnimatePresence>{hi !== undefined && <Tip key="tip" x={((bands[hi].l + bands[hi].r) / 2) * w} y={-8} w={w}><TipBody s={s} i={hi} /></Tip>}</AnimatePresence>
      </div>
      <div className="dt-stripes-axis ap-num">
        <span style={{ left: 0 }}>{s[0].short}</span>
        {["1 Jan 2026", "1 Jul 2026"].map(t => <span key={t} data-mid="" style={{ left: `${(dayOf(t) / SPAN) * 100}%` }}>{t.slice(2, 5) + " " + t.slice(-2)}</span>)}
        <span data-end="" style={{ left: "100%" }}>Today</span>
      </div>
    </div>
  );
}

export const HISTS: Record<string, (p: HistProps) => ReactNode> = { A: HistA, B: HistB, C: HistC, D: HistD, E: HistE };
