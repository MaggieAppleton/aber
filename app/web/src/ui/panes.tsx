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
import { Icon, IconButton, Conf, DumpIcon, Mark, ProtoGlyph } from "./atoms";
import { useEdit } from "./edits";
import { Editable } from "./editable";
import { Tripwire, tripState, type Decision } from "./tripwire";
import { tripFor } from "./trips";
import { ConfidenceSpark, type SparkVariant } from "./confidence-spark";
import { ConfidenceControl } from "./confidence-control";
import { RetirementNotice, retirementLabel } from "./object-status";
import { SuggestionPreview } from "./suggestion-preview";
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
export function SignalRow({s,open,current,onToggle,onOpen,suggested,context}:{s:Signal;open:boolean;current?:boolean;onToggle:()=>void;onOpen:OnOpen;suggested?:boolean;context?:string}) {
  return <Accordion.Root value={open?[s.id]:[]} onValueChange={()=>{onToggle();if(!open)markRead("signal",s.id);}}><Accordion.Item value={s.id} className="pn-sig" data-open={open?"":undefined} data-current={current?"":undefined} data-suggested={suggested?"":undefined}>
    <Accordion.Header style={{display:"contents"}}><Accordion.Trigger className="pn-ev" data-pick={s.id} data-kind="signal" data-label={s.gist} data-region={s.id}><span className="pn-line">{field(s,"seenAt")==null&&<Mark kind="fresh"/>}<span>{s.gist}</span></span><span className="ap-muted">{s.source}</span></Accordion.Trigger></Accordion.Header>
    <Accordion.Panel className="pn-detail ab-accordion-panel"><SignalDetail s={s} onOpen={onOpen} context={context}/></Accordion.Panel>
  </Accordion.Item></Accordion.Root>;
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
        {s.themes.filter(t => t !== context).map(t => <button key={t} className="pn-chip" title="Theme" onClick={() => onOpen("theme", t)}><Icon name="theme" size={12} /><ThemeName id={t} /></button>)}
        {origins.map(dump=><button key={dump!.id} className="pn-chip pn-origin" title={dump!.text??dump!.first} onClick={()=>onDump?onDump(dump!.id):inspectDump(dump!.id)}><DumpIcon d={dump as any}/><span>{dump!.first??dump!.text?.split("\n")[0]??"Voice note"}</span></button>)}
      </div>
      <div className="pn-chips">{json<any[]>(rowFor("signal",s.id)?.sources,[]).map((source,i)=>source.url ? <a key={source.id??i} className="pn-chip" href={source.url} target="_blank" rel="noreferrer"><Icon name="link" size={12}/>{source.title??source.url}</a> : <span key={i} className="ap-muted">{source.author??"Own observation"}</span>)}</div>
      <div className="pn-chips"><IconButton icon="merge" label="Merge signal" onClick={()=>void mergeSignal(s.id)}/>{context&&THEORIES.some(t=>t.id===context)&&<IconButton icon="x" label="Remove evidence" onClick={()=>act("unlinkEvidence",{signalId:s.id,theoryId:context})}/>}<IconButton icon="minus" label="Unfile from a theme" onClick={async()=>{const themeId=await ask({title:"Unfile signal",choices:s.themes.map(id=>({id,label:world.themes.find(t=>t.id===id)?.name??"",kind:"theme"}))});if(themeId)act("unfileSignal",{signalId:s.id,themeId});}}/>{world.merges.filter(m=>field(m,"survivorId")===s.id&&!field(m,"undoneAt")).map(m=><button key={m.id} className="ap-btn" onClick={()=>act("undoMerge",{id:m.id})}>Undo merge</button>)}<IconButton icon="plus" label="File in a theme" onClick={async()=>{const id=await ask({title:"File signal",choices:world.themes.map(t=>({id:t.id,label:t.name,kind:"theme"}))});if(id)act("fileSignal",{signalId:s.id,themeId:id});}}/><IconButton icon="trash" label="Discard signal" onClick={()=>act("discardSignal",{id:s.id})}/></div>
    </div>
  );
}

/* ── Theory: claim, confidence, horizon, rival, body, tripwire, evidence, lineage ── */
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
  const tripped = tripState(edit.tripwire, trip.hits, edit.decisions) === "tripped";
  return (
    <div className="pn-doc pn-theory-doc">
      <div className="pn-theory-head">
        <div className="pn-theory-themes">{t.themes.map(th => <button key={th} className="pn-chip" title="Theme" onClick={() => onOpen("theme", th)}><Icon name="theme" size={12} /><span className="pn-chip-name"><ThemeName id={th} /></span></button>)}</div>
        <div className="pn-theory-actions"><IconButton icon="plus" label="Add a relationship" onClick={async()=>{const choice=await ask({title:"Theory relationships",choices:[{id:"theme",label:"Theme",kind:"theme"},{id:"rival",label:"Rival",kind:"swap"},{id:"follows",label:"Follows from",kind:"chevronLeft"},{id:"prototype",label:"Prototype",kind:"prototype"}]});if(choice)void linkObject(choice as any,id);}}/><IconButton icon="edit" label="Rephrase and accept draft" onClick={async()=>{const claim=await ask({title:"Rephrase theory",field:"Claim",value:edit.claim,submit:t.draft?"Accept":"Save"});if(claim)act(t.draft?"rephraseDraft":"editTheory",{id,kind:"theory",claim});}}/><IconButton icon="trash" label="Retire theory" onClick={()=>void retireObject("theory",id)}/></div>
      </div>
      <Editable as="h1" className="pn-title" value={edit.claim} onChange={claim => set({ claim })} singleLine aria-label="Claim" data-draft={t.draft ? "" : undefined} />
      <RetirementNotice row={rowFor("theory",id)}/>
      <dl className="pn-meta">
        {t.draft
          ? <div className="pn-meta-row"><dt className="ap-label">Draft</dt><dd><span className="ap-ghost-actions"><IconButton icon="check" label="Accept (A)" shortcut="a" onClick={()=>act("acceptDraft",{kind:"theory",id})} /><IconButton icon="x" label="Discard (X)" shortcut="x" onClick={()=>act("discardDraft",{kind:"theory",id})} /></span></dd></div>
          : <div className="pn-meta-row"><dt className="ap-label">Confidence</dt><dd>
              <ConfidenceControl value={conf} onChange={confidence => set({ confidence })} />
              <ConfidenceSpark stances={stancesFor(id, edit.log, edit.confidence)} variant={SPARK} />
              {(trip.hits.length ? tripped : t.challenge) && <Mark kind="challenge" />}
            </dd></div>}
        <div className="pn-meta-row"><dt className="ap-label">Happens by</dt><dd className="pn-year">
          <TooltipButton className="pn-step" aria-label="Earlier" tooltip="Earlier" onClick={() => set({ horizon: edit.horizon - 1 })}><Icon name="minus" size={12} /></TooltipButton>
          <span className="ap-num pn-field-val">{edit.horizon}</span>
          <TooltipButton className="pn-step" aria-label="Later" tooltip="Later" onClick={() => set({ horizon: edit.horizon + 1 })}><Icon name="plus" size={12} /></TooltipButton>
        </dd></div>
        {t.rivals.length > 0 && <div className="pn-meta-row"><dt className="ap-label">Rival</dt><dd className="pn-rivals">
          {t.rivals.map(r => <button key={r} className="pn-chip pn-rival" onClick={() => onOpen("theory", r)}><Swap /><span><Claim id={r} /></span></button>)}
        </dd></div>}
      </dl>
      <Editable className="pn-body" value={edit.body} onChange={body => set({ body })} aria-label="Body" />
      <TheoryTripwire id={id} />
      <SuggestionActions id={id}/>
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
                <TooltipButton className="pn-step" aria-label={st === "supports" ? "Add supporting evidence" : "Add undermining evidence"} tooltip={st === "supports" ? "Add supporting evidence" : "Add undermining evidence"} onClick={() => void linkObject("evidence",id,st)}><Icon name="plus" size={12} /></TooltipButton>
              </div>
              {items.map(s => (
                <SignalRow key={s.id} s={s} context={id} open={inline && unfolded === s.id} current={!inline && unfolded === s.id}
                  onToggle={() => toggle(s.id)} onOpen={onOpen} suggested={!accepted(s.id) && s.evidence.find(x => x.theory === id)!.suggested} />
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
      <RetirementNotice row={rowFor("theme",id)}/>
      <SuggestionActions id={id}/>
      <div className="pn-chips">{rowFor("theme",id)?.status==="draft"&&<><button className="ap-btn" aria-keyshortcuts="a" title="Accept draft theme (A)" onClick={()=>act("acceptDraft",{kind:"theme",id})}>Accept</button><IconButton icon="x" label="Discard draft theme (X)" shortcut="x" onClick={()=>act("discardDraft",{kind:"theme",id})}/></>}<IconButton icon="trash" label="Retire theme" onClick={()=>void retireObject("theme",id)}/></div>
      <div className="pn-cards">
        {theoriesIn(id).map(t => <TheoryTile key={t.id} id={t.id} onClick={() => nav.onOpen("theory", t.id)} />)}
        <TooltipButton className="pn-tile pn-add" aria-label="State a theory" tooltip="State a theory" onClick={()=>void createObject("theory",id)}><Icon name="plus" /></TooltipButton>
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
      <Editable as="h1" className="pn-title" value={edit.name} onChange={name => set({ name })} singleLine aria-label="Theme name" data-draft={rowFor("theme",id)?.status==="draft"?"":undefined} />
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
    <motion.button draggable onDragStartCapture={event=>beginObjectDrag(event,{kind:"theory",id,label:edit.claim})} onDragEndCapture={endObjectDrag} layoutId={layoutId} className="pn-tile" data-pick={id} data-kind="theory" data-label={edit.claim} data-region={id} data-large={large ? "" : undefined} data-draft={t.draft ? "" : undefined}
      style={{ visibility: hidden ? "hidden" : undefined, borderRadius: SURFACE_RADII.card }} onClick={onClick} transition={{ duration: 0.45, ease: EASE }}>
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
  const p = PROTOTYPES.find(x => x.id === id) ?? {id,name:"",status:"idea",theories:[]};
  const raw = rowFor("prototype",id);
  const mediaInput=useRef<HTMLInputElement>(null);
  const [uploading,setUploading]=useState(false);
  const [edit, set] = useEdit("prototype", id);
  return (
    <div className="pn-doc">
      <Editable as="h1" className="pn-title" value={edit.name} onChange={name => set({ name })} singleLine aria-label="Prototype name" data-draft={raw?.draft?"":undefined} />
      {raw?.draft&&<div className="pn-chips"><button className="ap-btn" aria-keyshortcuts="a" title="Accept draft prototype (A)" onClick={()=>act("acceptDraft",{kind:"prototype",id})}>Accept</button><IconButton icon="x" label="Discard draft prototype (X)" shortcut="x" onClick={()=>act("discardDraft",{kind:"prototype",id})}/></div>}
      <dl className="pn-meta">
        <div className="pn-meta-row"><dt className="ap-label">Status</dt><dd>
          <span className="pn-status" role="radiogroup" aria-label="Status">
            {STATUSES.map(st => <StatusButton key={st} s={st} on={st === edit.status} onClick={() => set({ status: st })} />)}
          </span>
        </dd></div>
        {p.theories.length > 0 && <div className="pn-meta-row"><dt className="ap-label">Tests</dt><dd className="pn-rivals">
          {p.theories.map(t => <button key={t} className="pn-chip pn-rival" data-draft={theory(t).draft ? "" : undefined} data-retired={retirementLabel(rowFor("theory",t))?"":undefined} onClick={() => nav.onOpen("theory", t)}><Icon name="theory" size={12} /><span className="pn-tested-claim"><Claim id={t}/>{retirementLabel(rowFor("theory",t))&&<small>{retirementLabel(rowFor("theory",t))}</small>}</span></button>)}
        </dd></div>}
      </dl>
      {json<any[]>(raw?.media,[]).map((media,i)=>{const src=`/media/${media.mediaId??media.media_id??media.id}`;return media.mime?.startsWith("video/") ? <video key={i} className="pn-media" src={src} controls/> : <img key={i} className="pn-media" src={src} alt={media.title??edit.name}/>;})}
      <Editable className="pn-body" value={edit.body} onChange={body => set({ body })} placeholder="What it is and what you learned" aria-label="Notes" />
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
