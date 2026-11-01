import { TooltipButton } from "./tooltip";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon } from "./atoms";
import { Editable } from "./editable";
import "./tripwire.css";

/*
 * What would change my mind, written as a sentence under the theory's body: "I'd change my mind if …".
 * The signpost sits inline at its start, and wrapped lines return to the body's left edge.
 * Empty: two dotted rules to write on. Watching: a slow breathing dot. Tripped: the signpost turns red, the phrase gets a
 * wavy red underline and a dashed count, and the matching signals unfold beneath, dashed (agent suggestions) until
 * accepted or dismissed. Resolved: a quiet tick and a summary that unfolds the decided signals.
 * Shared by the theory pane and the /details jig.
 */

export const EASE = [0.16, 1, 0.3, 1] as const;
const NAME = "What would change my mind";

export type TripState = "empty" | "watching" | "tripped" | "resolved";
export type Hit = { id: string; suggestionId?:string; gist: string; source: string; day: string; why: string; loweredTo?:number };
export type Decision = "accepted" | "dismissed";

export const Watch = ({ checked }: { checked?: number }) => <span className="tw-watch" role="img" title={checked ? `Watching new signals, ${checked} checked so far` : "Watching new signals"} aria-label="Watching" />;

export function Unfold({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && <motion.div className="tw-unfold" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>{children}</motion.div>}
    </AnimatePresence>
  );
}

/* ── A signal the tripwire agent matched: dashed until decided ── */
export function HitRow({ hit, decision, onDecide, conf, compact }: { hit: Hit; decision?: Decision; onDecide: (d?: Decision) => void; conf: number; compact?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div layout={reduce ? false : "position"} className="tw-hit" data-decided={decision ? "" : undefined} data-compact={compact ? "" : undefined}
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }} transition={{ duration: 0.3, ease: EASE }}>
      <div className="tw-hit-text">
        <span className="tw-hit-gist">{hit.gist}</span>
        <span className="ap-muted">{decision ? (decision === "accepted" ? <>Accepted{hit.loweredTo!=null?`, lowered to ${hit.loweredTo}`:""}</> : <>Dismissed</>) : <>{hit.why}</>}</span>
      </div>
      <span className="ap-muted tw-hit-src">{hit.source}</span>
      <span className="tw-hit-acts">
        {decision
          ? <TooltipButton className="pn-step" aria-label="Undo" tooltip="Undo" onClick={() => onDecide(undefined)}><Icon name="undo" size={12} /></TooltipButton>
          : <>
              <button className="ap-btn tw-accept" onClick={() => onDecide("accepted")} title="Accept and lower confidence">Accept</button>
              <TooltipButton className="pn-step tw-dismiss" aria-label="Dismiss" tooltip="Dismiss" onClick={() => onDecide("dismissed")}><Icon name="x" size={12} /></TooltipButton>
            </>}
      </span>
    </motion.div>
  );
}

export type TripwireProps = {
  state: TripState; text: string; setText: (v: string) => void;
  /** Called when the text loses focus: the host moves an empty tripwire to watching once it has words. */
  commit: () => void;
  /** Called when the empty blank takes focus, so the host can hold the empty layout while it is typed into. */
  begin?: () => void;
  hits: Hit[]; decisions: Record<string, Decision>; decide: (id: string, d?: Decision) => void; conf: number;
  /** When it tripped, for the resolved summary. */
  date?: string;
};

/** The tripwire as a sentence (variant C). */
export function Tripwire(p: TripwireProps) {
  const [open, setOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const live = p.state === "tripped" ? p.hits.filter(h => !p.decisions[h.id]) : [];
  const tripped = live.length > 0;
  /* The blank's first rule starts where "if " ends, so track the lead's width. */
  useLayoutEffect(() => {
    const lead = box.current?.querySelector<HTMLElement>(".tw-tc-lead"); if (!lead || p.state !== "empty") return;
    const set = () => box.current?.style.setProperty("--tc-lead", `${lead.offsetWidth}px`);
    set(); const ro = new ResizeObserver(set); ro.observe(lead); return () => ro.disconnect();
  }, [p.state]);
  const done = p.hits.filter(h => p.decisions[h.id]);
  const acc = done.filter(h => p.decisions[h.id] === "accepted").length, dis = done.length - acc;
  const focusEnd = () => {
    const el = box.current?.querySelector<HTMLElement>("[contenteditable]"); if (!el) return;
    el.focus();
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    const sel = getSelection(); sel?.removeAllRanges(); sel?.addRange(r);
  };
  const lead = (
    <span className="tw-tc-lead" onMouseDown={e => { e.preventDefault(); focusEnd(); }}>
      <span className="tw-tc-icon" data-tripped={tripped ? "" : undefined}><Icon name="turn" size={16} /></span>
      {"I'd change my mind if "}
    </span>
  );
  if (p.state === "empty") return (
    <div className="tw-tc" role="group" aria-label={NAME} ref={box}>
      <div className="tw-tc-line tw-tc-blankline">
        {lead}
        <Editable className="tw-tc-blank" value={p.text} onChange={p.setText} onFocus={p.begin} onBlur={p.commit} aria-label={NAME} />
      </div>
    </div>
  );
  return (
    <div className="tw-tc" role="group" aria-label={NAME} ref={box}>
      <div className="tw-tc-line">
        {lead}
        <Editable className="tw-tc-phrase" value={p.text} onChange={p.setText} onBlur={p.commit} aria-label={NAME} singleLine
          data-tripped={tripped ? "" : undefined} />
        {/* The full stop and whatever follows it stay together, so a mark never wraps onto a line by itself. */}
        <span className="tw-tc-end">.
          {p.state === "watching" && <span className="tw-tc-after"><Watch /></span>}
          {tripped && (
            <TooltipButton className="tw-tc-flag" aria-expanded={open} onClick={() => setOpen(o => !o)} tooltip={live.length === 1 ? "1 signal matches" : `${live.length} signals match`} aria-label={live.length === 1 ? "1 signal matches" : `${live.length} signals match`}>
              <span className="ap-ghost-badge">{live.length}</span>
            </TooltipButton>
          )}
        </span>
        {p.state === "resolved" && done.length > 0 && (
          <TooltipButton className="tw-tc-flag tw-tc-done" aria-expanded={logOpen} onClick={() => setLogOpen(o => !o)} tooltip={p.date ? `Tripped ${p.date}` : "Tripped"}>
            <Icon name="check" size={12} />
            <span>{[acc && `${acc} accepted`, dis && `${dis} dismissed`].filter(Boolean).join(", ")}</span>
          </TooltipButton>
        )}
      </div>
      <Unfold show={(p.state === "tripped" && open) || (p.state === "resolved" && logOpen)}>
        <div className="tw-hits tw-tc-hits">
          <AnimatePresence initial={false}>{(p.state === "resolved" ? done : p.hits).map(h => <HitRow key={h.id} hit={h} decision={p.decisions[h.id]} onDecide={d => p.decide(h.id, d)} conf={p.conf} />)}</AnimatePresence>
        </div>
      </Unfold>
    </div>
  );
}

/** Which state a tripwire is in, from its words and what has matched it. */
export function tripState(text: string, hits: Hit[], decisions: Record<string, Decision>): TripState {
  if (!text.trim()) return "empty";
  if (!hits.length) return "watching";
  return hits.some(h => !decisions[h.id]) ? "tripped" : "resolved";
}
