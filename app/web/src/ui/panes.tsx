import { TooltipButton } from "./tooltip";
import { currentChallenge } from "../data/challenge-target";
import { SURFACE_RADII } from "./metrics";
import { beginObjectDrag,endObjectDrag } from "../data/object-drag";
import { Accordion } from "@base-ui/react/accordion";
import { act, field, json, world, rowFor, mutate, reportError, markRead } from "../data/live";
import { ask, createObject, linkObject, retireObject, inspectDump } from "../app/dialogs";
import { uploadMedia } from "../data/api";
import { mergeSignal } from "../app/signal-merge";
import { useState, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DUMPS, SIGNALS, THEORIES, PROTOTYPES, theoriesIn, theme, theory, signalsFor, prototypesFor, type Signal } from "./data";
import { Icon, IconButton, Conf, DumpIcon, Mark, Meter, ProtoGlyph, Tile, Decide } from "./atoms";
import { flushEdit, useEdit } from "./edits";
import { Editable } from "./editable";
import { Tripwire, tripState, type Decision } from "./tripwire";
import { tripFor } from "./trips";
import { ConfidenceSpark, type SparkVariant } from "./confidence-spark";
import { ConfidenceControl } from "./confidence-control";
import { RetirementNotice, retirementLabel } from "./object-status";
/** Retire is rare and destructive, so it carries a label (03 rule 8) and the archive glyph. */
const RetireButton = ({ label, onClick }: { label: string; onClick: () => void }) => <button type="button" className="ab-btn quiet" aria-label={label} onClick={onClick}><Icon name="archive" size={14} />Retire</button>;
import { SuggestionPreview } from "./suggestion-preview";
import { SuggestionReview } from "./suggestion-review";
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
export const TheoryConf = ({ id }: { id: string }) => <Meter n={useEdit("theory", id)[0].confidence} />;
export const ProtoStatus = ({ id }: { id: string }) => <ProtoGlyph status={useEdit("prototype", id)[0].status} />;

/* ── A signal: a row that unfolds in place ── */
/** A signal row. `feed`: the theme pane's dated feed, with a source glyph and the theories it moves. */
export function SignalRow({s,open,current,onToggle,onOpen,suggested,context,feed}:{s:Signal;open:boolean;current?:boolean;onToggle:()=>void;onOpen:OnOpen;suggested?:boolean;context?:string;feed?:boolean}) {
  return <Accordion.Root value={open?[s.id]:[]} onValueChange={()=>{onToggle();if(!open)markRead("signal",s.id);}}><Accordion.Item value={s.id} className="pn-sig" data-open={open?"":undefined} data-current={current?"":undefined} data-suggested={suggested?"":undefined}>
    <Accordion.Header style={{display:"contents"}}><Accordion.Trigger className="pn-ev" data-pick={s.id} data-kind="signal" data-label={s.gist} data-region={s.id}>{feed?<FeedLine s={s} context={context}/>:<span className="ab-obj"><Tile kind="signal"/><span className="ab-nm" data-unseen={field(s,"seenAt")==null?"":undefined}>{s.gist}</span><span className="ab-kv"><span>{s.source}</span><span className="ab-when ap-num">{s.day}</span></span></span>}</Accordion.Trigger></Accordion.Header>
    <Accordion.Panel className="pn-detail ab-accordion-panel"><SignalDetail s={s} onOpen={onOpen} context={context}/></Accordion.Panel>
  </Accordion.Item></Accordion.Root>;
}

/** Newest first; a signal without a creation time keeps its place after the dated ones. */
const byNewest = (ss: Signal[]) => {
  const at = (s: Signal) => { const t = Date.parse(field(s,"createdAt") ?? ""); return Number.isNaN(t) ? -Infinity : t; };
  return [...ss].sort((a, b) => at(b) - at(a));
};

/** A feed row's face: source glyph (new dot on its corner), gist over source, and the theme's theories it moves. */
function FeedLine({ s, context }: { s: Signal; context?: string }) {
  const moves = s.evidence.filter(e => !context || theory(e.theory).themes?.includes(context));
  return <>
    <span className="pn-feed-glyph"><Tile kind="signal" /></span>
    <span className="pn-feed-text"><span data-unseen={field(s,"seenAt")==null ? "" : undefined}>{s.gist}</span><span className="ap-muted">{s.source}</span></span>
    {moves.length>0&&<span className="pn-feed-to">{moves.map(e=><span key={e.theory} className="pn-feed-chip" data-suggested={e.suggested?"":undefined} title={e.stance==="supports"?"Supports":"Undermines"}><Icon name={e.stance==="supports"?"arrowUp":"arrowDown"} size={12}/><span><Claim id={e.theory}/></span></span>)}</span>}
  </>;
}

/** What an unfolded signal shows: a note, the theories it bears on, its themes and its dump. */
export function SignalDetail({ s, onOpen, onDump, context }: { s: Signal; onOpen: OnOpen; onDump?: (id: string) => void; context?: string }) {
  const rawSignal=rowFor("signal",s.id);
  const originIds=[...new Set([...(json<any[]>(rawSignal?.origins??rawSignal?.dumps,[]).map(origin=>typeof origin==="string"?origin:field(origin,"dumpId"))),s.dump].filter(Boolean))];
  const origins=originIds.map(id=>world.dumps.find(dump=>dump.id===id)).filter(Boolean);
  const [edit, set] = useEdit("signal", s.id);
  return (
    <div className="pn-detail-inner">
      <Editable className="pn-note" value={edit.gist} onChange={gist=>set({gist})} aria-label="Signal gist" />
      <Editable className="pn-note" value={edit.note} onChange={note => set({ note })} placeholder="Add a note" aria-label="Note" />
      {s.evidence.filter(e => e.theory !== context).map(e => (
        <button key={e.theory} className="pn-link" data-suggested={e.suggested ? "" : undefined} onClick={() => onOpen("theory", e.theory)}
          title={e.stance === "supports" ? "Supports" : "Undermines"}>
          <Icon name={e.stance === "supports" ? "arrowUp" : "arrowDown"} size={12} /><Claim id={e.theory} />
        </button>
      ))}
      <div className="pn-chips">
        {s.themes.filter(t => t !== context).map(t => <button key={t} className="pn-chip" title="Theme" onClick={() => onOpen("theme", t)}><Tile kind="theme" size="chip" /><ThemeName id={t} /></button>)}
        {origins.map(dump=><button key={dump!.id} className="pn-chip pn-origin" title={dump!.text??dump!.first} onClick={()=>onDump?onDump(dump!.id):inspectDump(dump!.id)}><DumpIcon d={dump as any}/><span>{dump!.first??dump!.text?.split("\n")[0]??"Voice note"}</span></button>)}
      </div>
      <div className="pn-chips">{json<any[]>(rowFor("signal",s.id)?.sources,[]).map((source,i)=>source.url ? <a key={source.id??i} className="pn-chip" href={source.url} target="_blank" rel="noreferrer"><Icon name="link" size={12}/>{source.title??source.url}</a> : <span key={i} className="ap-muted">{source.author??"Own observation"}</span>)}</div>
      <div className="pn-chips"><IconButton icon="merge" label="Merge signal" onClick={()=>void mergeSignal(s.id)}/>{context&&THEORIES.some(t=>t.id===context)&&<IconButton icon="minus" label="Remove evidence" onClick={()=>act("unlinkEvidence",{signalId:s.id,theoryId:context})}/>}<IconButton icon="minus" label="Unfile from a theme" onClick={async()=>{const themeId=await ask({title:"Unfile signal",choices:s.themes.map(id=>({id,label:world.themes.find(t=>t.id===id)?.name??"",kind:"theme"}))});if(themeId)act("unfileSignal",{signalId:s.id,themeId});}}/>{world.merges.filter(m=>field(m,"survivorId")===s.id&&!field(m,"undoneAt")).map(m=><button key={m.id} className="ap-btn" onClick={()=>act("undoMerge",{id:m.id})}>Undo merge</button>)}<IconButton icon="plus" label="File in a theme" onClick={async()=>{const id=await ask({title:"File signal",choices:world.themes.map(t=>({id:t.id,label:t.name,kind:"theme"}))});if(id)act("fileSignal",{signalId:s.id,themeId:id});}}/><IconButton icon="trash" label="Discard signal" onClick={()=>act("discardSignal",{id:s.id})}/></div>
    </div>
  );
}

/* ── Full-view parts (06 rung 3): head with a 32 title tile, labelled sections, relations as rows, suggestions as dashed blocks ── */
/** The head: an optional eyebrow, the 32 tile hanging so the title starts on the text edge, the title, then the key line. */
function FullHead({ kind, draft, eyebrow, title, keyLine }: { kind: ObjKind; draft?: boolean; eyebrow?: ReactNode; title: ReactNode; keyLine?: ReactNode }) {
  return <div className="ab-head">
    {eyebrow && <div className="ab-eyebrow">{eyebrow}</div>}
    <Tile kind={kind} size="title" draft={draft} />
    <div className="ab-head-text">{title}{keyLine && <div className="ab-keyline">{keyLine}</div>}</div>
  </div>;
}
/** A labelled relation section: the label on the tile column, a bare count, an optional add. */
function Section({ label, n, add, children }: { label: string; n?: number; add?: ReactNode; children: ReactNode }) {
  return <section className="ab-sec" aria-label={label}>
    <h2 className="ab-sh"><span>{label}</span>{n != null && <span className="ab-count">{n}</span>}{add && <span className="ab-sh-add">{add}</span>}</h2>
    {children}
  </section>;
}
/** A relation row: tile, name, one short key value right of the first line. */
function RelRow({ kind, name, rk, kv, draft, onClick }: { kind: ObjKind; name: ReactNode; rk?: ReactNode; kv?: ReactNode; draft?: boolean; onClick: () => void }) {
  return <button type="button" className="ab-obj ab-rel" data-draft={draft ? "" : undefined} onClick={onClick}>
    <Tile kind={kind} draft={draft} /><span className="ab-nm">{name}</span>{rk && <span className="ab-rk">{rk}</span>}{kv && <span className="ab-kv">{kv}</span>}
  </button>;
}
const TheoryRel = ({ id, onOpen }: { id: string; onOpen: OnOpen }) => { const t = theory(id); return <RelRow kind="theory" draft={t.draft} name={<Claim id={id} />} rk={t.draft ? undefined : <TheoryConf id={id} />} onClick={() => onOpen("theory", id)} />; };
const ProtoRel = ({ id, onOpen }: { id: string; onOpen: OnOpen }) => <RelRow kind="prototype" name={<ProtoName id={id} />} rk={<ProtoStatus id={id} />} onClick={() => onOpen("prototype", id)} />;
/** A suggested piece of evidence, first in the group it would join: a dashed block with the row, why, and Dismiss | Accept. */
function EvidenceBlock({ suggestion: sg, onOpen, context }: { suggestion: any; onOpen: OnOpen; context: string }) {
  const payload = json<any>(sg.payload ?? sg.payload_json, {});
  const sid = payload.signalId ?? payload.signal_id;
  const sig = SIGNALS.find(x => x.id === sid);
  const [busy, setBusy] = useState(false);
  const decide = async (decision: "accepted" | "discarded") => { if (busy) return; setBusy(true); try { await mutate("decideSuggestion", { id: sg.id, decision }); } catch {} finally { setBusy(false); } };
  return <div className="ab-block" data-suggestion-id={sg.id}>
    <button type="button" className="ab-obj ab-rel" onClick={() => sid && window.dispatchEvent(new CustomEvent("aber:open", { detail: { kind: "theory", id: context, unfolded: sid } }))}>
      <Tile kind="signal" /><span className="ab-nm">{sig?.gist ?? payload.gist ?? "Proposed evidence"}</span><span className="ab-kv"><span>{sig?.source ?? "Own observation"}</span></span>
    </button>
    {sg.reasoning && <p className="ab-why">{sg.reasoning}</p>}
    <div className="ab-block-foot"><Decide busy={busy} onDismiss={() => void decide("discarded")} onAccept={() => void decide("accepted")} /></div>
  </div>;
}
const pendingFor = (id: string) => world.suggestions.filter(s => s.status === "pending" && s.kind !== "challenge" && field(s, "targetId") === id);
const stanceOf = (s: any) => { const p = json<any>(s.payload ?? s.payload_json, {}); return p.stance === "supports" ? "supports" : "undermines"; };
const signalOf = (s: any) => { const p = json<any>(s.payload ?? s.payload_json, {}); return p.signalId ?? p.signal_id; };
/** Where a draft came from: the dump that made it. */
function DraftFrom({ id, onOpen: _onOpen }: { id: string; onOpen: OnOpen }) {
  const dump = DUMPS.find(d => d.produced.includes(id));
  return <><span className="ab-draft-tag">Draft</span>{dump && <><span>from</span><button type="button" className="pn-chip" title={dump.first} onClick={() => inspectDump(dump.id)}><Tile kind="dump" size="chip" /><span className="pn-chip-name">{dump.first}</span></button></>}</>;
}

/* ── Theory: claim, confidence, horizon, body, tripwire, then relations (06 rule 10) ── */
export function TheoryPane({ id, nav }: { id: string; nav: PaneNav }) {
  const t = theory(id);
  const [edit, set] = useEdit("theory", id);
  const { inline, unfolded, toggle } = useUnfold(nav);
  const { onOpen } = nav;
  const conf = edit.confidence;
  const trip = tripFor(id);
  // A signal the tripwire matched shows only under the tripwire while it is pending (or once dismissed);
  // accepting it makes it an ordinary piece of undermining evidence.
  const ev = signalsFor(id).filter(s => !trip.hits.some(h => h.id === s.id) || edit.decisions[s.id] === "accepted");
  const accepted = (sid: string) => trip.hits.some(h => h.id === sid) && edit.decisions[sid] === "accepted";
  const leadsTo = THEORIES.filter(x => x.follows.includes(id));
  const protos = prototypesFor(id);
  const pending = pendingFor(id);
  const evidenceSugs = pending.filter(s => s.kind === "evidence");
  const otherSugs = pending.filter(s => s.kind !== "evidence");
  const addRelation = async () => { const choice = await ask({ title: "Theory relationships", choices: [{ id: "theme", label: "Theme", kind: "theme" }, { id: "rival", label: "Rival", kind: "swap" }, { id: "follows", label: "Follows from", kind: "chevronLeft" }, { id: "prototype", label: "Prototype", kind: "prototype" }] }); if (choice) void linkObject(choice as any, id); };
  const acceptDraft = () => void flushEdit("theory", id).catch(() => {}).then(() => act("acceptDraft", { kind: "theory", id }));
  return (
    <div className="pn-doc pn-theory-doc ab-full" data-draft={t.draft ? "" : undefined}>
      <div className="ab-top">
        {t.draft && <Decide dismiss="Discard" acceptKey="a" acceptTitle="Accept (A)" onDismiss={() => act("discardDraft", { kind: "theory", id })} onAccept={acceptDraft} />}
        <span className="ab-tools"><IconButton icon="plus" label="Add a relationship" onClick={() => void addRelation()} /><RetireButton label="Retire theory" onClick={() => void retireObject("theory", id)} /></span>
      </div>
      <FullHead kind="theory" draft={t.draft} eyebrow={t.draft ? <DraftFrom id={id} onOpen={onOpen} /> : undefined}
        title={<Editable as="h1" className="pn-title" value={edit.claim} onChange={claim => set({ claim })} singleLine aria-label="Claim" data-draft={t.draft ? "" : undefined} />}
        keyLine={<>
          {!t.draft && <span className="ab-key ab-conf"><ConfidenceControl value={conf} onChange={confidence => set({ confidence })} /><ConfidenceSpark stances={stancesFor(id, edit.log, edit.confidence)} variant={SPARK} /></span>}
          <span className="ab-key pn-year" aria-label="Happens by">
            <TooltipButton className="pn-step" aria-label="Earlier" tooltip="Earlier" onClick={() => set({ horizon: edit.horizon - 1 })}><Icon name="chevronLeft" size={16} /></TooltipButton>
            <span className="ap-num pn-field-val">{edit.horizon}</span>
            <TooltipButton className="pn-step" aria-label="Later" tooltip="Later" onClick={() => set({ horizon: edit.horizon + 1 })}><Icon name="chevron" size={16} /></TooltipButton>
          </span>
        </>} />
      <RetirementNotice row={rowFor("theory",id)}/>
      <Editable className="pn-body" value={edit.body} onChange={body => set({ body })} placeholder="Why you hold it" aria-label="Body" />
      <TheoryTripwire id={id} />
      {otherSugs.map(s => <div key={s.id} className="ab-block ab-block-review"><SuggestionReview suggestion={s} /></div>)}
      <hr className="ab-div" />
      {t.themes.length > 0 && <Section label="Themes"><div className="pn-chips">{t.themes.map(th => <button key={th} className="pn-chip" onClick={() => onOpen("theme", th)}><Tile kind="theme" size="chip" /><span className="pn-chip-name"><ThemeName id={th} /></span></button>)}</div></Section>}
      {(["supports", "undermines"] as const).map(st => {
        const sugs = evidenceSugs.filter(s => stanceOf(s) === st);
        const blocked = new Set(sugs.map(signalOf));
        const items = ev.filter(s => s.evidence.find(e => e.theory === id)!.stance === st && !blocked.has(s.id));
        const name = st === "supports" ? "Supports" : "Undermines";
        return (
          <Section key={st} label={name} n={items.length} add={<TooltipButton className="pn-step" aria-label={st === "supports" ? "Add supporting evidence" : "Add undermining evidence"} tooltip={st === "supports" ? "Add supporting evidence" : "Add undermining evidence"} onClick={() => void linkObject("evidence",id,st)}><Icon name="plus" size={16} /></TooltipButton>}>
            <div className="ab-rows pn-col">
              {sugs.map(s => <EvidenceBlock key={s.id} suggestion={s} onOpen={onOpen} context={id} />)}
              {items.map(s => (
                <SignalRow key={s.id} s={s} context={id} open={inline && unfolded === s.id} current={!inline && unfolded === s.id}
                  onToggle={() => toggle(s.id)} onOpen={onOpen} suggested={!accepted(s.id) && s.evidence.find(x => x.theory === id)!.suggested} />
              ))}
            </div>
          </Section>
        );
      })}
      {t.rivals.length > 0 && <Section label="Rival"><div className="ab-rows">{t.rivals.map(r => <TheoryRel key={r} id={r} onOpen={onOpen} />)}</div></Section>}
      {t.follows.length > 0 && <Section label="Follows from"><div className="ab-rows">{t.follows.map(f => <TheoryRel key={f} id={f} onOpen={onOpen} />)}</div></Section>}
      {leadsTo.length > 0 && <Section label="Leads to"><div className="ab-rows">{leadsTo.map(f => <TheoryRel key={f.id} id={f.id} onOpen={onOpen} />)}</div></Section>}
      {protos.length > 0 && <Section label="Prototypes" n={protos.length}><div className="ab-rows">{protos.map(p => <ProtoRel key={p.id} id={p.id} onOpen={onOpen} />)}</div></Section>}
    </div>
  );
}

/* ── Theme: name, its theories, its signals ── */
export function ThemePane({ id, nav }: { id: string; nav: PaneNav }) {
  const { inline, unfolded, toggle } = useUnfold(nav);
  const ss = SIGNALS.filter(s => s.themes.includes(id));
  return (
    <div className="pn-doc ab-full">
      <div className="ab-top">
        {rowFor("theme",id)?.status==="draft"&&<Decide dismiss="Discard" acceptKey="a" acceptTitle="Accept draft theme (A)" onDismiss={()=>act("discardDraft",{kind:"theme",id})} onAccept={()=>act("acceptDraft",{kind:"theme",id})} />}
        <span className="ab-tools"><RetireButton label="Retire theme" onClick={()=>void retireObject("theme",id)}/></span>
      </div>
      <ThemeHead id={id} />
      <RetirementNotice row={rowFor("theme",id)}/>
      {pendingFor(id).map(s => <div key={s.id} className="ab-block ab-block-review"><SuggestionReview suggestion={s} /></div>)}
      <hr className="ab-div" />
      <Section label="Theories" n={theoriesIn(id).length}>
      <div className="pn-cards pn-deck">
        {theoriesIn(id).map(t => <TheoryTile key={t.id} id={t.id} deck onClick={() => nav.onOpen("theory", t.id)} />)}
        <button type="button" className="ab-slot" onClick={()=>void createObject("theory",id)}><Icon name="plus" size={14} />State a theory</button>
      </div>
      </Section>
      <Section label="Signals" n={ss.length}>
      <div className="pn-feed">
        {[...new Set(byNewest(ss).map(s => s.day))].map(day => (
          <div key={day} className="pn-feed-day">
            <div className="ap-label pn-feed-date">{day}</div>
            <div className="pn-col">
              {byNewest(ss).filter(s => s.day === day).map(s => <SignalRow key={s.id} s={s} feed context={id} open={inline && unfolded === s.id} current={!inline && unfolded === s.id} onToggle={() => toggle(s.id)} onOpen={nav.onOpen} />)}
            </div>
          </div>
        ))}
      </div>
      </Section>
    </div>
  );
}

/** A theme's editable name and its signal count: the head of any theme surface. */
export function ThemeHead({ id }: { id: string }) {
  const [edit, set] = useEdit("theme", id);
  const draft = rowFor("theme",id)?.status==="draft";
  return <FullHead kind="theme" draft={draft} eyebrow={draft ? <DraftFrom id={id} onOpen={() => {}} /> : undefined}
    title={<Editable as="h1" className="pn-title" value={edit.name} onChange={name => set({ name })} singleLine aria-label="Theme name" data-draft={draft?"":undefined} />}
    keyLine={<span className="ab-cnts">
      <span className="ab-cnt" title="Theories"><Icon name="theory" size={14} /><span className="ap-num">{theoriesIn(id).length}</span></span>
      <span className="ab-cnt" title="Signals"><Icon name="signal" size={14} /><span className="ap-num pn-field-val">{theme(id).signals}</span></span>
    </span>} />;
}

/** A theory as a readable tile. Morphs into the theory document when given a layoutId. */
/** `deck`: the theme pane's tall card, with the confidence history and an evidence bar in its foot. */
export function TheoryTile({ id, onClick, layoutId, hidden, large, deck }: { id: string; onClick: () => void; layoutId?: string; hidden?: boolean; large?: boolean; deck?: boolean }) {
  const t = theory(id);
  const [edit] = useEdit("theory", id);
  return (
    <motion.button draggable onDragStartCapture={event=>beginObjectDrag(event,{kind:"theory",id,label:edit.claim})} onDragEndCapture={endObjectDrag} layoutId={layoutId} className="pn-tile" data-pick={id} data-kind="theory" data-label={edit.claim} data-region={id} data-large={large ? "" : undefined} data-deck={deck ? "" : undefined} data-draft={t.draft ? "" : undefined}
      style={{ visibility: hidden ? "hidden" : undefined, borderRadius: SURFACE_RADII.card }} onClick={onClick} transition={{ duration: 0.45, ease: EASE }}>
      <motion.span layout="position" className="pn-tile-inner ab-obj ab-card-body">
        <Tile kind="theory" draft={t.draft} />
        <span className="pn-claim ab-nm">{edit.claim}</span>
        {!t.draft && <span className="ab-rk"><Meter n={edit.confidence} /></span>}
        {large && <span className="pn-tile-body ab-kv">{edit.body}</span>}
      </motion.span>
    </motion.button>
  );
}

/** A deck card's foot: confidence history (a draft has none), the support/undermine split as a bar, the counts and marks. */
function DeckFoot({ id }: { id: string }) {
  const t = theory(id);
  const [edit] = useEdit("theory", id);
  const total = Math.max(1, t.supports + t.undermines);
  return (
    <span className="pn-deck-foot">
      <span className="pn-deck-spark">{t.draft ? <span className="ap-muted">Draft</span> : <ConfidenceSpark stances={stancesFor(id, edit.log, edit.confidence)} variant="D" />}</span>
      <span className="pn-deck-bar" aria-hidden><i style={{ flexGrow: t.supports / total }} /><i data-down="" style={{ flexGrow: t.undermines / total }} /></span>
      <span className="pn-line ap-num pn-deck-bal" aria-label={`${t.supports} support, ${t.undermines} undermine`}>
        <span>+{t.supports}</span><span className="ap-muted">−{t.undermines}</span>
        {t.challenge && <Mark kind="challenge" />}
        {t.pending > 0 && <Mark kind="pending" n={t.pending} />}
      </span>
    </span>
  );
}

/* ── Prototype: name, status, the theories it tests, recording, notes ── */
const STATUSES = ["idea", "building", "built", "shelved"] as const;
export function PrototypePane({ id, nav }: { id: string; nav: PaneNav }) {
  const p = PROTOTYPES.find(x => x.id === id) ?? {id,name:"",status:"idea",theories:[]};
  const raw = rowFor("prototype",id);
  const mediaInput=useRef<HTMLInputElement>(null);
  const [uploading,setUploading]=useState(false);
  const [edit, set] = useEdit("prototype", id);
  return (
    <div className="pn-doc ab-full" data-draft={raw?.draft?"":undefined}>
      <div className="ab-top">
        {raw?.draft&&<Decide dismiss="Discard" acceptKey="a" acceptTitle="Accept draft prototype (A)" onDismiss={()=>act("discardDraft",{kind:"prototype",id})} onAccept={()=>act("acceptDraft",{kind:"prototype",id})} />}
      </div>
      <FullHead kind="prototype" draft={!!raw?.draft} eyebrow={raw?.draft ? <DraftFrom id={id} onOpen={nav.onOpen} /> : undefined}
        title={<Editable as="h1" className="pn-title" value={edit.name} onChange={name => set({ name })} singleLine aria-label="Prototype name" data-draft={raw?.draft?"":undefined} />}
        keyLine={<span className="pn-status" role="radiogroup" aria-label="Status">
          {STATUSES.map(st => <StatusButton key={st} s={st} on={st === edit.status} onClick={() => set({ status: st })} />)}
        </span>} />
      {json<any[]>(raw?.media,[]).map((media,i)=>{const src=`/media/${media.mediaId??media.media_id??media.id}`;return media.mime?.startsWith("video/") ? <video key={i} className="pn-media" src={src} controls/> : <img key={i} className="pn-media" src={src} alt={media.title??edit.name}/>;})}
      <Editable className="pn-body" value={edit.body} onChange={body => set({ body })} placeholder="What it is and what you learned" aria-label="Notes" />
      <hr className="ab-div" />
      <Section label="Tests" n={p.theories.length}><div className="ab-rows">{p.theories.map(t => <RelRow key={t} kind="theory" draft={theory(t).draft} name={<Claim id={t}/>} kv={retirementLabel(rowFor("theory",t)) ? <span>{retirementLabel(rowFor("theory",t))}</span> : undefined} onClick={() => nav.onOpen("theory", t)} />)}</div></Section>
      <div className="pn-chips">{json<any[]>(raw?.links??raw?.links_json,[]).map((link,i)=><a key={i} className="pn-chip" href={typeof link==="string"?link:link.url} target="_blank" rel="noreferrer"><Icon name="link" size={12}/>{typeof link==="string"?link:link.title??link.url}</a>)}<IconButton icon="link" label="Add link" onClick={async()=>{const url=await ask({title:"Add link",field:"URL"});if(url)act("editPrototype",{id,links:[...json<any[]>(raw?.links??raw?.links_json,[]),{url}]});}}/><IconButton icon="theory" label="Add theory to test" onClick={async()=>{const theoryId=await ask({title:"Tests",choices:THEORIES.map(t=>({id:t.id,label:t.claim,kind:"theory"}))});if(theoryId)act("linkPrototypeTheory",{prototypeId:id,theoryId});}}/><IconButton icon="paperclip" label="Attach media" onClick={()=>mediaInput.current?.click()}/><input ref={mediaInput} aria-label="Attach prototype media" type="file" accept="image/*,video/*" hidden onChange={async e=>{const file=e.target.files?.[0];if(!file||uploading)return;setUploading(true);try{const media=await uploadMedia(file);await mutate("attachPrototypeMedia",{prototypeId:id,mediaId:media.id,position:json<any[]>(raw?.media,[]).length});}catch(error){reportError(error);}finally{setUploading(false);if(mediaInput.current)mediaInput.current.value="";}}}/>{uploading&&<span role="status" className="ap-muted">Uploading media…</span>}</div>
    </div>
  );
}

/* The selected status shows its name; the others are glyphs, named on keyboard focus and to assistive tech. */
function StatusButton({ s, on, onClick }: { s: string; on: boolean; onClick: () => void }) {
  const [focus, setFocus] = useState(false);
  return (
    <TooltipButton role="radio" aria-checked={on} aria-label={s} tooltip={s} onClick={onClick}
      onFocus={e => { if (e.currentTarget.matches(":focus-visible")) setFocus(true); }} onBlur={() => setFocus(false)}>
      <span className="pn-status-glyph" aria-hidden><ProtoGlyph status={s} selected={on} /></span>
      <Reveal show={on || focus}><span className="pn-status-name">{s}</span></Reveal>
    </TooltipButton>
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

/** Decide a tripwire hit: accepting lowers confidence by one step and logs it; undoing restores it. Shared by the
 *  theory pane's tripwire and the Briefing's challenges, so a decision made in one shows in the other. */
export function useTripDecide(id: string) {
  const [edit, set] = useEdit("theory", id);
  const trip = tripFor(id);
  const conf = edit.confidence ?? 3;
  const decide = (hid: string,d?: Decision) => {
    const hit=trip.hits.find(hit=>hit.id===hid);
    const suggestion=currentChallenge(id,hid,hit?.suggestionId);
    if(suggestion) act("decideSuggestion",{id:suggestion.id,decision:d==="accepted"?"accepted":d==="dismissed"?"discarded":"undo"});
  };
  return { edit, set, trip, conf, decide };
}

/* What would change my mind: the shared sentence tripwire, its words and decisions kept in the edits store. */
function TheoryTripwire({ id }: { id: string }) {
  const { edit, set, trip, conf, decide } = useTripDecide(id);
  // While the empty blank is being typed into, keep its layout; it becomes a sentence once it loses focus.
  const [typing, setTyping] = useState(false);
  const state = typing ? "empty" : tripState(edit.tripwire, trip.hits, edit.decisions);
  return <Tripwire state={state} text={edit.tripwire} setText={tripwire => set({ tripwire })} begin={() => setTyping(true)} commit={() => setTyping(false)}
    hits={trip.hits} decisions={edit.decisions} decide={decide} conf={conf} date={trip.date} />;
}

function SuggestionActions({id}:{id:string}) {
  const suggestions=world.suggestions.filter(s=>s.status==="pending"&&s.kind!=="challenge"&&field(s,"targetId")===id);
  return <>{suggestions.map(s=><SuggestionPreview key={s.id} suggestion={s}/>)}</>;
}
