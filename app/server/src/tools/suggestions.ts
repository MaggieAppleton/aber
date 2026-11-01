import { z } from 'zod';
import { EvidenceStanceSchema } from '../../../shared/src/index.js';
import { define, insert, row, target, result, update, parse, activeSignal, type ToolContext, type Row } from './core.js';
import { getObject } from './queries.js';
import { linkEvidence, appendStance, versionTheory } from './theories.js';
const base={reasoning:z.string().default(''),dumpId:z.string().optional(),key:z.string().optional()};
function revisionWording(object:Row,payload:Row,overrides:Row={}):Row {
 const addition=overrides.bodyInsert??(overrides.body===undefined?payload.body_insert:undefined);
 const body=overrides.body??payload.body??object.body;
 return {
  claim:overrides.claim??payload.claim??object.claim,
  body:addition?[body,addition].filter(Boolean).join('\n\n'):body,
 };
}
function undoRevision(ctx:ToolContext,s:Row,object:Row,details:Row,payload:Row):void {
 const before=details.objectBefore;if(!before)return;
 const after=details.objectAfter??(s.target_kind==='theory'?revisionWording(before,payload):{name:payload.name??payload.claim??before.name});
 const fields=s.target_kind==='theory'?['claim','body']:['name'];
 const patch:Row={};
 for(const field of fields)if(before[field]!==after[field]&&object[field]===after[field])patch[field]=before[field];
 if(s.target_kind==='theory'&&after.authorship!==undefined&&before.authorship!==after.authorship&&object.authorship===after.authorship&&fields.every(field=>object[field]===after[field]))patch.authorship=before.authorship;
 if(Object.keys(patch).length){update(ctx,s.target_kind==='theory'?'theories':'themes',s.target_id,patch);if(s.target_kind==='theory')versionTheory(ctx,s.target_id);}
}
function laterEvidenceDecision(ctx:ToolContext,s:Row,payload:Row):boolean {
 const decision=ctx.db.prepare("SELECT rowid FROM events WHERE owner_id=? AND tool='decideSuggestion' AND object_id=? ORDER BY rowid DESC LIMIT 1").get(ctx.ownerId,s.id) as Row|undefined;
 const events=ctx.db.prepare("SELECT tool,object_id,before_json,after_json FROM events WHERE owner_id=? AND rowid>? AND tool IN ('linkEvidence','unlinkEvidence','decideSuggestion')").all(ctx.ownerId,decision?.rowid??0) as Row[];
 return events.some(event=>{
  if(event.tool==='decideSuggestion'){
   if(event.object_id===s.id)return false;
   const after=parse<Row>(event.after_json,{}),other=after.payload??parse<Row>(after.payload_json,{});
   return after.kind==='evidence'&&(after.target_id??after.targetId)===s.target_id&&(other.signal_id??other.signalId)===payload.signal_id;
  }
  const pair=parse<Row>(event.before_json,{}).evidenceDecision;
  return pair?pair.theoryId===s.target_id&&pair.signalId===payload.signal_id:event.object_id===s.target_id;
 });
}
function undoEvidence(ctx:ToolContext,s:Row,details:Row,payload:Row):void {
 const current=ctx.db.prepare('SELECT * FROM evidence WHERE signal_id=? AND theory_id=? AND owner_id=?').get(payload.signal_id,s.target_id,ctx.ownerId) as Row|undefined;
 const after=details.evidenceAfter;
 const matches=after?Object.keys(after).every(key=>current?.[key]===after[key]):current?.stance===payload.stance&&current?.note===(payload.note??'');
 if(!current||!matches||laterEvidenceDecision(ctx,s,payload))return;
 ctx.db.prepare('DELETE FROM evidence WHERE id=? AND owner_id=?').run(current.id,ctx.ownerId);
 if(details.evidenceBefore)insert(ctx,'evidence',details.evidenceBefore);
}
function propose(ctx:ToolContext,kind:string,targetKind:string,targetId:string,payload:Row,i:Row):Row {
 const object=row(ctx,targetKind,targetId);if(object.discarded_at||object.merged_into_id)throw new Error('Cannot propose to an inactive object');
 ctx.dumpId=i.dumpId??ctx.dumpId;
 if(ctx.dumpId)row(ctx,'dump',ctx.dumpId);
 const existing=(ctx.db.prepare("SELECT * FROM suggestions WHERE kind=? AND target_kind=? AND target_id=? AND status='pending' AND owner_id=?").all(kind,targetKind,targetId,ctx.ownerId) as Row[]).find(s=>s.payload_json===JSON.stringify(payload));
 if(existing){ctx.noEvent=true;return getObject(ctx.db,'suggestion',existing.id,ctx.ownerId)!;}
 const s=insert(ctx,'suggestions',{kind,target_kind:targetKind,target_id:targetId,payload_json:JSON.stringify(payload),reasoning:i.reasoning||i.why||'',status:'pending',dump_id:ctx.dumpId});
 return result(ctx,'suggestion',getObject(ctx.db,'suggestion',s.id,ctx.ownerId)!);
}
function mergeObjects(ctx:ToolContext,kind:string,survivorId:string,absorbedId:string):void {
 if(survivorId===absorbedId)throw new Error('Cannot merge an object into itself');
 row(ctx,kind,survivorId);row(ctx,kind,absorbedId);
 if(kind==='theme')for(const [table,column] of [['signal_themes','signal_id'],['theory_themes','theory_id']]){
  for(const r of ctx.db.prepare(`SELECT * FROM ${table} WHERE theme_id=?`).all(absorbedId) as Row[])insert(ctx,table,{...r,theme_id:survivorId},true);
  ctx.db.prepare(`DELETE FROM ${table} WHERE theme_id=?`).run(absorbedId);
 }
 else if(kind==='theory'){
  for(const [table,column] of [['theory_themes','theme_id'],['prototype_theories','prototype_id'],['evidence','signal_id']]){
   for(const r of ctx.db.prepare(`SELECT * FROM ${table} WHERE theory_id=?`).all(absorbedId) as Row[]){
    if(!ctx.db.prepare(`SELECT 1 FROM ${table} WHERE theory_id=? AND ${column}=?`).get(survivorId,r[column])){
     if(table==='evidence')update(ctx,table,r.id,{theory_id:survivorId});else insert(ctx,table,{...r,theory_id:survivorId},true);
    }
   }
   ctx.db.prepare(`DELETE FROM ${table} WHERE theory_id=?`).run(absorbedId);
  }
  for(const f of ctx.db.prepare('SELECT * FROM follows WHERE theory_id=? OR from_id=?').all(absorbedId,absorbedId) as Row[]){const theory=f.theory_id===absorbedId?survivorId:f.theory_id;const from=f.from_id===absorbedId?survivorId:f.from_id;if(theory!==from)insert(ctx,'follows',{theory_id:theory,from_id:from},true);}
  ctx.db.prepare('DELETE FROM follows WHERE theory_id=? OR from_id=?').run(absorbedId,absorbedId);
  for(const rival of ctx.db.prepare('SELECT * FROM rivals WHERE a_id=? OR b_id=?').all(absorbedId,absorbedId) as Row[]){const other=rival.a_id===absorbedId?rival.b_id:rival.a_id;if(other!==survivorId){const [a,b]=[survivorId,other].sort();insert(ctx,'rivals',{a_id:a,b_id:b},true);}}
  ctx.db.prepare('DELETE FROM rivals WHERE a_id=? OR b_id=?').run(absorbedId,absorbedId);
 }else throw new Error('Only themes and theories have merge suggestions');
 update(ctx,kind==='theory'?'theories':'themes',absorbedId,{merged_into_id:survivorId,status:'retired',retire_reason:'superseded'});
}
function decide(ctx:ToolContext,i:Row):Row {
 const s=target(ctx,'suggestion',i.id);const payload=parse<Row>(s.payload_json,{});const decision=i.decision;
 const object=row(ctx,s.target_kind,s.target_id);const details=parse<Row>(s.decision_json,{});
 if(decision==='undo'){
  if(s.status==='pending'){ctx.noEvent=true;return getObject(ctx.db,'suggestion',s.id,ctx.ownerId)!;}
  if(s.status==='accepted'){
   if(s.kind==='challenge'&&details.previousConfidence!=null)appendStance(ctx,s.target_id,details.previousConfidence,'Restored after undoing challenge','undo',s.id);
   else if(s.kind==='evidence'){
    undoEvidence(ctx,s,details,payload);
   }else if(s.kind==='revision'){
    undoRevision(ctx,s,object,details,payload);
   }else if(s.kind==='merge')throw new Error('Theme and theory merge decisions cannot be undone');
  }
  update(ctx,'suggestions',s.id,{status:'pending',decided_at:null,seen_at:null,decision_json:null});
 }else {
  const desired=decision==='discarded'?'discarded':'accepted';if(s.status===desired){ctx.noEvent=true;return getObject(ctx.db,'suggestion',s.id,ctx.ownerId)!;}if(s.status!=='pending')throw new Error('Undo the previous decision first');
  const record:Row={objectBefore:object};
  if(desired==='accepted'){
   if(s.kind==='challenge'){
    if(payload.tripwire_version!==object.tripwire_version)throw new Error('This challenge belongs to an older tripwire');
    const view=getObject(ctx.db,'theory',s.target_id,ctx.ownerId)!;if(view.confidence==null)throw new Error('Set confidence before accepting a challenge');
    const signal=row(ctx,'signal',payload.signal_id);record.previousConfidence=view.confidence;record.loweredTo=Math.max(1,view.confidence-1);
    const stance=appendStance(ctx,s.target_id,record.loweredTo,`Lowered: ${signal.gist}`,'challenge_accepted',s.id);record.stanceId=stance.id;
   }else if(s.kind==='evidence'){
    record.evidenceBefore=ctx.db.prepare('SELECT * FROM evidence WHERE signal_id=? AND theory_id=?').get(payload.signal_id,s.target_id)??null;
    linkEvidence(ctx,{theoryId:s.target_id,signalId:payload.signal_id,stance:payload.stance,note:i.note??payload.note??''});
    record.evidenceAfter=ctx.db.prepare('SELECT * FROM evidence WHERE signal_id=? AND theory_id=? AND owner_id=?').get(payload.signal_id,s.target_id,ctx.ownerId);
   }else if(s.kind==='revision'){
    if(s.target_kind==='theory'){
     const proposed=revisionWording(object,payload),patch=revisionWording(object,payload,i);
     if(patch.claim!==proposed.claim||patch.body!==proposed.body)patch.authorship='rephrased';
     update(ctx,'theories',s.target_id,patch);versionTheory(ctx,s.target_id);
    }else update(ctx,'themes',s.target_id,{name:i.name??payload.name??payload.claim??object.name});
    record.objectAfter=row(ctx,s.target_kind,s.target_id);
   }else if(s.kind==='merge')mergeObjects(ctx,s.target_kind,s.target_id,payload.other_id);
  }
  update(ctx,'suggestions',s.id,{status:desired,decided_at:ctx.now,seen_at:ctx.now,decision_json:JSON.stringify(record)});
 }
 ctx.before=s;return result(ctx,'suggestion',getObject(ctx.db,'suggestion',s.id,ctx.ownerId)!);
}
export const suggestionTools={
 proposeEvidence:define(z.object({...base,theoryId:z.string(),signalId:z.string(),stance:EvidenceStanceSchema,note:z.string().default('')}),'agent',(ctx,i)=>{activeSignal(ctx,i.signalId);return propose(ctx,'evidence','theory',i.theoryId,{signal_id:i.signalId,stance:i.stance,note:i.note},i);},{key:i=>i.key??`${i.theoryId}:${i.signalId}:${i.stance}`}),
 proposeChallenge:define(z.object({...base,theoryId:z.string(),signalId:z.string(),why:z.string().min(1),tripwireVersion:z.number().int().nonnegative().optional()}),'agent',(ctx,i)=>{activeSignal(ctx,i.signalId);const t=row(ctx,'theory',i.theoryId);if(!t.tripwire)throw new Error('Theory has no tripwire');const version=i.tripwireVersion??t.tripwire_version;if(version!==t.tripwire_version)throw new Error('Tripwire version changed');return propose(ctx,'challenge','theory',i.theoryId,{signal_id:i.signalId,why:i.why,tripwire_version:version},i);},{key:i=>i.key??`${i.theoryId}:${i.signalId}:${i.tripwireVersion??'current'}`}),
 proposeRevision:define(z.object({...base,targetKind:z.enum(['theme','theory']).default('theory'),targetId:z.string().optional(),theoryId:z.string().optional(),themeId:z.string().optional(),claim:z.string().min(1).optional(),name:z.string().min(1).optional(),body:z.string().optional(),bodyInsert:z.string().optional(),payload:z.record(z.string(),z.unknown()).optional()}).refine(i=>i.targetId||i.theoryId||i.themeId,'A target is required'),'agent',(ctx,i)=>{const p={...i.payload,...Object.fromEntries(Object.entries({claim:i.claim,name:i.name,body:i.body,body_insert:i.bodyInsert}).filter(([,v])=>v!==undefined))};if(!Object.keys(p).length)throw new Error('A revision must change wording');return propose(ctx,'revision',i.themeId?'theme':i.targetKind,i.targetId??i.theoryId??i.themeId,p,i);},{key:i=>i.key??JSON.stringify(i)}),
 proposeMerge:define(z.object({...base,targetKind:z.enum(['theme','theory']),targetId:z.string(),otherId:z.string()}),'agent',(ctx,i)=>{row(ctx,i.targetKind,i.otherId);return propose(ctx,'merge',i.targetKind,i.targetId,{other_id:i.otherId},i);},{key:i=>i.key??`${i.targetKind}:${i.targetId}:${i.otherId}`}),
 decideSuggestion:define(z.object({id:z.string(),decision:z.enum(['accepted','discarded','accept','discard','dismiss','rephrase','undo']).transform(v=>v==='accept'||v==='rephrase'?'accepted':v==='discard'||v==='dismiss'?'discarded':v),claim:z.string().min(1).optional(),name:z.string().min(1).optional(),body:z.string().optional(),bodyInsert:z.string().optional(),note:z.string().optional()}),'person',decide),
};
