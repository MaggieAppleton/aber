import { useState, type FormEvent } from "react";
import { field, json, mutate, rowFor, type Row } from "../data/live";
import { openObject } from "../app/dialogs";
import { Decide, Icon, IconButton } from "./atoms";
import { suggestionFields } from "./suggestion-fields";
import "./suggestion-review.css";

/** The same proposed words and decisions in Briefing and the target's pane. */
export function SuggestionReview({suggestion:s}:{suggestion:Row}) {
  const payload=json<Row>(s.payload??s.payload_json,{}), fields=suggestionFields(s.kind,payload,field(s,"targetKind"));
  const targetKind=field(s,"targetKind"), targetId=field(s,"targetId"), target=rowFor(targetKind,targetId);
  const otherId=payload.otherId??payload.other_id, other=otherId?rowFor(targetKind,otherId):undefined;
  const signalId=payload.signalId??payload.signal_id, signal=signalId?rowFor("signal",signalId):undefined;
  const [editing,setEditing]=useState(false), [busy,setBusy]=useState(false), [words,setWords]=useState<Record<string,string>>({});
  const decide=async(decision:"accepted"|"discarded",overrides:Record<string,string>={})=>{
    if(busy)return;setBusy(true);
    try{await mutate("decideSuggestion",{id:s.id,decision,...overrides});}catch{}finally{setBusy(false);}
  };
  const submit=(event:FormEvent)=>{event.preventDefault();void decide("accepted",Object.fromEntries(fields.map(f=>[f.key,words[f.key]??f.value])));};
  return <div className="ab-proposal" data-suggestion-id={s.id} data-suggestion-kind={s.kind} aria-busy={busy}>
    {s.kind==="merge"&&<div className="ab-proposal-merge"><span className="ap-label">Keep</span><button className="pn-chip" onClick={()=>openObject(targetKind,targetId)}><Icon name={targetKind}/>{target?.name??target?.claim}</button><span className="ap-label">Merge into it</span><button className="pn-chip" onClick={()=>openObject(targetKind,otherId)}><Icon name={targetKind}/>{other?.name??other?.claim}</button></div>}
    {signal&&<button className="pn-link" onClick={()=>window.dispatchEvent(new CustomEvent("aber:open",{detail:{kind:targetKind,id:targetId,unfolded:signalId}}))}><Icon name={payload.stance==="supports"?"arrowUp":"arrowDown"} size={12}/><span>{payload.stance==="supports"?"Supports":"Undermines"}: {signal.gist}</span></button>}
    {s.kind==="evidence"&&signal&&<div className="pn-chips">{json<Row[]>(signal.sources,[]).map((source,index)=>source.url?<a className="pn-chip" key={source.id??index} href={source.url} target="_blank" rel="noreferrer"><Icon name="link" size={12}/>{source.title??source.url}</a>:<span className="ap-muted" key={index}>{source.author??"Own observation"}</span>)}</div>}
    {editing?<form className="ab-proposal-form" onSubmit={submit}>{fields.map(f=><label key={f.key}>{f.label}{f.multiline?<textarea className="ab-input" rows={4} value={words[f.key]??f.value} onChange={e=>setWords({...words,[f.key]:e.target.value})}/>:<input className="ab-input" required value={words[f.key]??f.value} onChange={e=>setWords({...words,[f.key]:e.target.value})}/>}</label>)}<div className="pn-chips ab-decide"><button type="button" className="ab-btn secondary" disabled={busy} onClick={()=>setEditing(false)}>Cancel</button><button className="ab-btn primary" disabled={busy}>Accept wording</button></div></form>:<>
      {!!fields.length&&<dl className="ab-proposal-fields">{fields.map(f=><div key={f.key}><dt className="ap-label">{f.label}</dt><dd>{f.value||(f.key==="body"?"Empty body":"No note")}</dd></div>)}</dl>}
      {s.reasoning&&<p className="ap-muted">{s.reasoning}</p>}
      <div className="pn-chips ab-decide-row">{!!fields.length&&<IconButton icon="edit" label="Rephrase and accept" disabled={busy} onClick={()=>setEditing(true)}/>}<Decide busy={busy} onDismiss={()=>void decide("discarded")} onAccept={()=>void decide("accepted")}/></div>
    </>}
  </div>;
}
