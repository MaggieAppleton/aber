import { z } from 'zod';
import { ulid } from 'ulid';
import type { Database } from '../db/index.js';
import { actorString } from './authority.js';
import { define, idSchema, insert, row, result, parse, update, type Row, type ToolContext } from './core.js';
export type SignalSnapshot={signal:Row;sources:Row[];origins:Row[];themes:Row[];evidence:Row[];mentions:Row[]};
export function snapshotSignal(db:Database,id:string):SignalSnapshot {
 const rows=(table:string,column='signal_id')=>db.prepare(`SELECT * FROM ${table} WHERE ${column}=? ORDER BY rowid`).all(id) as Row[];
 return {signal:db.prepare('SELECT * FROM signals WHERE id=?').get(id) as Row,sources:rows('signal_sources'),origins:rows('signal_origins'),themes:rows('signal_themes'),evidence:rows('evidence'),mentions:db.prepare("SELECT * FROM mentions WHERE object_kind='signal' AND object_id=? ORDER BY rowid").all(id) as Row[]};
}
function rawInsert(db:Database,table:string,value:Row):void {
 const keys=Object.keys(value);db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...Object.values(value));
}
export function clearSignalRelations(db:Database,id:string):void {
 for(const table of ['signal_sources','signal_origins','signal_themes','evidence'])db.prepare(`DELETE FROM ${table} WHERE signal_id=?`).run(id);
 db.prepare("DELETE FROM mentions WHERE object_kind='signal' AND object_id=?").run(id);
}
export function restoreSignalSnapshot(db:Database,snapshot:SignalSnapshot):void {
 const value={...snapshot.signal};
 // Node serialises BLOBs as {type:'Buffer',data:[...]}; SQLite requires a real Buffer when replaying a snapshot.
 if(value.embedding?.type==='Buffer'&&Array.isArray(value.embedding.data))value.embedding=Buffer.from(value.embedding.data);
 clearSignalRelations(db,value.id);
 const keys=Object.keys(value).filter(k=>k!=='id');
 if(db.prepare('SELECT 1 FROM signals WHERE id=?').get(value.id))db.prepare(`UPDATE signals SET ${keys.map(k=>`${k}=?`).join(',')} WHERE id=?`).run(...keys.map(k=>value[k]),value.id);
 else rawInsert(db,'signals',value);
 for(const [key,table] of [['sources','signal_sources'],['origins','signal_origins'],['themes','signal_themes'],['evidence','evidence'],['mentions','mentions']] as const)for(const r of snapshot[key])rawInsert(db,table,r);
}
/** Recovery helper. Caller must preflight later writes and run in its recovery transaction. */
export function restoreSignalMerge(db:Database,id:string,actor='system:recovery',at=new Date().toISOString()):Row {
 const merge=db.prepare('SELECT * FROM merges WHERE id=?').get(id) as Row|undefined;if(!merge)throw new Error('Merge not found');
 if(merge.undone_at)return merge;
 const snapshots=parse<{survivor:SignalSnapshot;absorbed:SignalSnapshot}>(merge.snapshot_json,{} as any);
 // Clear both sets before inserting: source/evidence IDs may currently live on the other signal.
 clearSignalRelations(db,merge.survivor_id);clearSignalRelations(db,merge.absorbed_id);
 restoreSignalSnapshot(db,snapshots.survivor);restoreSignalSnapshot(db,snapshots.absorbed);
 db.prepare('UPDATE merges SET undone_at=?,undone_by=?,updated_at=?,updated_by=? WHERE id=?').run(at,actor,at,actor,id);
 return db.prepare('SELECT * FROM merges WHERE id=?').get(id) as Row;
}
const relationTables = {sources:'signal_sources',origins:'signal_origins',themes:'signal_themes',evidence:'evidence',mentions:'mentions'} as const;
type Relation = keyof typeof relationTables;
const relationColumns:Record<Relation,string>={sources:'id',origins:'dump_id',themes:'theme_id',evidence:'theory_id',mentions:'id'};
const auditFields=new Set(['updated_at','updated_by','run_id']);
function equal(a:unknown,b:unknown):boolean {return JSON.stringify(a)===JSON.stringify(b);}
function contentChanged(a:Row,b:Row,ignore:string[]=[]):boolean {
 return [...new Set([...Object.keys(a),...Object.keys(b)])].some(key=>!auditFields.has(key)&&!ignore.includes(key)&&!equal(a[key],b[key]));
}
function expectedMerged(before:{survivor:SignalSnapshot;absorbed:SignalSnapshot},merge:Row):{survivor:SignalSnapshot;absorbed:SignalSnapshot} {
 const [a,b]=[before.survivor,before.absorbed];
 const merged:SignalSnapshot={signal:{...a.signal,note:[a.signal.note,b.signal.note].filter(Boolean).join('\n\n')},sources:[],origins:[],themes:[],evidence:[],mentions:[]};
 for(const kind of Object.keys(relationTables) as Relation[]){
  const column=relationColumns[kind];const existing=new Set(a[kind].map(row=>row[column]));
  merged[kind]=[...a[kind],...b[kind].filter(row=>!existing.has(row[column])).map(row=>({...row,...(kind==='mentions'?{object_id:a.signal.id}:{signal_id:a.signal.id})}))];
 }
 const offset=Math.max(-1,...a.sources.map(source=>source.position))+1;
 merged.sources=merged.sources.map(source=>b.sources.some(original=>original.id===source.id)?{...source,position:source.position+offset}:source);
 return {survivor:merged,absorbed:{signal:{...b.signal,merged_into_id:a.signal.id},sources:[],origins:[],themes:[],evidence:[],mentions:[]}};
}
function preserveRelation(db:Database,kind:Relation,signalId:string,value:Row):void {
 const table=relationTables[kind];const column=relationColumns[kind];
 const ownerColumn=kind==='mentions'?'object_id':'signal_id';
 const existing=db.prepare(`SELECT * FROM ${table} WHERE ${ownerColumn}=? AND ${column}=?`).get(signalId,value[column]) as Row|undefined;
 const data={...value,[ownerColumn]:signalId};
 if(existing?.id)data.id=existing.id;
 else if(data.id&&db.prepare(`SELECT 1 FROM ${table} WHERE id=?`).get(data.id))data.id=ulid();
 if(existing){
  const keys=Object.keys(data).filter(key=>key!=='id');
  db.prepare(`UPDATE ${table} SET ${keys.map(key=>`${key}=?`).join(',')} WHERE ${ownerColumn}=? AND ${column}=?`).run(...keys.map(key=>data[key]),signalId,existing[column]);
 }else rawInsert(db,table,data);
}
/** User undo inverts only the merge; recovery continues to use the strict snapshot restorer above. */
function undoSignalMerge(ctx:ToolContext,id:string):Row {
 const merge=row(ctx,'merge',id);if(merge.undone_at){ctx.noEvent=true;return merge;}
 const before=parse<{survivor:SignalSnapshot;absorbed:SignalSnapshot;applied?:{survivor:SignalSnapshot;absorbed:SignalSnapshot}}>(merge.snapshot_json,{} as any);
 const ids=[merge.survivor_id,merge.absorbed_id];
 if(ids.some(signalId=>row(ctx,'signal',signalId).discarded_at))throw new Error('Cannot undo this merge because a signal was discarded');
 const later=ctx.db.prepare('SELECT 1 FROM merges WHERE rowid>(SELECT rowid FROM merges WHERE id=?) AND undone_at IS NULL AND (survivor_id IN (?,?) OR absorbed_id IN (?,?)) LIMIT 1').get(id,...ids,...ids);
 if(later)throw new Error('Undo the later merge first');
 for(const origin of [...before.survivor.origins,...before.absorbed.origins]){
  const dump=ctx.db.prepare('SELECT deleted_at FROM dumps WHERE id=?').get(origin.dump_id) as Row|undefined;
  if(!dump)throw new Error('This merge refers to a permanently deleted dump');
  if(dump.deleted_at)throw new Error('Restore the binned dump before undoing this merge');
 }
 const applied=before.applied??expectedMerged(before,merge);
 const current={survivor:snapshotSignal(ctx.db,ids[0]),absorbed:snapshotSignal(ctx.db,ids[1])};
 // Start from exact originals, then replay differences made after the merge.
 clearSignalRelations(ctx.db,ids[0]);clearSignalRelations(ctx.db,ids[1]);
 restoreSignalSnapshot(ctx.db,before.survivor);restoreSignalSnapshot(ctx.db,before.absorbed);
 for(const side of ['survivor','absorbed'] as const){
  const actual=current[side].signal,baseline=applied[side].signal;
  const changed=Object.keys(actual).filter(key=>!auditFields.has(key)&&key!=='id'&&!equal(actual[key],baseline[key]));
  if(changed.length){
   const keys=[...new Set([...changed,...auditFields])];
   ctx.db.prepare(`UPDATE signals SET ${keys.map(key=>`${key}=?`).join(',')} WHERE id=?`).run(...keys.map(key=>actual[key]),actual.id);
  }
 }
 for(const kind of Object.keys(relationTables) as Relation[]){
  const column=relationColumns[kind],table=relationTables[kind];
  // A later removal is a decision too; do not resurrect it on either split signal.
  const currentKeys=new Set([...current.survivor[kind],...current.absorbed[kind]].map(value=>value[column]));
  for(const original of applied.survivor[kind])if(!currentKeys.has(original[column])){
   const ownerColumn=kind==='mentions'?'object_id':'signal_id';
   ctx.db.prepare(`DELETE FROM ${table} WHERE ${ownerColumn} IN (?,?) AND ${column}=?`).run(...ids,original[column]);
  }
  for(const side of ['survivor','absorbed'] as const){
   const baseline=new Map(applied[side][kind].map(value=>[value[column],value]));
   for(const actual of current[side][kind]){
    const old=baseline.get(actual[column]);
    if(!old||contentChanged(actual,old))preserveRelation(ctx.db,kind,current[side].signal.id,actual);
   }
  }
 }
 ctx.db.prepare('UPDATE merges SET undone_at=?,undone_by=?,updated_at=?,updated_by=? WHERE id=?').run(ctx.now,actorString(ctx.actor),ctx.now,actorString(ctx.actor),id);
 return row(ctx,'merge',id);
}
export function mergeSignals(ctx:ToolContext,survivorId:string,absorbedId:string,reasoning:string):Row {
 if(survivorId===absorbedId)throw new Error('A signal cannot merge into itself');
 const survivor=row(ctx,'signal',survivorId),absorbed=row(ctx,'signal',absorbedId);
 if([survivor,absorbed].some(s=>s.discarded_at||s.merged_into_id||s.deleted_by_dump_id))throw new Error('Only active signals may merge');
 const snapshot:{survivor:SignalSnapshot;absorbed:SignalSnapshot;applied?:{survivor:SignalSnapshot;absorbed:SignalSnapshot}}={survivor:snapshotSignal(ctx.db,survivorId),absorbed:snapshotSignal(ctx.db,absorbedId)};ctx.before=snapshot;
 const maxPosition=(ctx.db.prepare('SELECT COALESCE(MAX(position),-1) n FROM signal_sources WHERE signal_id=?').get(survivorId) as Row).n;
 ctx.db.prepare('UPDATE signal_sources SET signal_id=?,position=position+?,updated_at=?,updated_by=?,run_id=? WHERE signal_id=?').run(survivorId,maxPosition+1,ctx.now,actorString(ctx.actor),ctx.actor.kind==='agent'?ctx.actor.runId:null,absorbedId);
 for(const table of ['signal_origins','signal_themes']){
  const column=table==='signal_origins'?'dump_id':'theme_id';
  const values=ctx.db.prepare(`SELECT * FROM ${table} WHERE signal_id=?`).all(absorbedId) as Row[];
  for(const value of values)if(!ctx.db.prepare(`SELECT 1 FROM ${table} WHERE signal_id=? AND ${column}=?`).get(survivorId,value[column]))insert(ctx,table,{...value,signal_id:survivorId,updated_at:ctx.now,updated_by:actorString(ctx.actor),run_id:ctx.actor.kind==='agent'?ctx.actor.runId:null});
  ctx.db.prepare(`DELETE FROM ${table} WHERE signal_id=?`).run(absorbedId);
 }
 for(const e of snapshot.absorbed.evidence){
  if(!ctx.db.prepare('SELECT 1 FROM evidence WHERE signal_id=? AND theory_id=?').get(survivorId,e.theory_id))ctx.db.prepare('UPDATE evidence SET signal_id=?,updated_at=?,updated_by=?,run_id=? WHERE id=?').run(survivorId,ctx.now,actorString(ctx.actor),ctx.actor.kind==='agent'?ctx.actor.runId:null,e.id);
  else ctx.db.prepare('DELETE FROM evidence WHERE id=?').run(e.id);
 }
 ctx.db.prepare("UPDATE mentions SET object_id=? WHERE object_kind='signal' AND object_id=?").run(survivorId,absorbedId);
 update(ctx,'signals',survivorId,{note:[survivor.note,absorbed.note].filter(Boolean).join('\n\n')});
 update(ctx,'signals',absorbedId,{merged_into_id:survivorId});
 snapshot.applied={survivor:snapshotSignal(ctx.db,survivorId),absorbed:snapshotSignal(ctx.db,absorbedId)};
 const merge=insert(ctx,'merges',{object_kind:'signal',survivor_id:survivorId,absorbed_id:absorbedId,snapshot_json:JSON.stringify(snapshot),reasoning,actor:actorString(ctx.actor),dump_id:ctx.dumpId});
 return result(ctx,'merge',merge);
}
export const mergeTools={
 mergeNearDuplicateSignals:define(z.object({survivorId:z.string(),absorbedId:z.string(),reasoning:z.string().min(1),dumpId:z.string().optional()}),'both',(ctx,i)=>{ctx.dumpId=i.dumpId??ctx.dumpId;return mergeSignals(ctx,i.survivorId,i.absorbedId,i.reasoning);}),
 undoMerge:define(idSchema,'person',(ctx,i)=>{const merge=row(ctx,'merge',i.id);ctx.before=merge;return result(ctx,'merge',undoSignalMerge(ctx,i.id));}),
};
