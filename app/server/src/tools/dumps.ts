import { z } from 'zod';
import type { Database } from '../db/index.js';
import { CaptureDumpSchema } from '../../../shared/src/index.js';
import { define, idSchema, insert, row, target, update, result, normaliseUrl, enqueue, parse, type Row, type ToolContext } from './core.js';
import { actorString } from './authority.js';
import { getDump } from './queries.js';
import { snapshotSignal, clearSignalRelations, type SignalSnapshot } from './merges.js';
export function previewDelete(ctx:ToolContext,id:string):Row {
 row(ctx,'dump',id);
 const ids=(ctx.db.prepare('SELECT signal_id FROM signal_origins WHERE dump_id=? AND owner_id=? AND signal_id IN (SELECT signal_id FROM signal_origins GROUP BY signal_id HAVING COUNT(*)=1)').all(id,ctx.ownerId) as Row[]).map(r=>r.signal_id);
 let evidence=0;for(const signalId of ids)evidence+=(ctx.db.prepare('SELECT COUNT(*) n FROM evidence WHERE signal_id=?').get(signalId) as Row).n;
 return {id,signals:ids.length,evidence,signalCount:ids.length,evidenceCount:evidence,signalIds:ids};
}
function capture(ctx:ToolContext,i:Row):Row {
 ctx.dumpId=undefined;
 if(i.idempotencyKey){const prior=ctx.db.prepare('SELECT id FROM dumps WHERE idempotency_key=? AND owner_id=?').get(i.idempotencyKey,ctx.ownerId) as Row|undefined;if(prior){ctx.noEvent=true;return getDump(ctx.db,prior.id,ctx.ownerId)!;}}
 // AMBIGUITY: text and note are separate capture fields, but the schema has one verbatim text field; join both with one newline when both exist.
 const text=[i.text,i.note].filter((v:string|undefined)=>v!==undefined&&v!=='').join('\n');
 const dump=insert(ctx,'dumps',{text,captured_at:ctx.now,captured_from:i.from,context_json:i.context?JSON.stringify(i.context):null,is_ask:text.includes('?')?1:0,status:'received',idempotency_key:i.idempotencyKey});ctx.dumpId=dump.id;
 const attachments:Row[]=[...i.urls.map((url:string)=>({kind:'link',url})),...i.attachments];
 for(const media of i.media){const m=insert(ctx,'media',media);attachments.push({kind:media.mime.startsWith('audio/')?'audio':media.mime.startsWith('image/')?'image':'file',mediaId:m.id});}
 for(const [position,attachment] of attachments.entries()){
  let mediaId=attachment.mediaId;
  if(attachment.media||attachment.path){const media=attachment.media??{id:attachment.id,path:attachment.path,mime:attachment.mime,bytes:attachment.bytes,sha256:attachment.sha256};if(!media.path||!media.mime||media.bytes==null||!media.sha256)throw new Error('A media attachment requires path, mime, bytes and sha256');mediaId=insert(ctx,'media',media).id;}
  if(mediaId&&!ctx.db.prepare('SELECT 1 FROM media WHERE id=? AND owner_id=?').get(mediaId,ctx.ownerId))throw new Error('Media not found');
  if(attachment.kind==='link'&&!attachment.url)throw new Error('Link attachment requires URL');
  if(attachment.kind!=='link'&&!mediaId)throw new Error('File attachment requires media');
  insert(ctx,'dump_attachments',{dump_id:dump.id,kind:attachment.kind,url:attachment.url,url_normalised:attachment.url?normaliseUrl(attachment.url):null,title:attachment.title,media_id:mediaId,position});
 }
 const audio=attachments.some(a=>a.kind==='audio');enqueue(ctx,audio?'transcribe':'process_dump',{dumpId:dump.id},`${audio?'transcribe':'process_dump'}:${dump.id}`);
 return result(ctx,'dump',getDump(ctx.db,dump.id,ctx.ownerId)!);
}
function deletionRecord(db:Database,dumpId:string,ownerId:string):Row|undefined {
 return db.prepare("SELECT rowid event_id,before_json FROM events WHERE tool='deleteDump' AND object_id=? AND owner_id=? ORDER BY rowid DESC LIMIT 1").get(dumpId,ownerId) as Row|undefined;
}
function isLiveDump(db:Database,id:string):boolean {
 return !!db.prepare('SELECT 1 FROM dumps WHERE id=? AND deleted_at IS NULL').get(id);
}
function restoreDestination(ctx:ToolContext,id:string):{signal:Row;lineage:string[]} {
 const lineage:string[]=[];
 while(true){
  if(lineage.includes(id))throw new Error('Cannot restore through an invalid signal merge chain');
  lineage.push(id);
  const signal=ctx.db.prepare('SELECT * FROM signals WHERE id=? AND owner_id=?').get(id,ctx.ownerId) as Row|undefined;
  if(!signal)throw new Error('Cannot restore: a signal in the merge chain was permanently deleted');
  if(!signal.merged_into_id)return {signal,lineage};
  id=signal.merged_into_id;
 }
}
/** Replaying a bin snapshot is additive: current edits and relationships win. */
function composeBinnedSignal(ctx:ToolContext,snapshot:SignalSnapshot,eventId:number):void {
 const {signal:current,lineage}=restoreDestination(ctx,snapshot.signal.id);
 const id=current.id;
 // An absorbed snapshot contributes relationships, never its old prose or merge state.
 if(id===snapshot.signal.id&&current.deleted_by_dump_id){
  const laterEdit=ctx.db.prepare("SELECT 1 FROM events WHERE rowid>? AND object_kind='signal' AND object_id=? AND actor LIKE 'person:%' LIMIT 1").get(eventId,id);
  if(!laterEdit){
   const restored={...snapshot.signal};
   if(restored.embedding?.type==='Buffer')restored.embedding=Buffer.from(restored.embedding.data);
   const keys=Object.keys(restored).filter(key=>key!=='id');
   ctx.db.prepare(`UPDATE signals SET ${keys.map(key=>`${key}=?`).join(',')} WHERE id=?`).run(...keys.map(key=>restored[key]),id);
  }
 }
 const unfilings=ctx.db.prepare(`SELECT after_json FROM events WHERE rowid>? AND tool='unfileSignal' AND object_id IN (${lineage.map(()=>'?').join(',')}) ORDER BY rowid DESC`).all(eventId,...lineage) as Row[];
 for(const source of snapshot.sources)insert(ctx,'signal_sources',{...source,signal_id:id},true);
 for(const origin of snapshot.origins)if(isLiveDump(ctx.db,origin.dump_id))insert(ctx,'signal_origins',{...origin,signal_id:id},true);
 for(const theme of snapshot.themes){
  if(unfilings.some(event=>!parse<Row>(event.after_json,{}).themes?.includes(theme.theme_id)))continue;
  insert(ctx,'signal_themes',{...theme,signal_id:id},true);
 }
 for(const evidence of snapshot.evidence){
  const unlinks=ctx.db.prepare("SELECT after_json FROM events WHERE rowid>? AND tool='unlinkEvidence' AND object_id=? ORDER BY rowid DESC").all(eventId,evidence.theory_id) as Row[];
  if(unlinks.some(event=>!(parse<Row>(event.after_json,{}).evidence??[]).some((e:Row)=>lineage.includes(e.signal_id??e.signalId))))continue;
  insert(ctx,'evidence',{...evidence,signal_id:id},true);
 }
 for(const mention of snapshot.mentions)if(isLiveDump(ctx.db,mention.dump_id))insert(ctx,'mentions',{...mention,object_id:id},true);
}
export const dumpTools={
 captureDump:define(CaptureDumpSchema,'person',capture),
 previewDeleteDump:define(idSchema,'person',(ctx,i)=>previewDelete(ctx,i.id),{read:true}),
 deleteDump:define(idSchema,'person',(ctx,i)=>{
  const dump=target(ctx,'dump',i.id);ctx.dumpId=i.id;if(dump.deleted_at){ctx.noEvent=true;return getDump(ctx.db,i.id,ctx.ownerId)!;}
  const preview=previewDelete(ctx,i.id);const removed=(preview.signalIds as string[]).map(id=>snapshotSignal(ctx.db,id));
  const detached=ctx.db.prepare('SELECT * FROM signal_origins WHERE dump_id=? AND owner_id=?').all(i.id,ctx.ownerId) as Row[];
  const canceledJobs=(ctx.db.prepare("SELECT * FROM jobs WHERE status IN ('queued','running') AND owner_id=?").all(ctx.ownerId) as Row[]).filter(j=>parse<Row>(j.payload_json,{}).dumpId===i.id);
  ctx.before={dump,removed,detachedOrigins:detached,canceledJobs};
  for(const snapshot of removed){clearSignalRelations(ctx.db,snapshot.signal.id);update(ctx,'signals',snapshot.signal.id,{deleted_by_dump_id:i.id});}
  ctx.db.prepare('DELETE FROM signal_origins WHERE dump_id=? AND owner_id=?').run(i.id,ctx.ownerId);
  update(ctx,'dumps',i.id,{deleted_at:ctx.now,purge_after:new Date(Date.parse(ctx.now)+30*86400000).toISOString()});
  // Cancel outstanding work so deleting a dump cannot produce new signals while it is in the bin.
  for(const job of ctx.db.prepare("SELECT id,payload_json FROM jobs WHERE status IN ('queued','running') AND owner_id=?").all(ctx.ownerId) as Row[])if(parse<Row>(job.payload_json,{}).dumpId===i.id)ctx.db.prepare("UPDATE jobs SET status='failed',error='Dump is in the bin' WHERE id=?").run(job.id);
  const value=getDump(ctx.db,i.id,ctx.ownerId)!;result(ctx,'dump',value);return {...value,removedCounts:preview};
 }),
 restoreDump:define(idSchema,'person',(ctx,i)=>{
  const dump=target(ctx,'dump',i.id);ctx.dumpId=i.id;if(!dump.deleted_at){ctx.noEvent=true;return getDump(ctx.db,i.id,ctx.ownerId)!;}
  if(Date.parse(dump.purge_after)<=Date.parse(ctx.now))throw new Error('This dump has passed its 30-day restore period');
  const event=deletionRecord(ctx.db,i.id,ctx.ownerId);
  if(!event)throw new Error('Deletion snapshot is missing');const snapshot=parse<Row>(event.before_json,{});
  const affected=new Set<string>([...(snapshot.removed as SignalSnapshot[]).map(s=>s.signal.id),...(snapshot.detachedOrigins as Row[]).map(o=>o.signal_id)]);
  const destinations=new Map([...affected].map(id=>[id,restoreDestination(ctx,id).signal.id as string]));
  // Make this origin live before replaying snapshots. Another dump may still be in the bin.
  update(ctx,'dumps',i.id,{deleted_at:null,purge_after:null,status:snapshot.dump.status,error:snapshot.dump.error});
  for(const id of affected){
   const current=row(ctx,'signal',destinations.get(id)!);
   // The survivor may itself have entered the bin since the merge. Recover its
   // complete relationships before adding this returning origin's snapshot.
   if(current.deleted_by_dump_id){
    const other=deletionRecord(ctx.db,current.deleted_by_dump_id,ctx.ownerId);
    const removal=other&&parse<Row>(other.before_json,{}).removed?.find((s:SignalSnapshot)=>s.signal.id===current.id);
    if(!removal)throw new Error('Cannot restore: the merged signal deletion snapshot is missing');
    composeBinnedSignal(ctx,removal,other.event_id);
   }
   const removal=(snapshot.removed as SignalSnapshot[]).find(s=>s.signal.id===id);
   if(removal)composeBinnedSignal(ctx,removal,event.event_id);
  }
  for(const origin of snapshot.detachedOrigins as Row[])if(isLiveDump(ctx.db,origin.dump_id))insert(ctx,'signal_origins',{...origin,signal_id:destinations.get(origin.signal_id)!},true);
  for(const id of new Set(destinations.values())){
   const live=ctx.db.prepare('SELECT 1 FROM signal_origins o JOIN dumps d ON d.id=o.dump_id WHERE o.signal_id=? AND d.deleted_at IS NULL LIMIT 1').get(id);
   if(live)ctx.db.prepare('UPDATE signals SET deleted_by_dump_id=NULL WHERE id=?').run(id);
  }
  for(const job of snapshot.canceledJobs??[])ctx.db.prepare("UPDATE jobs SET status='queued',run_after=?,locked_at=NULL,error=NULL WHERE id=? AND error='Dump is in the bin'").run(ctx.now,job.id);
  update(ctx,'dumps',i.id,{deleted_at:null,purge_after:null,status:snapshot.dump.status,error:snapshot.dump.error});return result(ctx,'dump',getDump(ctx.db,i.id,ctx.ownerId)!);
 }),
 retryDump:define(idSchema,'person',(ctx,i)=>{
  const dump=target(ctx,'dump',i.id);if(dump.deleted_at)throw new Error('Restore the dump before retrying');
  const jobs=(ctx.db.prepare('SELECT * FROM jobs WHERE owner_id=? ORDER BY created_at,rowid').all(ctx.ownerId) as Row[]).filter(j=>parse<Row>(j.payload_json,{}).dumpId===i.id);
  const retryable=jobs.filter(job=>job.status==='failed'||(job.status==='queued'&&job.error));
  for(const job of retryable)ctx.db.prepare("UPDATE jobs SET status='queued',attempts=0,run_after=?,locked_at=NULL,error=NULL WHERE id=?").run(ctx.now,job.id);
  if(!jobs.length)enqueue(ctx,'process_dump',{dumpId:i.id},`process_dump:${i.id}`);
  const active=!jobs.length||retryable.length||jobs.some(job=>job.status==='queued'||job.status==='running');
  update(ctx,'dumps',i.id,{status:active?'processing':'done',error:null});
  ctx.dumpId=i.id;return result(ctx,'dump',getDump(ctx.db,i.id,ctx.ownerId)!);
 }),
};
/** System infrastructure writes still append actor-tagged events. */
export function updateDumpStatus(db:Database,input:{id:string;status:string;error?:string|null;actor?:string;runId?:string}):Row|null {
 return db.transaction(()=>{
  const before=db.prepare('SELECT * FROM dumps WHERE id=?').get(input.id) as Row|undefined;if(!before)return null;if(before.deleted_at)return before;
  const at=new Date().toISOString();const actor=input.actor??'system:jobs';
  db.prepare('UPDATE dumps SET status=?,error=?,updated_at=?,updated_by=? WHERE id=?').run(input.status,input.error??null,at,actor,input.id);
  const after=db.prepare('SELECT * FROM dumps WHERE id=?').get(input.id) as Row;
  const ctx:ToolContext={db,actor:{kind:'person',id:'maggie'},ownerId:before.owner_id,now:at,tool:'updateDumpStatus'};
  insert(ctx,'events',{at,actor,tool:'updateDumpStatus',object_kind:'dump',object_id:input.id,before_json:JSON.stringify(before),after_json:JSON.stringify(after),dump_id:input.id,run_id:input.runId??null});return after;
 })();
}
export function saveTranscript(db:Database,input:{dumpId:string;mediaId:string;text:string;provider:string;model:string;runId?:string}):void {
 db.transaction(()=>{
  const dump=db.prepare('SELECT * FROM dumps WHERE id=?').get(input.dumpId) as Row|undefined;if(!dump)throw new Error('Dump not found');
  const at=new Date().toISOString();const actor=input.runId?`agent:transcribe:${input.runId}`:'system:transcribe';
  const ctx:ToolContext={db,actor:{kind:'person',id:'maggie'},ownerId:dump.owner_id,now:at,tool:'saveTranscript'};
  const before=db.prepare('SELECT * FROM transcripts WHERE dump_id=? AND media_id=?').get(input.dumpId,input.mediaId);
  if(before)db.prepare('UPDATE transcripts SET text=?,provider=?,model=?,updated_at=?,updated_by=?,run_id=? WHERE dump_id=? AND media_id=?').run(input.text,input.provider,input.model,at,actor,input.runId??null,input.dumpId,input.mediaId);
  else insert(ctx,'transcripts',{dump_id:input.dumpId,media_id:input.mediaId,text:input.text,provider:input.provider,model:input.model,created_by:actor,updated_by:actor,run_id:input.runId??null});
  insert(ctx,'events',{at,actor,tool:'saveTranscript',object_kind:'dump',object_id:input.dumpId,before_json:JSON.stringify(before??null),after_json:JSON.stringify(input),dump_id:input.dumpId,run_id:input.runId??null});
 })();
}
export function purgeBin(db:Database,now=new Date().toISOString()):{dumps:number;media:string[];paths:string[]} {
 return db.transaction(()=>{
  const dumps=db.prepare('SELECT * FROM dumps WHERE deleted_at IS NOT NULL AND purge_after<=?').all(now) as Row[];const paths:string[]=[];
  for(const dump of dumps){
   const media=db.prepare('SELECT media_id FROM dump_attachments WHERE dump_id=? AND media_id IS NOT NULL').all(dump.id) as Row[];
   for(const table of ['transcripts','replies','dump_attachments','signal_origins','mentions'])db.prepare(`DELETE FROM ${table} WHERE dump_id=?`).run(dump.id);
   const removed=db.prepare('WITH RECURSIVE removed(id) AS (SELECT id FROM signals WHERE deleted_by_dump_id=? UNION SELECT s.id FROM signals s JOIN removed r ON s.merged_into_id=r.id) SELECT id FROM removed').all(dump.id) as Row[];
   for(const signal of removed){clearSignalRelations(db,signal.id);db.prepare('UPDATE signals SET merged_into_id=NULL WHERE id=?').run(signal.id);db.prepare('DELETE FROM merges WHERE survivor_id=? OR absorbed_id=?').run(signal.id,signal.id);}
   for(const signal of removed)db.prepare('DELETE FROM signals WHERE id=?').run(signal.id);
   const ctx:ToolContext={db,actor:{kind:'person',id:'maggie'},ownerId:dump.owner_id,now,tool:'purgeBin'};
   insert(ctx,'events',{at:now,actor:'system:purge_bin',tool:'purgeBin',object_kind:'dump',object_id:dump.id,before_json:JSON.stringify(dump),after_json:null,dump_id:dump.id});
   db.prepare('DELETE FROM dumps WHERE id=?').run(dump.id);
   for(const m of media){const used=db.prepare('SELECT 1 FROM dump_attachments WHERE media_id=? UNION SELECT 1 FROM prototype_media WHERE media_id=? LIMIT 1').get(m.media_id,m.media_id);if(!used){const row=db.prepare('SELECT path FROM media WHERE id=?').get(m.media_id) as Row|undefined;if(row)paths.push(row.path);db.prepare('DELETE FROM media WHERE id=?').run(m.media_id);}}
  }
  return {dumps:dumps.length,media:paths,paths};
 })();
}
