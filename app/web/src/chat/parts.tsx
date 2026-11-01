import { FiledToken } from "../ui/pill-study";
import { useState } from "react";
import { TheoryCard, Icon } from "../ui/atoms";
import { SignalRow } from "../ui/panes";
import { SIGNALS, THEORIES, THEMES } from "../ui/data";
import { openObject } from "../app/dialogs";
import { ObjectChatCard } from "./object-card";
import { AssistantText } from "./assistant-text";

const seenUnknown = new Set<string>();
export function ToolParts({parts}:{parts:any[]}) {
  return <>{parts.map((part,index)=>{
    if(part.type==="text") return <p className="ps-say" key={index}><AssistantText text={part.text??""}/></p>;
    if(part.type==="data-filed")return <FiledToken key={index} f={{theme:part.data.themeName??THEMES.find(t=>t.id===part.data.themeId)?.name??"",n:part.data.count,gists:(part.data.signals??[]).map((s:any)=>s.gist)}}/>;
    if(part.type==="data-draft") return <ObjectChatCard key={index} data={part.data} draftPart/>;
    if(part.type==="step-start"||part.type==="reasoning"||part.type?.startsWith("data-"))return null;
    if(part.state!=="output-available") return part.state==="output-error"?<p key={index} role="alert">{part.errorText}</p>:null;
    const name=part.type==="dynamic-tool"?part.toolName:part.type?.replace(/^tool-/,"");
    const output=part.output??{};
    if(name==="showTheory") {
      const id=output.theory?.id??output.id??output.theoryId??part.input?.id;
      return <ObjectChatCard key={index} data={{...output.theory,...output,id,kind:"theory"}}/>;
    }
    if(name==="showEvidenceSplit")return <EvidenceSplit key={index} output={output} input={part.input}/>;
    if(name==="showSignalList")return <Signals key={index} rows={output.signals??output.items??(Array.isArray(output)?output:[])}/>;
    if(name==="showThemeActivity") {
      const theme=output.theme??THEMES.find(t=>t.id===(output.themeId??part.input?.id));
      return <div className="ab-theme-activity" key={index}>{theme&&<button className="pn-chip" onClick={()=>openObject("theme",theme.id)}><Icon name="theme" size={14}/>{theme.name}</button>}<Signals rows={output.signals??[]}/>{(output.theories??[]).map((row:any)=>{const t=THEORIES.find(t=>t.id===row.id);return t?<TheoryCard key={t.id} t={t} onClick={()=>openObject("theory",t.id)}/>:null;})}</div>;
    }
    if(!seenUnknown.has(name)){seenUnknown.add(name);console.warn("Unknown chat part",part.type);}
    return null;
  })}</>;
}
function Signals({rows}:{rows:any[]}) {
  const [open,setOpen]=useState<string>();
  return <div className="pn-col">{rows.map(row=>{const id=typeof row==="string"?row:row.id;const signal=SIGNS(id);return signal?<SignalRow key={id} s={signal} open={open===id} onToggle={()=>setOpen(x=>x===id?undefined:id)} onOpen={openObject}/>:null;})}</div>;
}
const SIGNS=(id:string)=>SIGNALS.find(s=>s.id===id);
function EvidenceSplit({output,input}:{output:any;input:any}) {
  const id=output.theoryId??output.theory?.id??input?.id;
  const supports=output.supports??SIGNALS.filter(s=>s.evidence.some(e=>e.theory===id&&e.stance==="supports"));
  const undermines=output.undermines??SIGNALS.filter(s=>s.evidence.some(e=>e.theory===id&&e.stance==="undermines"));
  return <div className="pn-grid ab-chat-evidence">{[["Supports",supports],["Undermines",undermines]].map(([name,rows])=><div className="pn-col" key={name as string}><span className="ap-label">{name as string} {(rows as any[]).length}</span><Signals rows={rows as any[]}/></div>)}</div>;
}
