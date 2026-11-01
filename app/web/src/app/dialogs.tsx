import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Icon } from "../ui/atoms";
import { IconTooltip } from "../ui/tooltip";
import { THEMES, THEORIES, SIGNALS, PROTOTYPES } from "../ui/data";
import { mutate, reportError, rowFor, json, field, type Row } from "../data/live";
import { callTool } from "../data/api";
import { searchChoice } from "./search-results";

type Choice = { id: string; label: string; kind?: string; detail?: string };
type Prompt = { title: string; description?: string; choices?: Choice[]; search?: (query:string)=>Promise<Choice[]>; value?: string; field?: string; submit?: string; destructive?: boolean; content?:ReactNode; readOnly?:boolean; resolve: (value: string | undefined) => void };
let present: (prompt: Prompt) => void = () => {};
export function ask(options: Omit<Prompt,"resolve">): Promise<string | undefined> { return new Promise(resolve => present({...options,resolve})); }
export const openObject = (kind: string,id: string) => window.dispatchEvent(new CustomEvent("aber:open",{detail:{kind,id}}));

export function DialogHost() {
  const [prompt,setPrompt] = useState<Prompt>();
  const [query,setQuery] = useState("");
  const [found,setFound] = useState<Choice[]>([]), [searching,setSearching] = useState(false), [searchError,setSearchError] = useState("");
  present = p => { setQuery(p.value ?? ""); setPrompt(p); };
  const close = (value?: string) => { prompt?.resolve(value); setPrompt(undefined); };
  useEffect(()=>{
    if(!prompt?.search)return;
    let cancelled=false;setSearching(true);setFound([]);setSearchError("");
    const timer=setTimeout(()=>{void prompt.search!(query).then(rows=>{if(!cancelled)setFound(rows);}).catch(error=>{if(!cancelled)setSearchError(error instanceof Error?error.message:String(error));}).finally(()=>{if(!cancelled)setSearching(false);});},150);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[prompt,query]);
  const choosing=!!(prompt?.choices||prompt?.search);
  const matches=prompt?.search?found:prompt?.choices?.filter(choice=>choice.label.toLowerCase().includes(query.toLowerCase()));
  const submit = (e: FormEvent) => { e.preventDefault(); if(query.trim() || !prompt?.field) close(query.trim()); };
  return <Dialog.Root open={!!prompt} onOpenChange={open => { if(!open) close(); }}>
    <Dialog.Portal><Dialog.Backdrop className="ab-backdrop"/><Dialog.Popup className="ap ab-dialog" onKeyDown={e=>e.stopPropagation()}>
      <Dialog.Title className="ap-h">{prompt?.title}</Dialog.Title>
      <Dialog.Description className="ab-description">{prompt?.description ?? ""}</Dialog.Description>
      {prompt?.content}
      {choosing ? <><input autoFocus aria-label="Find" placeholder="Find" className="ab-input" value={query} onChange={e=>setQuery(e.target.value)}/>
        <div className="ab-options">{matches?.map(choice=><button key={choice.id} className="ab-option" onClick={()=>close(choice.id)}>
          {choice.kind && <Icon name={choice.kind as any} size={14}/>}<span>{choice.label}{choice.detail && <small>{choice.detail}</small>}</span><Icon name="chevron" size={12}/>
        </button>)}{searching&&<p className="ap-muted" role="status">Searching…</p>}{searchError&&<p role="alert">{searchError}</p>}{!searching&&!searchError&&!matches?.length&&<p className="ap-muted" role="status">No matches</p>}</div></> : <form onSubmit={submit}>
        {prompt?.field && <label className="ab-field">{prompt.field}<input autoFocus required className="ab-input" value={query} onChange={e=>setQuery(e.target.value)}/></label>}
        <div className="ab-dialog-actions">{!prompt?.readOnly&&<IconTooltip label="Cancel"><Dialog.Close type="button" className="ap-iconbtn" aria-label="Cancel"><Icon name="x"/></Dialog.Close></IconTooltip>}<button autoFocus={!prompt?.field} className="ap-btn" data-destructive={prompt?.destructive || undefined}>{prompt?.submit ?? "Save"}</button></div>
      </form>}
    </Dialog.Popup></Dialog.Portal>
  </Dialog.Root>;
}

export async function findObjects() {
  const result = await ask({title:"Find",search:async text=>(await callTool<Row[]>("search",{text,limit:100})).map(searchChoice)});
  if(result) {
    const colon=result.indexOf(":"),kind=result.slice(0,colon),id=result.slice(colon+1);
    if(kind==="signal"||kind==="dump")window.dispatchEvent(new CustomEvent("aber:browse",{detail:{kind,id}}));
    else openObject(kind,id);
  }
}
export async function createObject(kind: "theme"|"theory"|"prototype",themeId?: string) {
  const text = await ask({title:kind === "theory" ? "State a theory" : `New ${kind}`,field:kind === "theory" ? "Claim" : "Name",submit:"Create"});
  if(!text) return;
  try {
    const output = await mutate(`write${kind[0].toUpperCase()+kind.slice(1)}`,kind === "theory" ? {claim:text,horizon:new Date().getFullYear()+2,themes:themeId?[themeId]:[]} : {name:text});
    const id = output.id ?? output[kind]?.id ?? output.result?.id;
    if(id) openObject(kind,id);
  } catch {}
}
export async function linkObject(relation: "evidence"|"theme"|"rival"|"follows"|"prototype",id: string,stance?: string) {
  const choices = relation === "evidence" ? SIGNALS.map(t=>({id:t.id,label:t.gist,kind:"signal"})) : relation === "theme" ? THEMES.map(t=>({id:t.id,label:t.name,kind:"theme"})) : relation === "prototype" ? PROTOTYPES.map(t=>({id:t.id,label:t.name,kind:"prototype"})) : THEORIES.filter(t=>t.id!==id).map(t=>({id:t.id,label:t.claim,kind:"theory"}));
  const target = await ask({title: relation === "evidence" ? `Add ${stance === "supports" ? "supporting" : "undermining"} evidence` : `Add ${relation === "follows" ? "follows from" : relation}`,choices});
  if(!target) return;
  const tools = {evidence:"linkEvidence",theme:"linkTheoryTheme",rival:"linkRivals",follows:"linkFollows",prototype:"linkPrototypeTheory"};
  const input: Row = {theoryId:id};
  if(relation==="evidence") Object.assign(input,{signalId:target,stance});
  if(relation==="theme") input.themeId=target;
  if(relation==="rival") Object.assign(input,{aId:id,bId:target,rivalId:target});
  if(relation==="follows") input.fromId=target;
  if(relation==="prototype") input.prototypeId=target;
  try { await mutate(tools[relation],input); } catch {}
}
export async function retireObject(kind: string,id: string) {
  const reason = await ask({title:`Retire ${kind}`,choices:[{id:"disproven",label:"Disproven"},{id:"superseded",label:"Superseded"},{id:"abandoned",label:"Abandoned"}]});
  if(reason) try { await mutate(kind === "theory" ? "retireTheory" : "retireTheme",{id,reason}); window.dispatchEvent(new CustomEvent("aber:close")); } catch {}
}
export async function deleteDump(id: string) {
  try {
    const preview = await mutate("previewDeleteDump",{id});
    const signals = preview.signals ?? preview.signalCount ?? preview.removedSignals ?? 0;
    const evidence = preview.evidence ?? preview.evidenceLinks ?? preview.evidenceCount ?? 0;
    const confirmed = await ask({title:"Move dump to the bin?",description:`Removes ${signals} signals and ${evidence} evidence links. You can restore this dump for 30 days.`,submit:"Move to bin",destructive:true});
    if(confirmed !== undefined) await mutate("deleteDump",{id});
  } catch(cause) { reportError(cause); }
}

export function inspectDump(id:string) {
  const dump=rowFor("dump",id);if(!dump)return;
  const attachments=json<any[]>(dump.attachments,[]);
  void ask({title:dump.first??dump.text?.split("\n")[0]??"Voice note",description:new Date(field(dump,"capturedAt")).toLocaleString("en-GB"),submit:"Close",readOnly:true,content:<div className="ab-dump-content">
    {dump.text&&<p>{dump.text}</p>}{json<any[]>(dump.transcripts,[]).map((transcript,index)=><p key={index}>{transcript.text}</p>)}
    {attachments.map((attachment,index)=>{const url=attachment.url??`/media/${attachment.mediaId??attachment.media_id}`;return attachment.kind==="audio"?<audio key={index} controls src={url}/>:attachment.kind==="image"?<img key={index} src={url} alt={attachment.title??"Dump attachment"}/>:attachment.mime?.startsWith("video/")?<video key={index} controls src={url}/>:<a className="pn-chip" key={index} href={url} target="_blank" rel="noreferrer"><Icon name="link" size={14}/>{attachment.title??attachment.url??"Attachment"}</a>;})}
  </div>});
}
