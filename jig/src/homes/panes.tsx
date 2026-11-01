import { createElement, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DUMPS, SIGNALS, THEORIES, PROTOTYPES, theoriesIn, theme, theory, signalsFor, prototypesFor, type Signal } from "./data";
import { Icon, IconButton, Conf, DumpIcon, Mark, ProtoGlyph, Kbd } from "./atoms";
import { useEdit } from "./edits";
import "./panes.css";

/*
 * The object panes, shared by every surface: a theme, a theory, a prototype, read and written in place.
 * Edits live in ./edits, so the same object shows the same words wherever it is opened.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export type ObjKind = "theme" | "theory" | "prototype";
export type OnOpen = (kind: ObjKind, id: string) => void;
export type OnUnfold = (kind: "signal" | "dump", id: string) => void;

/**
 * How a pane talks to its host.
 * - `onOpen`: open another theme, theory or prototype (the host decides where).
 * - `onUnfold`: the user asked to unfold (or fold) a signal or dump. Omit it and the pane unfolds signals inline itself.
 * - `inline`: with `onUnfold`, still unfold inside the pane, but let the host hold which one is open (e.g. so Esc can fold it).
 * - `unfolded`: the signal the host has unfolded, shown open inline, or marked as current when it unfolds elsewhere.
 */
export type PaneNav = { onOpen: OnOpen; onUnfold?: OnUnfold; inline?: boolean; unfolded?: string };

function useUnfold(nav: PaneNav) {
  const [local, setLocal] = useState<string>();
  const inline = !nav.onUnfold || !!nav.inline;
  const unfolded = nav.onUnfold ? nav.unfolded : local;
  const toggle = (id: string) => nav.onUnfold ? nav.onUnfold("signal", id) : setLocal(u => u === id ? undefined : id);
  return { inline, unfolded, toggle };
}

const Swap = () => <Icon name="swap" size={12} />;

/* ── Editable text ──
 * Uncontrolled contentEditable kept in step with the store: typing writes to the store, and the DOM is only
 * rewritten when the stored value differs from it (an edit made elsewhere), so the caret never jumps. */
export function Editable({ value, onChange, as = "div", className, placeholder, singleLine, ...rest }: {
  value: string; onChange: (v: string) => void; as?: "div" | "h1"; className?: string; placeholder?: string; singleLine?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, "onChange" | "children">) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => { const el = ref.current; if (el && el.textContent !== value) el.textContent = value; }, [value]);
  return createElement(as, {
    ...rest, ref, className: "pn-edit" + (className ? " " + className : ""), contentEditable: "plaintext-only", suppressContentEditableWarning: true,
    role: "textbox", "aria-multiline": singleLine ? undefined : true, "data-placeholder": placeholder,
    onInput: (e: FormEvent<HTMLElement>) => onChange(e.currentTarget.textContent ?? ""),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === "Escape") { e.stopPropagation(); e.currentTarget.blur(); }
      if (singleLine && e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
    },
  });
}

/* Live names, for lists, chips and tiles elsewhere. */
export const Claim = ({ id }: { id: string }) => <>{useEdit("theory", id)[0].claim}</>;
export const ThemeName = ({ id }: { id: string }) => <>{useEdit("theme", id)[0].name}</>;
export const ProtoName = ({ id }: { id: string }) => <>{useEdit("prototype", id)[0].name}</>;
export const TheoryConf = ({ id }: { id: string }) => <Conf n={useEdit("theory", id)[0].confidence} />;
export const ProtoStatus = ({ id }: { id: string }) => <ProtoGlyph status={useEdit("prototype", id)[0].status} />;

/* ── A signal: a row that unfolds in place ── */
export function SignalRow({ s, open, current, onToggle, onOpen, suggested, context }: {
  s: Signal; open: boolean; current?: boolean; onToggle: () => void; onOpen: OnOpen; suggested?: boolean; context?: string;
}) {
  return (
    <div className="pn-sig" data-open={open ? "" : undefined} data-current={current ? "" : undefined} data-suggested={suggested ? "" : undefined}>
      <button className="pn-ev" aria-expanded={open} onClick={onToggle}>
        <span className="pn-line">{s.day === "Today" && <Mark kind="fresh" />}<span>{s.gist}</span></span>
        <span className="ap-muted">{s.source}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="pn-detail" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            <SignalDetail s={s} onOpen={onOpen} context={context} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** What an unfolded signal shows: a note, the theories it bears on, its themes and its dump. */
export function SignalDetail({ s, onOpen, onDump, context }: { s: Signal; onOpen: OnOpen; onDump?: (id: string) => void; context?: string }) {
  const d = DUMPS.find(x => x.id === s.dump)!;
  const [edit, set] = useEdit("signal", s.id);
  const when = d.day === "Today" ? d.time : d.day;
  return (
    <div className="pn-detail-inner">
      <Editable className="pn-note" value={edit.note} onChange={note => set({ note })} placeholder="Note" aria-label="Note" />
      {s.evidence.filter(e => e.theory !== context).map(e => (
        <button key={e.theory} className="pn-link" data-suggested={e.suggested ? "" : undefined} onClick={() => onOpen("theory", e.theory)}
          title={e.stance === "supports" ? "Supports" : "Undermines"}>
          <Icon name={e.stance === "supports" ? "arrowUp" : "arrowDown"} size={12} /><Claim id={e.theory} />
        </button>
      ))}
      <div className="pn-chips">
        {s.themes.filter(t => t !== context).map(t => <button key={t} className="pn-chip" title="Theme" onClick={() => onOpen("theme", t)}><Icon name="theme" size={12} /><ThemeName id={t} /></button>)}
        {onDump
          ? <button className="pn-chip" title={`Dump, ${d.day}`} onClick={() => onDump(d.id)}><DumpIcon d={d} />{when}</button>
          : <span className="pn-chip pn-static" title={`Dump, ${d.day}`}><DumpIcon d={d} />{when}</span>}
      </div>
    </div>
  );
}

/* ── Theory: claim, confidence, horizon, rival, body, tripwire, evidence, lineage ── */
export function TheoryPane({ id, nav }: { id: string; nav: PaneNav }) {
  const t = theory(id);
  const [edit, set] = useEdit("theory", id);
  const { inline, unfolded, toggle } = useUnfold(nav);
  const { onOpen } = nav;
  const conf = edit.confidence ?? 0;
  const ev = signalsFor(id);
  const leadsTo = THEORIES.filter(x => x.follows.includes(id));
  const protos = prototypesFor(id);
  return (
    <div className="pn-doc">
      <div className="pn-chips">{t.themes.map(th => <button key={th} className="pn-chip" title="Theme" onClick={() => onOpen("theme", th)}><Icon name="theme" size={12} /><ThemeName id={th} /></button>)}</div>
      <Editable as="h1" className="pn-title" value={edit.claim} onChange={claim => set({ claim })} singleLine aria-label="Claim" data-draft={t.draft ? "" : undefined} />
      <div className="pn-meta">
        {t.draft
          ? <span className="ap-ghost-actions"><IconButton icon="check" label="Accept (A)" /><IconButton icon="x" label="Discard (X)" /></span>
          : <Field name="Confidence">{open => <>
              <Reveal show={open} side="start"><span className="ap-label">Confidence</span></Reveal>
              <span className="pn-conf" role="radiogroup" aria-label="Confidence">{[1, 2, 3, 4, 5].map(i => <button key={i} role="radio" aria-checked={i === conf} aria-label={`${i} of 5`} data-on={i <= conf ? "" : undefined} onClick={() => set({ confidence: i })} />)}</span>
              <Reveal show={open} side="end"><Spark values={conf !== t.history.at(-1) ? [...t.history, conf] : t.history} /></Reveal>
            </>}</Field>}
        <Field name="Happens by" focusable>{open => <>
          <Reveal show={!open} side="start"><Icon name="clock" size={12} /></Reveal>
          <Reveal show={open} side="start"><span className="ap-label">Happens by</span></Reveal>
          <Reveal show={open} side="start"><button className="pn-step" aria-label="Earlier" onClick={() => set({ horizon: edit.horizon - 1 })}><Icon name="minus" size={12} /></button></Reveal>
          <span className="ap-num pn-field-val">{edit.horizon}</span>
          <Reveal show={open} side="end"><button className="pn-step" aria-label="Later" onClick={() => set({ horizon: edit.horizon + 1 })}><Icon name="plus" size={12} /></button></Reveal>
        </>}</Field>
        {t.rivals.map(r => (
          <Field key={r} name="Rival">{open => <>
            <Reveal show={open} side="start"><span className="ap-label">Rival</span></Reveal>
            <motion.button className="pn-chip pn-rival" title="Rival" onClick={() => onOpen("theory", r)} initial={false} animate={{ maxWidth: open ? 420 : 180 }} transition={open ? { duration: 0.25, ease: EASE } : { duration: 0.12, ease: "easeOut" }}>
              <Swap /><span className="pn-clip"><Claim id={r} /></span>
            </motion.button>
          </>}</Field>
        ))}
        {t.challenge && <Mark kind="challenge" />}
      </div>
      <Editable className="pn-body" value={edit.body} onChange={body => set({ body })} aria-label="Body" />
      <Tripwire value={edit.tripwire} onChange={tripwire => set({ tripwire })} />
      <div className="pn-grid">
        {(["supports", "undermines"] as const).map(st => {
          const items = ev.filter(s => s.evidence.find(e => e.theory === id)!.stance === st);
          const name = st === "supports" ? "Supports" : "Undermines";
          return (
            <div key={st} className="pn-col">
              <Field name={name} focusable className="pn-ev-head">{open => <>
                <Icon name={st === "supports" ? "arrowUp" : "arrowDown"} size={12} />
                <Reveal show={open} side="end"><span className="pn-ev-name">{name}</span></Reveal>
                <span className="ap-num pn-field-val">{items.length}</span>
                <Reveal show={open} side="end"><button className="pn-step" aria-label={st === "supports" ? "Add supporting evidence" : "Add undermining evidence"} onClick={() => {}}><Icon name="plus" size={12} /></button></Reveal>
              </>}</Field>
              {items.map(s => (
                <SignalRow key={s.id} s={s} context={id} open={inline && unfolded === s.id} current={!inline && unfolded === s.id}
                  onToggle={() => toggle(s.id)} onOpen={onOpen} suggested={s.evidence.find(x => x.theory === id)!.suggested} />
              ))}
            </div>
          );
        })}
      </div>
      {(t.follows.length > 0 || leadsTo.length > 0 || protos.length > 0) && (
        <div className="pn-links">
          {t.follows.map(f => <button key={f} className="pn-chip" title="Follows from" onClick={() => onOpen("theory", f)}><Icon name="chevronLeft" size={12} /><Claim id={f} /></button>)}
          {leadsTo.map(f => <button key={f.id} className="pn-chip" title="Leads to" data-draft={f.draft ? "" : undefined} onClick={() => onOpen("theory", f.id)}><Claim id={f.id} /><Icon name="chevron" size={12} /></button>)}
          {protos.map(p => <button key={p.id} className="pn-chip" title="Prototype" onClick={() => onOpen("prototype", p.id)}><ProtoStatus id={p.id} /><ProtoName id={p.id} /></button>)}
        </div>
      )}
    </div>
  );
}

/* ── Theme: name, its theories, its signals ── */
export function ThemePane({ id, nav }: { id: string; nav: PaneNav }) {
  const { inline, unfolded, toggle } = useUnfold(nav);
  const ss = SIGNALS.filter(s => s.themes.includes(id));
  return (
    <div className="pn-doc">
      <ThemeHead id={id} />
      <div className="pn-cards">
        {theoriesIn(id).map(t => <TheoryTile key={t.id} id={t.id} onClick={() => nav.onOpen("theory", t.id)} />)}
        <button className="pn-tile pn-add" aria-label="State a theory" title="State a theory"><Icon name="plus" /></button>
      </div>
      <div className="pn-col">
        {ss.map(s => <SignalRow key={s.id} s={s} context={id} open={inline && unfolded === s.id} current={!inline && unfolded === s.id} onToggle={() => toggle(s.id)} onOpen={nav.onOpen} />)}
      </div>
    </div>
  );
}

/** A theme's editable name and its signal count: the head of any theme surface. */
export function ThemeHead({ id }: { id: string }) {
  const [edit, set] = useEdit("theme", id);
  return (
    <>
      <Editable as="h1" className="pn-title" value={edit.name} onChange={name => set({ name })} singleLine aria-label="Theme name" />
      <div className="pn-meta">
        <Field name="Signals" focusable>{open => <>
          <Icon name="signal" size={12} />
          <Reveal show={open} side="end"><span className="ap-label">Signals</span></Reveal>
          <span className="ap-num pn-field-val">{theme(id).signals}</span>
        </>}</Field>
        {theoriesIn(id).length === 0 && <Mark kind="open" />}
      </div>
    </>
  );
}

/** A theory as a readable tile. Morphs into the theory document when given a layoutId. */
export function TheoryTile({ id, onClick, layoutId, hidden, large }: { id: string; onClick: () => void; layoutId?: string; hidden?: boolean; large?: boolean }) {
  const t = theory(id);
  const [edit] = useEdit("theory", id);
  return (
    <motion.button layoutId={layoutId} className="pn-tile" data-large={large ? "" : undefined} data-draft={t.draft ? "" : undefined}
      style={{ visibility: hidden ? "hidden" : undefined, borderRadius: 8 }} onClick={onClick} transition={{ duration: 0.45, ease: EASE }}>
      <motion.span layout="position" className="pn-tile-inner">
        <span className="pn-claim">{edit.claim}</span>
        {large && <span className="pn-tile-body">{edit.body}</span>}
        <span className="pn-line">
          {!t.draft && <Conf n={edit.confidence} />}
          {large && <span className="ap-muted ap-num">+{t.supports} −{t.undermines}</span>}
          {t.challenge && <Mark kind="challenge" />}
          {t.pending > 0 && <Mark kind="pending" n={t.pending} />}
        </span>
      </motion.span>
    </motion.button>
  );
}

/* ── Prototype: name, status, the theories it tests, recording, notes ── */
const STATUSES = ["idea", "building", "built", "shelved"] as const;
export function PrototypePane({ id, nav }: { id: string; nav: PaneNav }) {
  const p = PROTOTYPES.find(x => x.id === id)!;
  const [edit, set] = useEdit("prototype", id);
  return (
    <div className="pn-doc">
      <Editable as="h1" className="pn-title" value={edit.name} onChange={name => set({ name })} singleLine aria-label="Prototype name" />
      <div className="pn-meta">
        <span className="pn-status" role="radiogroup" aria-label="Status">
          {STATUSES.map(s => <StatusButton key={s} s={s} on={s === edit.status} onClick={() => set({ status: s })} />)}
        </span>
        {p.theories.map(t => <button key={t} className="pn-chip" title="Tests" data-draft={theory(t).draft ? "" : undefined} onClick={() => nav.onOpen("theory", t)}><Icon name="theory" size={12} /><Claim id={t} /></button>)}
      </div>
      <div className="pn-media"><button className="pn-play" aria-label="Play recording" title="Play recording"><Icon name="play" size={14} /></button></div>
      <Editable className="pn-body" value={edit.body} onChange={body => set({ body })} placeholder="What it is and what you learned" aria-label="Notes" />
      <div className="pn-chips"><span className="pn-chip pn-static"><Icon name="link" size={12} />github.com/…</span><Kbd>⌘L</Kbd></div>
    </div>
  );
}

function StatusButton({ s, on, onClick }: { s: string; on: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const timer = useRef<number>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button role="radio" aria-checked={on} aria-label={s} onClick={onClick}
      onPointerEnter={e => { if (e.pointerType === "touch") return; clearTimeout(timer.current); timer.current = window.setTimeout(() => setHover(true), 120); }}
      onPointerLeave={() => { clearTimeout(timer.current); setHover(false); }}
      onFocus={e => { if (e.currentTarget.matches(":focus-visible")) setHover(true); }} onBlur={() => setHover(false)}>
      <span className="pn-status-glyph" aria-hidden><ProtoGlyph status={s} selected={on} /></span>
      <Reveal show={on || hover} side="end"><span className="pn-status-name">{s}</span></Reveal>
    </button>
  );
}

/** Whichever object is open. */
export function ObjectPane({ kind, id, nav }: { kind: ObjKind; id: string; nav: PaneNav }) {
  if (kind === "theme") return <ThemePane id={id} nav={nav} />;
  if (kind === "theory") return <TheoryPane id={id} nav={nav} />;
  return <PrototypePane id={id} nav={nav} />;
}

/* ── Expanding field ──
 * At rest a compact mark. After a short hover, on keyboard focus, or on tap, it grows in place
 * to show its name and its control; it closes on leave or blur unless something inside is being edited. */
export function Field({ name, focusable, className, children }: { name: string; focusable?: boolean; className?: string; children: (open: boolean) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(undefined);
  const tapped = useRef(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hover || focus || pinned;
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!pinned) return;
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setPinned(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [pinned]);
  return (
    <div ref={ref} className={"pn-field" + (className ? " " + className : "")} role="group" aria-label={name} tabIndex={focusable ? 0 : undefined} data-open={open ? "" : undefined}
      onPointerEnter={e => { if (e.pointerType === "touch") return; clearTimeout(timer.current); timer.current = window.setTimeout(() => setHover(true), 120); }}
      onPointerLeave={e => { if (e.pointerType === "touch") return; clearTimeout(timer.current); setHover(false); }}
      onPointerDown={e => {
        if (e.pointerType !== "touch") return;
        if (!open) { tapped.current = true; setPinned(true); }
        else if (pinned && !(e.target as Element).closest("button,[contenteditable]")) setPinned(false);
      }}
      onClickCapture={e => { if (tapped.current) { tapped.current = false; e.preventDefault(); e.stopPropagation(); } }}
      onFocus={e => { const el = e.target as HTMLElement; if (el.isContentEditable || el.matches(":focus-visible")) setFocus(true); }}
      onBlur={e => { if (!ref.current?.contains(e.relatedTarget as Node)) setFocus(false); }}>
      {children(open)}
    </div>
  );
}

/** A piece of a field that grows in sideways (or downwards) when the field opens. */
export function Reveal({ show, side, axis = "x", children }: { show: boolean; side: "start" | "end"; axis?: "x" | "y"; children: ReactNode }) {
  const reduce = useReducedMotion();
  const inT = { duration: reduce ? 0.15 : 0.25, ease: EASE };
  const outT = { duration: reduce ? 0.1 : 0.12, ease: "easeOut" as const };
  const shut = reduce ? "auto" : 0;
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.span className="pn-reveal" data-side={side} data-axis={axis}
          initial={axis === "x" ? { width: shut, opacity: 0 } : { height: shut, opacity: 0 }}
          animate={axis === "x" ? { width: "auto", opacity: 1, transition: inT } : { height: "auto", opacity: 1, transition: inT }}
          exit={axis === "x" ? { width: shut, opacity: 0, transition: outT } : { height: shut, opacity: 0, transition: outT }}>
          <span className="pn-reveal-in">{children}</span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* Confidence over time, values 1 to 5. */
function Spark({ values }: { values: number[] }) {
  const w = 44, h = 14, n = Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${(i / n) * (w - 2) + 1},${h - 1 - ((v - 1) / 4) * (h - 2)}`).join(" ");
  const last = pts.split(" ").at(-1)!.split(",");
  return (
    <svg className="pn-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`History ${values.join(", ")}`}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="1.8" fill="currentColor" />
    </svg>
  );
}

/* What would change my mind: a glyph and the user's words at rest; label and field when open. */
function Tripwire({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const name = "What would change my mind";
  const ed = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const has = !!value.trim();
  return (
    <Field name={name} className="pn-trip">{open => <>
      <button className="pn-trip-glyph" aria-label={name} tabIndex={-1} onClick={() => ed.current?.querySelector<HTMLElement>("[contenteditable]")?.focus()}><Icon name="turn" size={16} /></button>
      <div className="pn-trip-main" ref={ed}>
        <Reveal show={open} side="end" axis="y"><span className="ap-label">{name}</span></Reveal>
        <motion.div className="pn-trip-wrap" initial={false} animate={{ height: open || has ? "auto" : reduce ? "auto" : 0, opacity: open || has ? 1 : 0 }}
          transition={open ? { duration: 0.25, ease: EASE } : { duration: 0.12, ease: "easeOut" }}>
          <Editable className="pn-tripwire" value={value} onChange={onChange} aria-label={name} />
        </motion.div>
      </div>
    </>}</Field>
  );
}
