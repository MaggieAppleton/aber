import { useId, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon } from "./atoms";
import { TODAY, daysBetween, type Stance } from "./histories";
import "./confidence-spark.css";

/* Confidence over time, small enough to sit beside the confidence steps. Five variants (A to E); the pane uses one,
   chosen by prop, until a pick is made. Each scales to the full 1 to 5 range so moves read clearly.
   Rises are green, falls red (a challenge's fall too). No top/bottom reference lines or inline "Since" date (9 Nov). Hover or focus shows the dated log. */

export type HistProps = { stances: Stance[] };
export type SparkVariant = "A" | "B" | "C" | "D" | "E";

const W = 52, H = 20, PAD = 2.5, TIP_W = 280;
/** x runs from the first stance to today. */
const xOf = (s: Stance, all: Stance[]) => { const span = Math.max(1, daysBetween(all[0].date, TODAY)); return PAD + Math.max(0, Math.min(1, daysBetween(all[0].date, s.date) / span)) * (W - 2 * PAD); };
const yOf = (level: number) => PAD + ((5 - level) / 4) * (H - 2 * PAD);
const delta = (s: Stance[], i: number) => i === 0 ? 0 : s[i].level - s[i - 1].level;
/** The colour of the move into stance i. */
const tone = (s: Stance[], i: number) => { const d = delta(s, i); return d === 0 ? "flat" : d > 0 ? "up" : s[i].challenge ? "challenge" : "fell"; };
/** The colour of a level: amber when doubtful, green when sure. */
const levelTone = (l: number) => l >= 4 ? "up" : l <= 2 ? "down" : "flat";

/** The chosen variant. */
export function ConfidenceSpark({ stances, variant = "A" }: HistProps & { variant?: SparkVariant }) {
  if (!stances.length) return null;
  const V = { A: HistA, B: HistB, C: HistC, D: HistD, E: HistE }[variant];
  return <V stances={stances} />;
}

/* ── The hover log: every dated change, newest first ── */
function Log({ s }: { s: Stance[] }) {
  return (
    <span className="cs-log">
      {s.map((st, i) => ({ st, i })).reverse().map(({ st, i }) => {
        const d = delta(s, i);
        return (
          <span key={st.id} className="cs-row">
            <span className="ap-muted">{st.short}</span>
            <span className="cs-d" data-tone={tone(s, i)}>{d === 0 ? "Set" : <><Icon name={d > 0 ? "trendUp" : "trendDown"} size={14} />{st.level}</>}</span>
            <span>{st.note || "No note"}</span>
          </span>
        );
      })}
    </span>
  );
}

/** A focusable sparkline that shows the full log on hover or focus. */
function Frame({ s, children }: { s: Stance[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // The log hangs below-left of the line, nudged left when it would run past the edge of the surface it sits in.
  const [left, setLeft] = useState(-8);
  const ref = useRef<HTMLSpanElement>(null);
  const show = () => {
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect(), box = el.closest(".as-pane, .ap")?.getBoundingClientRect();
      setLeft(box ? Math.min(-8, box.right - 12 - TIP_W - r.left) : -8);
    }
    setOpen(true);
  };
  const id = useId();
  const last = s.at(-1)!;
  return (
    <span className="cs" role="group" ref={ref} tabIndex={0} aria-describedby={open ? id : undefined} aria-label={`Confidence history, ${s.length} stances, now ${last.level} of 5`}
      onMouseEnter={show} onMouseLeave={() => setOpen(false)} onFocus={show} onBlur={() => setOpen(false)}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>{children}</svg>
      <AnimatePresence>
        {open && (
          <motion.span id={id} role="tooltip" className="cs-tip" style={{ left, width: TIP_W }}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.15 }}>
            <Log s={s} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* Segment geometry: the move into stance i, plus the run that follows it. */
const end = (s: Stance[], i: number) => i + 1 < s.length ? xOf(s[i + 1], s) : W - PAD;
const stepSeg = (s: Stance[], i: number) => i === 0
  ? `M${xOf(s[0], s)},${yOf(s[0].level)} H${end(s, 0)}`
  : `M${xOf(s[i], s)},${yOf(s[i - 1].level)} V${yOf(s[i].level)} H${end(s, i)}`;
const angleSeg = (s: Stance[], i: number) => i === 0
  ? `M${xOf(s[0], s)},${yOf(s[0].level)} L${xOf(s[0], s)},${yOf(s[0].level)}`
  : `M${xOf(s[i - 1], s)},${yOf(s[i - 1].level)} L${xOf(s[i], s)},${yOf(s[i].level)}`;
const stepLine = (s: Stance[]) => `M${xOf(s[0], s)},${yOf(s[0].level)} ` + s.slice(1).map(st => `H${xOf(st, s)} V${yOf(st.level)}`).join(" ") + ` H${W - PAD}`;
const tail = (s: Stance[]) => { const l = s.at(-1)!; return `M${xOf(l, s)},${yOf(l.level)} H${W - PAD}`; };
const EndDot = ({ s, r = 2.25, t }: { s: Stance[]; r?: number; t?: string }) =>
  <circle className="cs-end" data-tone={t ?? tone(s, s.length - 1)} cx={W - PAD} cy={yOf(s.at(-1)!.level)} r={r} />;

/* ── A. Steps: hard steps, each run in the colour of the move that began it ── */
export const HistA = ({ stances: s }: HistProps) => (
  <Frame s={s}>
    {s.map((st, i) => <path key={st.id} className="cs-line" data-tone={tone(s, i)} d={stepSeg(s, i)} />)}
    <EndDot s={s} />
  </Frame>
);

/* ── B. Steps over a soft fill in the current level's tone ── */
export function HistB({ stances: s }: HistProps) {
  const t = levelTone(s.at(-1)!.level), id = useId();
  const area = `${stepLine(s)} V${H} H${xOf(s[0], s)} Z`;
  return (
    <Frame s={s}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="cs-stop" data-tone={t} stopOpacity="0.28" /><stop offset="1" className="cs-stop" data-tone={t} stopOpacity="0.04" /></linearGradient></defs>
      <path d={area} fill={`url(#${id})`} />
      {s.map((st, i) => <path key={st.id} className="cs-line" data-tone={tone(s, i)} d={stepSeg(s, i)} />)}
      <EndDot s={s} t={t} />
    </Frame>
  );
}

/* ── C. Angled line with a dot at every change ── */
export const HistC = ({ stances: s }: HistProps) => (
  <Frame s={s}>
    {s.map((st, i) => i > 0 && <path key={st.id} className="cs-line cs-round" data-tone={tone(s, i)} d={angleSeg(s, i)} />)}
    <path className="cs-line cs-round" data-tone={tone(s, s.length - 1)} d={tail(s)} />
    {s.slice(1).map((st, i) => <circle key={st.id} className="cs-pt" data-tone={tone(s, i + 1)} cx={xOf(st, s)} cy={yOf(st.level)} r={1.4} />)}
    <EndDot s={s} r={2.5} />
  </Frame>
);

/* ── D. Ink line around a faint "Even" baseline, the end dot in the current level's tone ── */
export const HistD = ({ stances: s }: HistProps) => (
  <Frame s={s}>
    <line className="cs-base" x1={0} x2={W} y1={yOf(3)} y2={yOf(3)} />
    <path className="cs-line cs-round cs-ink" d={s.map((st, i) => `${i ? "L" : "M"}${xOf(st, s)},${yOf(st.level)}`).join(" ") + ` H${W - PAD}`} />
    <EndDot s={s} r={2.75} t={levelTone(s.at(-1)!.level)} />
  </Frame>
);

/* ── E. Height colour: the stroke shades from amber at Doubtful to green at Sure ── */
export function HistE({ stances: s }: HistProps) {
  const id = useId();
  return (
    <Frame s={s}>
      <defs><linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1={yOf(5)} x2="0" y2={yOf(1)}>
        <stop offset="0.1" className="cs-stop" data-tone="up" /><stop offset="0.5" className="cs-stop" data-tone="flat" /><stop offset="0.9" className="cs-stop" data-tone="down" />
      </linearGradient></defs>
      <path className="cs-line cs-round" style={{ stroke: `url(#${id})` }} d={s.map((st, i) => `${i ? "L" : "M"}${xOf(st, s)},${yOf(st.level)}`).join(" ") + ` H${W - PAD}`} />
      <EndDot s={s} r={2.5} t={levelTone(s.at(-1)!.level)} />
    </Frame>
  );
}
