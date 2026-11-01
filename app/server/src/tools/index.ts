import { z } from 'zod';
import { ulid } from 'ulid';
import type { Database } from '../db/index.js';
import type { Actor } from '../../../shared/src/index.js';
import { AuthorityError, actorString } from './authority.js';
import { normaliseInput, json, type Definition, type Row, type ToolContext } from './core.js';
import { dumpTools } from './dumps.js';
import { signalTools } from './signals.js';
import { themeTools } from './themes.js';
import { theoryTools } from './theories.js';
import { prototypeTools } from './prototypes.js';
import { draftTools } from './drafts.js';
import { suggestionTools } from './suggestions.js';
import { mergeTools } from './merges.js';
import { readTools } from './reads.js';
import { mediaTools } from './media.js';
export { AuthorityError, assertMayWrite, actorString } from './authority.js';
export { normaliseUrl, normalizeUrl } from './core.js';
export { updateDumpStatus, saveTranscript, purgeBin } from './dumps.js';
export { restoreSignalMerge } from './merges.js';
export type { Actor } from '../../../shared/src/index.js';
export type { Definition, ToolContext } from './core.js';
export const definitions:Record<string,Definition>={...dumpTools,...signalTools,...themeTools,...theoryTools,...prototypeTools,...draftTools,...suggestionTools,...mergeTools,...readTools,...mediaTools};
for(const [name,definition] of Object.entries(definitions))definition.description||=name.replace(/([A-Z])/g,' $1').toLowerCase();
export const schemas:Record<string,z.ZodType>=Object.fromEntries(Object.entries(definitions).map(([name,def])=>[name,def.input]));
export const names=Object.keys(definitions);
export function createTools(db:Database) {
 const listeners=new Set<(event:Row)=>void>();
 function call(name:string,input:unknown={},actor:Actor):any {
  const tool=definitions[name];if(!tool)throw new Error(`Unknown tool: ${name}`);
  if(tool.who!=='both'&&tool.who!==actor.kind)throw new AuthorityError(`${name} is ${tool.who}-only`);
  const parsed=tool.input.parse(normaliseInput(input));
  const ownerId=actor.kind==='person'?(actor.id??actor.personId):'maggie';
  if(!ownerId)throw new AuthorityError('Person identity is required');
  if(actor.kind==='agent'&&!tool.read&&!db.prepare('SELECT 1 FROM agent_runs WHERE id=? AND owner_id=?').get(actor.runId,ownerId))throw new AuthorityError('Agent run is not registered');
  let emitted:Row|undefined;
  const value=db.transaction(()=>{
   const now=new Date().toISOString();const ctx:ToolContext={db,actor,ownerId,now,tool:name,dumpId:actor.kind==='agent'?actor.dumpId:undefined};
   const key=actor.kind==='agent'&&tool.key?tool.key(parsed):undefined;
   if(key!==undefined&&actor.kind==='agent'){
    const prior=db.prepare('SELECT result_json FROM tool_calls WHERE owner_id=? AND run_id=? AND tool=? AND key=?').get(ownerId,actor.runId,name,key) as Row|undefined;
    if(prior){
     const saved=JSON.parse(prior.result_json);
     if(name==='createSignal'){const signal=db.prepare('SELECT discarded_at,deleted_by_dump_id FROM signals WHERE id=?').get(saved.id) as Row|undefined;if(!signal)throw new Error('Signal no longer exists');if(signal?.discarded_at)throw new Error('Signal was previously discarded (tombstone)');if(signal?.deleted_by_dump_id)throw new Error('Signal origin dump is in the bin');}
     return saved;
    }
   }
   const result=tool.output.parse(tool.run(ctx,parsed));
   if(!tool.read&&!ctx.noEvent){
    emitted={id:ulid(),owner_id:ownerId,at:now,actor:actorString(actor),tool:name,object_kind:ctx.objectKind??'dump',object_id:ctx.objectId??(parsed as Row).id??(result as Row).id??'',before_json:json(ctx.before),after_json:json(ctx.after??result),dump_id:ctx.dumpId??null,run_id:actor.kind==='agent'?actor.runId:null};
    db.prepare('INSERT INTO events(id,owner_id,at,actor,tool,object_kind,object_id,before_json,after_json,dump_id,run_id) VALUES(@id,@owner_id,@at,@actor,@tool,@object_kind,@object_id,@before_json,@after_json,@dump_id,@run_id)').run(emitted);
   }
   if(key!==undefined&&actor.kind==='agent')db.prepare('INSERT INTO tool_calls(owner_id,run_id,tool,key,result_json,created_at) VALUES(?,?,?,?,?,?)').run(ownerId,actor.runId,name,key,JSON.stringify(result),now);
   return result;
  })();
  if(emitted)for(const listener of listeners){try{listener(emitted);}catch{/* Subscribers cannot roll back committed data. */}}
  return value;
 }
 return {call,definitions,schemas,names,subscribe(listener:(event:Row)=>void){listeners.add(listener);return ()=>listeners.delete(listener);}};
}
