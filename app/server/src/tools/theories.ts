import { z } from 'zod';
import { RetireReasonSchema, EvidenceStanceSchema } from '../../../shared/src/index.js';
import { define, idSchema, target, insert, row, result, update, enqueue, activeSignal, parse, type ToolContext, type Row } from './core.js';
import { actorString, AuthorityError } from './authority.js';
import { getObject } from './queries.js';
const theoryFields={claim:z.string().trim().min(1),body:z.string().default(''),horizon:z.number().int().min(1900).max(2500).nullable().optional(),tripwire:z.string().default(''),themes:z.array(z.string()).default([]),follows:z.array(z.string()).default([])};
export function versionTheory(ctx:ToolContext,id:string):void {
 const t=row(ctx,'theory',id);insert(ctx,'theory_versions',{theory_id:id,claim:t.claim,body:t.body,tripwire:t.tripwire,horizon:t.horizon,at:ctx.now,actor:actorString(ctx.actor)});
}
export function editTheory(ctx:ToolContext,id:string,patch:Row):Row {
 const t=target(ctx,'theory',id);
 const fields:Row={};for(const key of ['claim','body','horizon','tripwire'])if(patch[key]!==undefined)fields[key]=patch[key];
 if(fields.tripwire!==undefined&&fields.tripwire!==t.tripwire)fields.tripwire_version=t.tripwire_version+1;
 update(ctx,'theories',id,fields);versionTheory(ctx,id);
 return result(ctx,'theory',getObject(ctx.db,'theory',id,ctx.ownerId)!);
}
export function appendStance(ctx:ToolContext,id:string,confidence:number,note='',cause='set',suggestionId?:string):Row {
 if(ctx.actor.kind!=='person')throw new Error('Confidence requires a person');
 const theory=row(ctx,'theory',id);if(theory.status!=='held')throw new Error('Accept a draft before setting confidence');
 return insert(ctx,'stances',{person_id:ctx.actor.id??ctx.actor.personId,theory_id:id,confidence,note,cause,suggestion_id:suggestionId,at:ctx.now});
}
function createTheory(ctx:ToolContext,i:Row,draft=false):Row {
 const theory=insert(ctx,'theories',{claim:i.claim,body:i.body,status:draft?'draft':'held',authorship:draft?'agent':'mine',horizon:i.horizon??null,tripwire:i.tripwire??'',tripwire_version:i.tripwire?1:0});
 for(const themeId of i.themes){row(ctx,'theme',themeId);insert(ctx,'theory_themes',{theory_id:theory.id,theme_id:themeId},true);}
 for(const fromId of i.follows){row(ctx,'theory',fromId);insert(ctx,'follows',{theory_id:theory.id,from_id:fromId},true);}
 versionTheory(ctx,theory.id);if(i.confidence!=null)appendStance(ctx,theory.id,i.confidence,i.note??'');
 return result(ctx,'theory',getObject(ctx.db,'theory',theory.id,ctx.ownerId)!);
}
const link=z.object({theoryId:z.string(),signalId:z.string(),stance:EvidenceStanceSchema,note:z.string().default('')});
function personDecidedEvidence(ctx:ToolContext,theoryId:string,signalId:string):boolean {
 const events=ctx.db.prepare("SELECT tool,before_json,after_json FROM events WHERE owner_id=? AND actor LIKE 'person:%' AND ((object_kind='theory' AND object_id=? AND tool IN ('linkEvidence','unlinkEvidence')) OR tool='decideSuggestion') ORDER BY rowid DESC").all(ctx.ownerId,theoryId) as Row[];
 return events.some(event=>{
  const before=parse<Row>(event.before_json,{}),after=parse<Row>(event.after_json,{});
  if(event.tool==='decideSuggestion'){
   const payload=after.payload??parse<Row>(after.payload_json,{});
   return after.kind==='evidence'&&(after.target_id??after.targetId)===theoryId&&(payload.signal_id??payload.signalId)===signalId;
  }
  if(before.evidenceDecision)return before.evidenceDecision.theoryId===theoryId&&before.evidenceDecision.signalId===signalId;
  // Legacy events omitted input identity. Protect any pair that their stored result could have decided.
  const linked=(after.evidence??[]).some((edge:Row)=>(edge.signal_id??edge.signalId)===signalId);
  return event.tool==='linkEvidence'?linked:!linked;
 });
}
function assertMayChangeEvidence(ctx:ToolContext,theoryId:string,signalId:string,existing?:Row):void {
 if(ctx.actor.kind==='person')return;
 if(existing?.created_by?.startsWith('person:')||existing?.updated_by?.startsWith('person:')||personDecidedEvidence(ctx,theoryId,signalId)){
  throw new AuthorityError('A person decided this evidence pair; propose a change');
 }
 if(existing&&(existing.run_id!==ctx.actor.runId||existing.created_by!==actorString(ctx.actor)||existing.updated_by!==actorString(ctx.actor))){
  throw new AuthorityError('Another run owns this evidence pair; propose a change');
 }
}
export function linkEvidence(ctx:ToolContext,i:Row):Row {
 const theory=target(ctx,'theory',i.theoryId);activeSignal(ctx,i.signalId);
 const existing=ctx.db.prepare('SELECT * FROM evidence WHERE signal_id=? AND theory_id=?').get(i.signalId,i.theoryId) as Row|undefined;
 const note=i.note??'';
 if(ctx.actor.kind==='agent'&&existing&&existing.stance===i.stance&&existing.note===note){
  // Replaying the same relationship must not transfer ownership to this attempt.
  ctx.noEvent=true;return result(ctx,'theory',getObject(ctx.db,'theory',i.theoryId,ctx.ownerId)!);
 }
 assertMayChangeEvidence(ctx,i.theoryId,i.signalId,existing);
 ctx.before={...theory,evidenceDecision:{theoryId:i.theoryId,signalId:i.signalId,operation:'link',before:existing??null}};
 if(existing)update(ctx,'evidence',existing.id,{stance:i.stance,note});
 else insert(ctx,'evidence',{signal_id:i.signalId,theory_id:i.theoryId,stance:i.stance,note});
 return result(ctx,'theory',getObject(ctx.db,'theory',i.theoryId,ctx.ownerId)!);
}
function unlinkEvidence(ctx:ToolContext,i:Row):Row {
 const theory=target(ctx,'theory',i.theoryId);
 const existing=ctx.db.prepare('SELECT * FROM evidence WHERE signal_id=? AND theory_id=? AND owner_id=?').get(i.signalId,i.theoryId,ctx.ownerId) as Row|undefined;
 if(ctx.actor.kind==='agent'&&!existing){ctx.noEvent=true;return result(ctx,'theory',getObject(ctx.db,'theory',i.theoryId,ctx.ownerId)!);}
 assertMayChangeEvidence(ctx,i.theoryId,i.signalId,existing);
 ctx.before={...theory,evidenceDecision:{theoryId:i.theoryId,signalId:i.signalId,operation:'unlink',before:existing??null}};
 ctx.db.prepare('DELETE FROM evidence WHERE theory_id=? AND signal_id=? AND owner_id=?').run(i.theoryId,i.signalId,ctx.ownerId);
 return result(ctx,'theory',getObject(ctx.db,'theory',i.theoryId,ctx.ownerId)!);
}
export const theoryTools={
 writeTheory:define(z.object({...theoryFields,confidence:z.number().int().min(1).max(5).optional(),note:z.string().optional()}),'person',(ctx,i)=>createTheory(ctx,i)),
 createDraftTheory:define(z.object({...theoryFields,dumpId:z.string().optional(),key:z.string().optional()}),'agent',(ctx,i)=>{ctx.dumpId=i.dumpId??ctx.dumpId;return createTheory(ctx,i,true);},{key:i=>i.key??i.claim.trim().toLowerCase()}),
 editTheory:define(idSchema.extend({claim:z.string().trim().min(1).optional(),body:z.string().optional(),horizon:theoryFields.horizon,tripwire:z.string().optional()}),'person',(ctx,i)=>editTheory(ctx,i.id,i)),
 editDraftTheory:define(idSchema.extend({claim:z.string().trim().min(1).optional(),body:z.string().optional(),horizon:theoryFields.horizon,tripwire:z.string().optional()}),'agent',(ctx,i)=>editTheory(ctx,i.id,i)),
 setConfidence:define(idSchema.extend({confidence:z.number().int().min(1).max(5),note:z.string().default('')}),'person',(ctx,i)=>{target(ctx,'theory',i.id);appendStance(ctx,i.id,i.confidence,i.note);return result(ctx,'theory',getObject(ctx.db,'theory',i.id,ctx.ownerId)!);}),
 setHorizon:define(idSchema.extend({horizon:theoryFields.horizon}),'person',(ctx,i)=>editTheory(ctx,i.id,{horizon:i.horizon})),
 setTripwire:define(idSchema.extend({tripwire:z.string()}),'person',(ctx,i)=>{const t=editTheory(ctx,i.id,{tripwire:i.tripwire});if(i.tripwire)enqueue(ctx,'tripwire',{theoryId:i.id,tripwireVersion:t.tripwire_version},`tripwire:theory:${i.id}:${t.tripwire_version}`);return t;}),
 retireTheory:define(idSchema.extend({reason:RetireReasonSchema}),'person',(ctx,i)=>{target(ctx,'theory',i.id);update(ctx,'theories',i.id,{status:'retired',retire_reason:i.reason,seen_at:ctx.now});return result(ctx,'theory',getObject(ctx.db,'theory',i.id,ctx.ownerId)!);}),
 linkEvidence:define(link,'both',linkEvidence),
 unlinkEvidence:define(z.object({theoryId:z.string(),signalId:z.string()}),'both',unlinkEvidence),
 linkRivals:define(z.object({theoryId:z.string(),rivalId:z.string()}),'both',(ctx,i)=>{target(ctx,'theory',i.theoryId);row(ctx,'theory',i.rivalId);if(i.theoryId===i.rivalId)throw new Error('A theory cannot rival itself');const [a,b]=[i.theoryId,i.rivalId].sort();insert(ctx,'rivals',{a_id:a,b_id:b},true);return result(ctx,'theory',getObject(ctx.db,'theory',i.theoryId,ctx.ownerId)!);}),
 linkFollows:define(z.object({theoryId:z.string(),fromId:z.string()}),'both',(ctx,i)=>{target(ctx,'theory',i.theoryId);row(ctx,'theory',i.fromId);if(i.theoryId===i.fromId)throw new Error('A theory cannot follow itself');
  const cycle=ctx.db.prepare('WITH RECURSIVE chain(id) AS (SELECT from_id FROM follows WHERE theory_id=? UNION SELECT f.from_id FROM follows f JOIN chain c ON f.theory_id=c.id) SELECT 1 FROM chain WHERE id=? LIMIT 1').get(i.fromId,i.theoryId);if(cycle)throw new Error('Follows links cannot form a cycle');
  insert(ctx,'follows',{theory_id:i.theoryId,from_id:i.fromId},true);return result(ctx,'theory',getObject(ctx.db,'theory',i.theoryId,ctx.ownerId)!);}),
 linkTheoryTheme:define(z.object({theoryId:z.string(),themeId:z.string()}),'both',(ctx,i)=>{target(ctx,'theory',i.theoryId);row(ctx,'theme',i.themeId);insert(ctx,'theory_themes',{theory_id:i.theoryId,theme_id:i.themeId},true);return result(ctx,'theory',getObject(ctx.db,'theory',i.theoryId,ctx.ownerId)!);}),
};
