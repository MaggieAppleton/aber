import { ask, openObject } from "../app/dialogs";
import { mutate, rowFor, world, type Row } from "../data/live";
import { draftKind } from "../data/draft-object";
import { TheoryCard, Icon, IconButton } from "../ui/atoms";
import { retirementLabel } from "../ui/object-status";
import type { Theory } from "../ui/data";

/** Stored replies remain legible after acceptance, retirement or draft discard. */
export function ObjectChatCard({data,draftPart=false}:{data:Row;draftPart?:boolean}) {
  const kind=draftKind(data,world);if(!kind||!data.id)return null;
  const current=rowFor(kind,data.id), object=current??data;
  const pending=!!current&&(current.status==="draft"||!!current.draft);
  const missing=draftPart&&!current;
  const title=object.claim??object.name;
  const decide=async(tool:string,words?:string)=>{
    try{await mutate(tool,{kind,id:data.id,...(words?{[kind==="theory"?"claim":"name"]:words}:{})});}catch{}
  };
  const rephrase=async()=>{const words=await ask({title:`Rephrase draft ${kind}`,field:kind==="theory"?"Claim":"Name",value:title,submit:"Accept wording"});if(words)await decide("rephraseDraft",words);};
  const status=retirementLabel(current)??(missing?"Draft discarded":undefined);
  const theory:Theory={...object,id:data.id,claim:title??"",body:object.body??"",themes:object.themes??[],confidence:object.confidence??null,supports:object.supports??0,undermines:object.undermines??0,horizon:object.horizon??new Date().getFullYear(),follows:object.follows??[],rivals:object.rivals??[],pending:object.pending??0,history:object.history??[],draft:pending};
  return <div className="ab-chat-theory" data-chat-kind={kind} data-chat-id={data.id}>
    {kind==="theory"?<TheoryCard t={theory} onClick={missing?undefined:()=>openObject(kind,data.id)}/>:<button className="ap-card ab-chat-object" data-draft={pending?"":undefined} disabled={missing} onClick={()=>openObject(kind,data.id)}><span className="ap-card-claim ap-inline"><Icon name={kind} size={14}/>{title}</span>{object.body&&<span>{object.body}</span>}</button>}
    {status&&<span className="ap-muted ab-retired">{status}</span>}
    {pending&&<div className="pn-chips"><button className="ap-btn" onClick={()=>void decide("acceptDraft")}>Accept</button><IconButton icon="edit" label="Rephrase and accept" onClick={()=>void rephrase()}/><IconButton icon="x" label="Discard" onClick={()=>void decide("discardDraft")}/></div>}
  </div>;
}
