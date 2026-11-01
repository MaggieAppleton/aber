import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DUMPS, SIGNALS, THEORIES, PROTOTYPES, theoriesIn, theme, theory, signalsFor, prototypesFor, type Signal } from "./data";
import { Icon, IconButton, Conf, DumpIcon, Mark, ProtoGlyph } from "./atoms";
import { useEdit } from "./edits";
import { Editable } from "./editable";
import { Tripwire, tripState, type Decision } from "./tripwire";
import { tripFor } from "./trips";
import { ConfidenceSpark, type SparkVariant } from "./confidence-spark";
import { stancesFor, TODAY } from "./histories";
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

export { Editable };

/** Confidence history variant in the pane (no pick yet; see /details). */
const SPARK: SparkVariant = "A";

const Swap = () => <Icon name="swap" size={12} />;

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
  const trip = tripFor(id);
  const tripped = tripState(edit.tripwire, trip.hits, edit.decisions) === "tripped";
  return (
    <div className="pn-doc">
      <div className="pn-chips">{t.themes.map(th => <button key={th} className="pn-chip" title="Theme" onClick={() => onOpen("theme", th)}><Icon name="theme" size={12} /><ThemeName id={th} /></button>)}</div>
      <Editable as="h1" className="pn-title" value={edit.claim} onChange={claim => set({ claim })} singleLine aria-label="Claim" data-draft={t.draft ? "" : undefined} />
      <dl className="pn-meta">
        {t.draft
          ? <div className="pn-meta-row"><dt className="ap-label">Draft</dt><dd><span className="ap-ghost-actions"><IconButton icon="check" label="Accept (A)" /><IconButton icon="x" label="Discard (X)" /></span></dd></div>
          : <div className="pn-meta-row"><dt className="ap-label">Confidence</dt><dd>
              <span className="pn-conf" role="radiogroup" aria-label="Confidence">{[1, 2, 3, 4, 5].map(i => <button key={i} role="radio" aria-checked={i === conf} aria-label={`${i} of 5`} title={`${i} of 5`} data-on={i <= conf ? "" : undefined} onClick={() => set({ confidence: i })} />)}</span>
              <ConfidenceSpark stances={stancesFor(id, edit.log, edit.confidence)} variant={SPARK} />
              {(trip.hits.length ? tripped : t.challenge) && <Mark kind="challenge" />}
            </dd></div>}
        <div className="pn-meta-row"><dt className="ap-label">Happens by</dt><dd className="pn-year" role="group" aria-label="Happens by">
          <button className="pn-step" aria-label="Earlier" title="Earlier" onClick={() => set({ horizon: edit.horizon - 1 })}><Icon name="minus" size={12} /></button>
          <span className="ap-num pn-field-val">{edit.horizon}</span>
          <button className="pn-step" aria-label="Later" title="Later" onClick={() => set({ horizon: edit.horizon + 1 })}><Icon name="plus" size={12} /></button>
        </dd></div>
        {t.rivals.length > 0 && <div className="pn-meta-row"><dt className="ap-label">Rival</dt><dd className="pn-rivals">
          {t.rivals.map(r => <button key={r} className="pn-chip pn-rival" onClick={() => onOpen("theory", r)}><Swap /><span><Claim id={r} /></span></button>)}
        </dd></div>}
      </dl>
      <Editable className="pn-body" value={edit.body} onChange={body => set({ body })} aria-label="Body" />
      <TheoryTripwire id={id} />
      <div className="pn-grid">
        {(["supports", "undermines"] as const).map(st => {
          const items = ev.filter(s => s.evidence.find(e => e.theory === id)!.stance === st);
          const name = st === "supports" ? "Supports" : "Undermines";
          return (
            <div key={st} className="pn-col">
              <div className="pn-ev-head">
                <Icon name={st === "supports" ? "arrowUp" : "arrowDown"} size={12} />
                <span className="ap-label">{name}</span>
                <span className="ap-num pn-field-val">{items.length}</span>
                <button className="pn-step" aria-label={st === "supports" ? "Add supporting evidence" : "Add undermining evidence"} title={st === "supports" ? "Add supporting evidence" : "Add undermining evidence"} onClick={() => {}}><Icon name="plus" size={12} /></button>
              </div>
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
      <dl className="pn-meta">
        <div className="pn-meta-row"><dt className="ap-label">Signals</dt><dd>
          <span className="ap-num pn-field-val">{theme(id).signals}</span>
          {theoriesIn(id).length === 0 && <Mark kind="open" />}
        </dd></div>
      </dl>
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
      <dl className="pn-meta">
        <div className="pn-meta-row"><dt className="ap-label">Status</dt><dd>
          <span className="pn-status" role="radiogroup" aria-label="Status">
            {STATUSES.map(st => <StatusButton key={st} s={st} on={st === edit.status} onClick={() => set({ status: st })} />)}
          </span>
        </dd></div>
        {p.theories.length > 0 && <div className="pn-meta-row"><dt className="ap-label">Tests</dt><dd className="pn-rivals">
          {p.theories.map(t => <button key={t} className="pn-chip pn-rival" data-draft={theory(t).draft ? "" : undefined} onClick={() => nav.onOpen("theory", t)}><Icon name="theory" size={12} /><span><Claim id={t} /></span></button>)}
        </dd></div>}
      </dl>
      <div className="pn-media"><button className="pn-play" aria-label="Play recording" title="Play recording"><Icon name="play" size={14} /></button></div>
      <Editable className="pn-body" value={edit.body} onChange={body => set({ body })} placeholder="What it is and what you learned" aria-label="Notes" />
      <div className="pn-chips"><span className="pn-chip pn-static"><Icon name="link" size={12} />github.com/…</span></div>
    </div>
  );
}

/* The selected status shows its name; the others are glyphs, named on keyboard focus and to assistive tech. */
function StatusButton({ s, on, onClick }: { s: string; on: boolean; onClick: () => void }) {
  const [focus, setFocus] = useState(false);
  return (
    <button role="radio" aria-checked={on} aria-label={s} title={s} onClick={onClick}
      onFocus={e => { if (e.currentTarget.matches(":focus-visible")) setFocus(true); }} onBlur={() => setFocus(false)}>
      <span className="pn-status-glyph" aria-hidden><ProtoGlyph status={s} selected={on} /></span>
      <Reveal show={on || focus}><span className="pn-status-name">{s}</span></Reveal>
    </button>
  );
}

/** Whichever object is open. */
export function ObjectPane({ kind, id, nav }: { kind: ObjKind; id: string; nav: PaneNav }) {
  if (kind === "theme") return <ThemePane id={id} nav={nav} />;
  if (kind === "theory") return <TheoryPane id={id} nav={nav} />;
  return <PrototypePane id={id} nav={nav} />;
}

/** A status name that grows in sideways when its status is chosen. */
function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  const reduce = useReducedMotion();
  const shut = reduce ? "auto" : 0;
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.span className="pn-reveal" initial={{ width: shut, opacity: 0 }}
          animate={{ width: "auto", opacity: 1, transition: { duration: reduce ? 0.15 : 0.25, ease: EASE } }}
          exit={{ width: shut, opacity: 0, transition: { duration: reduce ? 0.1 : 0.12, ease: "easeOut" } }}>
          <span className="pn-reveal-in">{children}</span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* What would change my mind: the shared sentence tripwire, its words and decisions kept in the edits store. */
function TheoryTripwire({ id }: { id: string }) {
  const [edit, set] = useEdit("theory", id);
  const trip = tripFor(id);
  // While the empty blank is being typed into, keep its layout; it becomes a sentence once it loses focus.
  const [typing, setTyping] = useState(false);
  const state = typing ? "empty" : tripState(edit.tripwire, trip.hits, edit.decisions);
  const conf = edit.confidence ?? 3;
  const decide = (hid: string, d?: Decision) => {
    const prev = edit.decisions[hid], hit = trip.hits.find(h => h.id === hid)!;
    const decisions = { ...edit.decisions };
    if (d) decisions[hid] = d; else delete decisions[hid];
    if (d === "accepted" && prev !== "accepted") {
      const level = Math.max(1, conf - 1);
      set({ decisions, confidence: level, log: [...edit.log, { id: `acc-${hid}`, date: TODAY, short: "Now", level, note: `Lowered: ${hit.gist}`, signal: hit.gist, challenge: true }] });
    } else if (prev === "accepted" && d !== "accepted") {
      set({ decisions, confidence: Math.min(5, conf + 1), log: edit.log.filter(x => x.id !== `acc-${hid}`) });
    } else set({ decisions });
  };
  return <Tripwire state={state} text={edit.tripwire} setText={tripwire => set({ tripwire })} begin={() => setTyping(true)} commit={() => setTyping(false)}
    hits={trip.hits} decisions={edit.decisions} decide={decide} conf={conf} date={trip.date} />;
}
