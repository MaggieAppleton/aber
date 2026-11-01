import type { Database } from '../db/index.js';
import { parse, type Row } from './core.js';
import { selectSignalPage, type SignalPageOptions } from './signals-page.js';
const collection:Record<string,string>={dump:'dumps',signal:'signals',theme:'themes',theory:'theories',prototype:'prototypes',suggestion:'suggestions',merge:'merges'};
const all=(db:Database,sql:string,...params:any[]):Row[]=>db.prepare(sql).all(...params) as Row[];
function dayLabel(value:string):string {
 const date=new Date(value);const today=new Date();const days=Math.round((Date.UTC(today.getFullYear(),today.getMonth(),today.getDate())-Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()))/86400000);
 if(days===0)return 'Today';if(days===1)return 'Yesterday';return date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
}
function alias(row:Row):Row {
 const out:Row={...row};for(const [key,value] of Object.entries(row))out[key.replace(/_([a-z])/g,(_,l)=>l.toUpperCase())]=value;
 return out;
}
function suggestion(db:Database,row:Row):Row {
 const payload=parse<Row>(row.payload_json,{});const signal=payload.signal_id?db.prepare('SELECT gist FROM signals WHERE id=?').get(payload.signal_id) as Row|undefined:undefined;
 return {...alias(row),payload,reason:row.reasoning,decision:row.status==='accepted'?'accepted':row.status==='discarded'?'dismissed':undefined,gist:signal?.gist,decisionDetails:parse(row.decision_json,null)};
}
export function getDump(db:Database,id:string,ownerId='maggie'):Row|null {
 const raw=db.prepare('SELECT * FROM dumps WHERE id=? AND owner_id=?').get(id,ownerId) as Row|undefined;if(!raw)return null;
 const attachments=all(db,'SELECT a.*,m.path,m.mime,m.bytes,m.sha256 FROM dump_attachments a LEFT JOIN media m ON m.id=a.media_id WHERE a.dump_id=? AND a.owner_id=? ORDER BY a.position,a.id',id,ownerId).map(alias);
 const signals=all(db,'SELECT s.* FROM signals s JOIN signal_origins o ON o.signal_id=s.id WHERE o.dump_id=? AND s.owner_id=? AND s.discarded_at IS NULL AND s.merged_into_id IS NULL AND s.deleted_by_dump_id IS NULL ORDER BY s.created_at,s.id',id,ownerId).map(alias);
 const drafts=all(db,"SELECT DISTINCT e.object_kind kind,e.object_id id FROM events e WHERE e.dump_id=? AND e.tool IN ('createDraftTheme','createDraftTheory','createDraftPrototype') AND e.owner_id=? ORDER BY e.at,e.id",id,ownerId);
 const replies=all(db,'SELECT * FROM replies WHERE dump_id=? AND owner_id=? ORDER BY created_at,id',id,ownerId).map(r=>({...alias(r),parts:parse(r.parts_json,[])}));
 const merges=all(db,'SELECT * FROM merges WHERE dump_id=? AND owner_id=? ORDER BY created_at,id',id,ownerId).map(r=>({...alias(r),snapshot:parse(r.snapshot_json,{})}));
 const transcripts=all(db,'SELECT * FROM transcripts WHERE dump_id=? AND owner_id=? ORDER BY created_at,media_id',id,ownerId).map(alias);
 const runs=all(db,'SELECT r.* FROM agent_runs r JOIN jobs j ON r.job_id=j.id WHERE j.owner_id=? ORDER BY r.started_at,r.id',ownerId).filter(r=>{const job=db.prepare('SELECT payload_json FROM jobs WHERE id=?').get(r.job_id) as Row|undefined;return parse<Row>(job?.payload_json,{}).dumpId===id;});
 const jobs=all(db,'SELECT * FROM jobs WHERE owner_id=? ORDER BY created_at,id',ownerId).filter(j=>parse<Row>(j.payload_json,{}).dumpId===id);
 const kind=attachments.some(a=>a.kind==='audio')||/^Voice note/.test(raw.text)?'voice':attachments.some(a=>a.kind==='link')?'link':'text';
 return {...alias(raw),context:parse(raw.context_json,[]),isAsk:!!raw.is_ask,day:dayLabel(raw.captured_at),time:new Date(raw.captured_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),first:raw.text.split('\n')[0]||attachments[0]?.title||'Voice note',kind,produced:[...signals.map(s=>s.id),...drafts.map(d=>d.id)],signals,drafts,attachments,transcripts,replies,merges,runs,jobs};
}
export function listDumps(db:Database,bin:boolean|number=false,ownerId='maggie'):Row[] {
 return all(db,`SELECT id FROM dumps WHERE owner_id=? AND deleted_at IS ${bin?'NOT ':''}NULL ORDER BY captured_at DESC,id DESC`,ownerId).map(r=>getDump(db,r.id,ownerId)!);
}
function signalObject(db:Database,raw:Row):Row {
 const id=raw.id;
 const sources:Row[]=all(db,'SELECT * FROM signal_sources WHERE signal_id=? ORDER BY position,id',id).map(s=>({...alias(s),ownObservation:!!s.own_observation}));
 const origins=all(db,'SELECT o.*,d.text,d.captured_at FROM signal_origins o JOIN dumps d ON d.id=o.dump_id WHERE o.signal_id=? ORDER BY d.captured_at,d.id',id).map(alias);
 const themes=all(db,'SELECT theme_id FROM signal_themes WHERE signal_id=? ORDER BY theme_id',id).map(t=>t.theme_id);
 const accepted=all(db,'SELECT * FROM evidence WHERE signal_id=? ORDER BY theory_id',id).map(e=>({...alias(e),theory:e.theory_id,suggested:false}));
 const pending=all(db,"SELECT * FROM suggestions WHERE kind='evidence' AND status='pending' AND owner_id=? ORDER BY created_at,id",raw.owner_id).filter(s=>parse<Row>(s.payload_json,{}).signal_id===id).map(s=>{const p=parse<Row>(s.payload_json,{});return {theory:s.target_id,stance:p.stance,note:p.note,suggested:true,suggestionId:s.id};});
 const source=sources[0]?.own_observation?'My observation':sources[0]?.url?new URL(sources[0].url).hostname.replace(/^www\./,''):sources[0]?.author||'My observation';
 const mergedFrom=all(db,'SELECT * FROM merges WHERE survivor_id=? AND undone_at IS NULL ORDER BY created_at,id',id).map(alias);
 return {...alias(raw),sources,source,origins,dumps:origins.map(o=>o.dump_id),dump:origins[0]?.dump_id??'',day:origins[0]?dayLabel(origins[0].captured_at):dayLabel(raw.created_at),themes,evidence:[...accepted,...pending],mergedFrom,mentionCount:(db.prepare("SELECT COUNT(*) n FROM mentions WHERE object_kind='signal' AND object_id=?").get(id) as Row).n,fetched:parse(raw.fetched_json,null),fresh:raw.seen_at===null};
}
function theoryObject(db:Database,raw:Row):Row {
 const stances:Row[]=all(db,'SELECT * FROM stances WHERE theory_id=? ORDER BY at,rowid',raw.id).map(s=>({...alias(s),level:s.confidence,date:new Date(s.at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),short:new Date(s.at).toLocaleDateString('en-GB',{month:'short',year:'2-digit'}),challenge:s.cause==='challenge_accepted'}));
 const evidence=all(db,'SELECT e.*,s.gist FROM evidence e JOIN signals s ON s.id=e.signal_id WHERE e.theory_id=? AND s.discarded_at IS NULL AND s.deleted_by_dump_id IS NULL ORDER BY e.signal_id',raw.id).map(alias);
 const suggestions=all(db,'SELECT * FROM suggestions WHERE target_id=? AND owner_id=? ORDER BY created_at,id',raw.id,raw.owner_id).map(s=>suggestion(db,s));
 const challenges=suggestions.filter(s=>s.kind==='challenge'&&s.payload.tripwire_version===raw.tripwire_version);
 const tripwireState=!raw.tripwire?'empty':challenges.some(s=>s.status==='pending')?'tripped':challenges.length?'resolved':'watching';
 const themes=all(db,'SELECT theme_id FROM theory_themes WHERE theory_id=? ORDER BY theme_id',raw.id).map(t=>t.theme_id);
 const follows=all(db,'SELECT from_id FROM follows WHERE theory_id=? ORDER BY from_id',raw.id).map(t=>t.from_id);
 const rivals=all(db,'SELECT a_id,b_id FROM rivals WHERE a_id=? OR b_id=? ORDER BY a_id,b_id',raw.id,raw.id).map(r=>r.a_id===raw.id?r.b_id:r.a_id);
 const tripwireHits=challenges.map(s=>{const signal=s.payload.signal_id?db.prepare('SELECT * FROM signals WHERE id=?').get(s.payload.signal_id) as Row|undefined:undefined;const view=signal?signalObject(db,signal):null;return {id:s.payload.signal_id??s.id,suggestionId:s.id,gist:signal?.gist??s.payload.gist??s.reasoning,source:view?.source??s.payload.source??'',day:view?.day??s.payload.day??'',why:s.payload.why??s.reasoning,status:s.status,decision:s.decision,...s.decisionDetails};});
 return {...alias(raw),draft:raw.status==='draft',authorship:raw.authorship,confidence:stances.at(-1)?.confidence??null,currentConfidence:stances.at(-1)?.confidence??null,history:stances.map(s=>s.confidence),stances,themes,follows,rivals,evidence,supports:evidence.filter(e=>e.stance==='supports').length,undermines:evidence.filter(e=>e.stance==='undermines').length,pending:suggestions.filter(s=>s.status==='pending').length,challenge:challenges.some(s=>s.status==='pending'),suggestions,tripwireState,tripwireHits,tripwireDecisions:Object.fromEntries(tripwireHits.filter(h=>h.decision).map(h=>[h.id,h.decision])),leadsTo:all(db,'SELECT theory_id FROM follows WHERE from_id=? ORDER BY theory_id',raw.id).map(t=>t.theory_id),prototypes:all(db,'SELECT prototype_id FROM prototype_theories WHERE theory_id=? ORDER BY prototype_id',raw.id).map(p=>p.prototype_id),versions:all(db,'SELECT * FROM theory_versions WHERE theory_id=? ORDER BY at,id',raw.id).map(alias),fresh:raw.seen_at===null};
}
export function getObject(db:Database,kind:string,id:string,ownerId='maggie'):Row|null {
 if(kind==='dump')return getDump(db,id,ownerId);
 const table=collection[kind];if(!table)return null;
 const raw=db.prepare(`SELECT * FROM ${table} WHERE id=? AND owner_id=?`).get(id,ownerId) as Row|undefined;if(!raw)return null;
 if(kind==='signal')return signalObject(db,raw);
 if(kind==='theory')return theoryObject(db,raw);
 if(kind==='suggestion')return suggestion(db,raw);
 if(kind==='theme'){
  const signals=all(db,'SELECT s.id,s.seen_at FROM signals s JOIN signal_themes st ON st.signal_id=s.id WHERE st.theme_id=? AND s.discarded_at IS NULL AND s.merged_into_id IS NULL AND s.deleted_by_dump_id IS NULL ORDER BY s.id',id);
  const theories=all(db,'SELECT t.id,t.status FROM theories t JOIN theory_themes tt ON tt.theory_id=t.id WHERE tt.theme_id=? AND t.discarded_at IS NULL AND t.merged_into_id IS NULL ORDER BY t.id',id);
  return {...alias(raw),draft:raw.status==='draft',signals:signals.length,signalIds:signals.map(s=>s.id),theories:theories.map(t=>t.id),fresh:signals.filter(s=>s.seen_at===null).length,open:!theories.some(t=>t.status==='held')};
 }
 if(kind==='prototype')return {...alias(raw),draft:!!raw.draft,links:parse(raw.links_json,[]),theories:all(db,'SELECT theory_id FROM prototype_theories WHERE prototype_id=? ORDER BY theory_id',id).map(t=>t.theory_id),media:all(db,'SELECT m.*,pm.position FROM prototype_media pm JOIN media m ON m.id=pm.media_id WHERE pm.prototype_id=? ORDER BY pm.position,m.id',id).map(alias)};
 return {...alias(raw),snapshot:parse(raw.snapshot_json,{})};
}
export function getWorld(db:Database,ownerId='maggie',options:{signalPage?:SignalPageOptions}={}):Row {
 const fetch=(kind:string,where='')=>all(db,`SELECT id FROM ${collection[kind]} WHERE owner_id=? ${where} ORDER BY created_at,id`,ownerId).map(r=>getObject(db,kind,r.id,ownerId)!);
 const page=options.signalPage?selectSignalPage(db,options.signalPage,ownerId):undefined;
 const signals=page?page.ids.map(id=>getObject(db,'signal',id,ownerId)!):fetch('signal','AND discarded_at IS NULL AND merged_into_id IS NULL AND deleted_by_dump_id IS NULL');
 return {...(page?{signalPage:page.signalPage}:{}),themes:fetch('theme','AND discarded_at IS NULL AND merged_into_id IS NULL'),theories:fetch('theory','AND discarded_at IS NULL AND merged_into_id IS NULL'),signals,dumps:[...listDumps(db,false,ownerId),...listDumps(db,true,ownerId)],prototypes:fetch('prototype','AND discarded_at IS NULL'),suggestions:fetch('suggestion'),merges:fetch('merge'),relationships:{signalThemes:all(db,'SELECT * FROM signal_themes WHERE owner_id=?',ownerId),theoryThemes:all(db,'SELECT * FROM theory_themes WHERE owner_id=?',ownerId),evidence:all(db,'SELECT * FROM evidence WHERE owner_id=?',ownerId),rivals:all(db,'SELECT * FROM rivals WHERE owner_id=?',ownerId),follows:all(db,'SELECT * FROM follows WHERE owner_id=?',ownerId),prototypeTheories:all(db,'SELECT * FROM prototype_theories WHERE owner_id=?',ownerId)},binCount:(db.prepare('SELECT COUNT(*) n FROM dumps WHERE owner_id=? AND deleted_at IS NOT NULL').get(ownerId) as Row).n};
}
