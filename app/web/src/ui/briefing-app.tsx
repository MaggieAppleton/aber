import { currentSuggestion } from "../data/challenge-target";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Accordion } from "@base-ui/react/accordion";
import { DUMPS, THEMES, THEORIES, SIGNALS } from "./data";
import { Balance, Icon, IconButton, Mark } from "./atoms";
import { SignalRow, ThemeName, type ObjKind, type OnOpen } from "./panes";
import { field, json, markRead, mutate, useWorld, world, type Row } from "../data/live";
import "./briefing-app.css";
import { SuggestionReview } from "./suggestion-review";
export type BriefingHost = {open?:{kind:ObjKind;id:string};onOpen:OnOpen;compact?:boolean;onLog?:()=>void};
type Item={id:string;group:string;kind:string;target:string;targetKind:ObjKind;row:Row};
function itemsNow(): Item[] {
  const items: Item[]=[];
  for(const suggestion of world.suggestions) if(suggestion.status==="pending" && currentSuggestion(suggestion) && field(suggestion,"seenAt")==null) items.push({id:suggestion.id,group:suggestion.kind==="challenge"?"Challenges":"Suggestions",kind:suggestion.kind,target:field(suggestion,"targetId"),targetKind:field(suggestion,"targetKind")??"theory",row:suggestion});
  for(const [kind,rows] of [["theory",world.theories],["theme",world.themes],["prototype",world.prototypes]] as const) for(const row of rows) if((row.status==="draft"||row.draft) && field(row,"seenAt")==null) items.push({id:row.id,group:"Drafts",kind:"draft",target:row.id,targetKind:kind,row});
  for(const merge of world.merges) if(!field(merge,"undoneAt") && field(merge,"seenAt")==null)items.push({id:merge.id,group:"Merged",kind:"near-dup",target:field(merge,"survivorId"),targetKind:"theme",row:merge});
  for(const theme of THEMES) {const signals=SIGNALS.filter(s=>s.themes.includes(theme.id)&&field(s,"seenAt")==null);if(signals.length)items.push({id:`signals:${theme.id}`,group:"New signals",kind:"signals",target:theme.id,targetKind:"theme",row:{...theme,signals}});}
  return items;
}
const GROUPS=["Challenges","Drafts","Suggestions","Merged","New signals"];
const typing=(target:EventTarget|null)=>target instanceof HTMLElement&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
export function BriefingView({host,phone}:{host:BriefingHost;phone?:boolean}) {
  useWorld();
  const items=itemsNow();
  const processing=world.dumps.filter(d=>["processing","received","transcribing"].includes(d.status)).length;
  const [cursor,setCursor]=useState<string>();
  const root=useRef<HTMLDivElement>(null);
  const current=items.find(x=>x.id===cursor)??items[0];
  const open=(item:Item)=>{
    if(item.kind==="near-dup") {const s=SIGNALS.find(s=>s.id===item.target);if(s?.themes[0])host.onOpen("theme",s.themes[0]);}
    else host.onOpen(item.targetKind,item.target);
  };
  const decide=async(item:Item,decision:"accepted"|"discarded")=>{
    const index=items.findIndex(x=>x.id===item.id);setCursor(items[index+1]?.id??items[index-1]?.id);
    try {
      if(item.kind==="signals") for(const signal of item.row.signals) await mutate(decision==="accepted"?"markSeen":"discardSignal",{kind:"signal",id:signal.id});
      else if(item.kind==="draft") await mutate(decision==="accepted"?"acceptDraft":"discardDraft",{kind:item.targetKind,id:item.target});
      else if(item.kind==="near-dup") await mutate(decision==="accepted"?"markSeen":"undoMerge",decision==="accepted"?{kind:"merge",id:item.id}:{id:item.id});
      else await mutate("decideSuggestion",{id:item.id,decision});
    }catch{}
  };
  const live=useRef({items,current,open,decide,paneOpen:!!host.open});live.current={items,current,open,decide,paneOpen:!!host.open};
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.metaKey||e.ctrlKey||e.altKey||e.defaultPrevented||typing(e.target)||(e.target instanceof Element&&e.target.closest(".as-pane,.ps-surface,.ab-dialog,.ab-proposal-form")))return;
      if(live.current.paneOpen&&["a","x","u"].includes(e.key.toLowerCase()))return;
      const {items,current,open,decide}=live.current;
      const index=Math.max(0,items.findIndex(x=>x.id===current?.id));
      if(["j","k","ArrowDown","ArrowUp"].includes(e.key)){e.preventDefault();const step=e.key==="j"||e.key==="ArrowDown"?1:-1;const item=items[Math.max(0,Math.min(items.length-1,index+step))];if(item){setCursor(item.id);root.current?.querySelector(`[data-bid="${CSS.escape(item.id)}"]`)?.scrollIntoView({block:"nearest",behavior:"smooth"});}}
      if(!current)return;
      if(e.key.toLowerCase()==="a"){e.preventDefault();void decide(current,"accepted");}
      if(e.key.toLowerCase()==="x"){e.preventDefault();void decide(current,"discarded");}
      if(e.key.toLowerCase()==="u"&&current.kind==="near-dup"){e.preventDefault();void decide(current,"discarded");}
      if(e.key.toLowerCase()==="o"||e.key==="Enter"&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();open(current);}
    };
    window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);
  },[]);
  return <div className="ap br" ref={root} data-phone={phone?"":undefined} data-compact={host.compact?"":undefined}><div className="br-scroll ap-scroll"><div className="br-col">
    <header className="br-head"><span className="ap-h">Since you last looked</span><span className="br-left ap-muted ap-num" aria-live="polite">{items.length?`${items.length} left`:"Done"}</span></header>
    <Overnight onLog={host.onLog} processing={processing}/>
    {!items.length&&<p className="ap-muted">All caught up.</p>}
    {GROUPS.map(group=><section className="br-group" key={group}>{items.some(x=>x.group===group)&&<h3 className="ap-label br-group-name">{group}<span className="ap-num">{items.filter(x=>x.group===group).length}</span></h3>}<AnimatePresence initial={false}>{items.filter(x=>x.group===group).map(item=><motion.div layout="position" key={item.id} className="br-item" data-bid={item.id} data-cursor={current?.id===item.id?"":undefined} onPointerEnter={()=>setCursor(item.id)} onFocus={()=>setCursor(item.id)} onPointerDown={()=>setCursor(item.id)} exit={{opacity:0,x:40}} transition={{duration:.2}}>
      <BriefingItem item={item} host={host} onOpen={()=>open(item)} onDecide={d=>void decide(item,d)}/>
    </motion.div>)}</AnimatePresence></section>)}
  </div></div></div>;
}
function Overnight({onLog,processing}:{onLog?:()=>void;processing:number}) {
  const dumps=DUMPS.filter(d=>d.day==="Today"||d.day==="Yesterday");
  const produced=new Set(dumps.flatMap(d=>d.produced));
  const signals=SIGNALS.filter(s=>produced.has(s.id)).length;
  const since=new Date();since.setHours(0,0,0,0);since.setDate(since.getDate()-1);
  const drafts=[...THEORIES.filter(t=>t.draft),...world.themes.filter(t=>t.status==="draft"),...world.prototypes.filter(p=>p.draft)].filter(row=>new Date(field(row,"createdAt")??0)>=since).length;
  return <TooltipButton className="br-flow" onClick={onLog} tooltip={processing?`${processing} processing. Dump log (⌘⇧L)`:"Dump log (⌘⇧L)"} aria-label={`${dumps.length} dumps became ${signals} signals and ${drafts} drafts. Open the dump log`}>
    <span className="ap-num">{dumps.length}</span><Icon name="dump" size={14}/><Icon name="arrowRight" size={12}/>
    <span className="ap-num">{signals}</span><Icon name="signal" size={14}/><span className="ap-num">{drafts}</span><span className="br-flow-draft"><Icon name="theory" size={14}/></span>
  </TooltipButton>;
}
function BriefingItem({item,host,onOpen,onDecide}:{item:Item;host:BriefingHost;onOpen:()=>void;onDecide:(decision:"accepted"|"discarded")=>void}) {
  const [reviewing,setReviewing]=useState(false);
  const payload=json<Row>(item.row.payload??item.row.payloadJson??item.row.payload_json,{});
  const signal=SIGNALS.find(s=>s.id===(payload.signalId??payload.signal_id??item.target));
  const review=["revision","evidence","merge"].includes(item.kind);
  const theory=THEORIES.find(t=>t.id===item.target);
  let title=item.row.claim??item.row.name??"";
  if(item.kind!=="draft"&&item.kind!=="signals") title=THEORIES.find(t=>t.id===item.target)?.claim??THEMES.find(t=>t.id===item.target)?.name??signal?.gist??"Merged signals";
  if(item.kind==="merge")title=`Merge ${title} with ${THEMES.find(t=>t.id===(payload.otherId??payload.other_id))?.name??THEORIES.find(t=>t.id===(payload.otherId??payload.other_id))?.claim??""}`;
  const actions=<span className="br-acts">{item.kind==="near-dup"?<><button className="ap-btn" title="Undo merge (U)" onClick={()=>onDecide("discarded")}><Icon name="split" size={12}/>Undo merge</button><IconButton icon="check" label="Keep merge (A)" onClick={()=>onDecide("accepted")}/></>:<><button className="ap-btn" onClick={()=>onDecide("accepted")}>Accept</button><IconButton icon="x" label={item.kind==="challenge"?"Dismiss (X)":"Discard (X)"} onClick={()=>onDecide("discarded")}/></>}</span>;
  if(item.kind==="signals") return <NewSignals item={item} host={host} onOpen={onOpen} onSeen={()=>onDecide("accepted")}/>;
  const glyph=item.kind==="near-dup"||item.kind==="merge"?"merge":item.kind==="revision"?"edit":item.targetKind;
  return <div className="br-row" data-draft={item.kind==="draft"?"":undefined}><span className="br-glyph"><Icon name={glyph} size={14}/>{review&&!reviewing&&<span className="br-rephrase"><IconButton icon="edit" label="Review suggestion" onClick={()=>setReviewing(true)}/></span>}</span><div className="br-main"><div className="br-title">{item.kind==="challenge"&&<Mark kind="challenge"/>}<button className="br-open" onClick={onOpen}>{item.kind==="revision"?<s className="br-was">{title}</s>:title}</button></div><div className="br-detail">
    {reviewing?<><SuggestionReview suggestion={item.row}/><button className="br-link" onClick={()=>setReviewing(false)}>Close review</button></>:<>{signal&&<span className="br-ghost br-sig"><Icon name={payload.stance==="supports"?"arrowUp":"arrowDown"} size={12}/><span>{signal.gist} <span className="ap-muted">{signal.source}</span></span></span>}
    {(payload.claim||payload.bodyInsert||payload.body_insert)&&<span className="br-ghost">{payload.claim??payload.bodyInsert??payload.body_insert}</span>}
    {item.row.reasoning&&!review&&<span className="ap-muted">{item.row.reasoning}</span>}
    {item.kind==="evidence"&&payload.note&&<span className="br-ghost">{payload.note}</span>}
    {item.kind==="draft"&&(theory?<span className="br-meta"><Balance s={theory.supports} u={theory.undermines}/>{theory.themes[0]&&<span className="ap-muted ap-inline"><Icon name="theme" size={12}/><ThemeName id={theory.themes[0]}/></span>}</span>:item.row.body&&<span className="br-ghost">{item.row.body}</span>)}</>}
  </div></div>{!reviewing&&actions}</div>;
}

function NewSignals({item,host,onOpen,onSeen}:{item:Item;host:BriefingHost;onOpen:()=>void;onSeen:()=>void}) {
  const [expanded,setExpanded]=useState(false);
  const [signalOpen,setSignalOpen]=useState<string>();
  return <Accordion.Root className="br-new" value={expanded?[item.id]:[]} onValueChange={value=>setExpanded(value.length>0)}><Accordion.Item className="br-row" value={item.id}>
    <span className="br-glyph"><Icon name="theme" size={14}/></span>
    <div className="br-main"><div className="br-title"><Mark kind="fresh"/><button className="br-open" onClick={onOpen}>{item.row.name}</button></div>
      <Accordion.Panel className="ab-accordion-panel"><div className="br-siglist">
        {item.row.signals.map((s:any)=>signalOpen===s.id?<SignalRow key={s.id} s={s} open onToggle={()=>setSignalOpen(undefined)} onOpen={host.onOpen}/>:<button key={s.id} className="br-siglist-row br-siglist-button" onClick={()=>{setSignalOpen(s.id);markRead("signal",s.id);}}><Icon name="signal" size={12}/><span>{s.gist} <span className="ap-muted">{s.source}</span></span></button>)}
      </div></Accordion.Panel>
    </div>
    <span className="br-acts"><Accordion.Header render={<span/>} className="br-count-head"><Accordion.Trigger className="br-count ap-num" title={expanded?"Fold":"Show the new signals"}>{item.row.signals.length} new<span className="br-caret" data-open={expanded?"":undefined}><Icon name="chevron" size={12}/></span></Accordion.Trigger></Accordion.Header><IconButton icon="check" label="Seen (A)" onClick={onSeen}/></span>
  </Accordion.Item></Accordion.Root>;
}
import { TooltipButton } from "./tooltip";
