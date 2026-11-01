import { z } from 'zod';
import { ulid } from 'ulid';
import type { Database } from '../db/index.js';
import type { Actor } from '../../../shared/src/index.js';
import { actorString, assertMayWrite } from './authority.js';
export type Row = Record<string, any>;
export type ToolContext = { db:Database; actor:Actor; ownerId:string; dumpId?:string; now:string; tool:string; before?:unknown; after?:unknown; objectKind?:string; objectId?:string; noEvent?:boolean };
export type Definition = { input:z.ZodType; output:z.ZodType; who:'person'|'agent'|'both'; description:string; read?:boolean; run:(ctx:ToolContext,input:any)=>any; key?:(input:any)=>string };
export const objectOutput = z.record(z.string(), z.unknown());
export function define(input:z.ZodType,who:Definition['who'],run:Definition['run'],options:Partial<Omit<Definition,'input'|'who'|'run'>> = {}):Definition {
  return {input,output:objectOutput,who,run,description:'',...options};
}
export const idSchema = z.object({id:z.string().min(1)});
export const TABLES:Record<string,string> = {dump:'dumps',signal:'signals',theme:'themes',theory:'theories',prototype:'prototypes',suggestion:'suggestions',merge:'merges'};
const columns = new WeakMap<Database,Map<string,Set<string>>>();
function tableColumns(db:Database,table:string):Set<string> {
  let map=columns.get(db);if(!map){map=new Map();columns.set(db,map);}let set=map.get(table);
  if(!set){set=new Set((db.prepare(`PRAGMA table_info(${table})`).all() as Row[]).map(r=>r.name));map.set(table,set);}return set;
}
export function insert(ctx:ToolContext,table:string,fields:Row,ignore=false):Row {
  const allowed=tableColumns(ctx.db,table);
  const defaults:Row={owner_id:ctx.ownerId,created_at:ctx.now,created_by:actorString(ctx.actor),updated_at:ctx.now,updated_by:actorString(ctx.actor),run_id:ctx.actor.kind==='agent'?ctx.actor.runId:null};
  if(allowed.has('id'))defaults.id=ulid();
  const provided=Object.fromEntries(Object.entries(fields).filter(([,value])=>value!==undefined));
  const data=Object.fromEntries(Object.entries({...defaults,...provided}).filter(([key])=>allowed.has(key)));
  const keys=Object.keys(data);
  ctx.db.prepare(`INSERT ${ignore?'OR IGNORE ':''}INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...Object.values(data));
  return data;
}
export function update(ctx:ToolContext,table:string,id:string,patch:Row):void {
  const allowed=tableColumns(ctx.db,table);
  const values:Row={...patch,updated_at:ctx.now,updated_by:actorString(ctx.actor),run_id:ctx.actor.kind==='agent'?ctx.actor.runId:null};
  if(table==='suggestions'&&ctx.actor.kind==='person')delete values.run_id;
  const data=Object.fromEntries(Object.entries(values).filter(([key,value])=>allowed.has(key)&&value!==undefined));
  ctx.db.prepare(`UPDATE ${table} SET ${Object.keys(data).map(k=>`${k}=?`).join(',')} WHERE id=? AND owner_id=?`).run(...Object.values(data),id,ctx.ownerId);
}
export function row(ctx:ToolContext,kind:string,id:string):Row {
  const table=TABLES[kind];if(!table)throw new Error(`Unknown object kind: ${kind}`);
  const value=ctx.db.prepare(`SELECT * FROM ${table} WHERE id=? AND owner_id=?`).get(id,ctx.ownerId) as Row|undefined;
  if(!value)throw new Error(`${kind} not found: ${id}`);return value;
}
export function activeSignal(ctx:ToolContext,id:string):Row {
 const value=row(ctx,'signal',id);if(value.discarded_at||value.deleted_by_dump_id||value.merged_into_id)throw new Error('Signal is no longer active');return value;
}
export function target(ctx:ToolContext,kind:string,id:string):Row {
  const value=row(ctx,kind,id);assertMayWrite(ctx.actor,{...value,kind},ctx.tool);
  ctx.before=value;ctx.objectKind=kind;ctx.objectId=id;return value;
}
export function result(ctx:ToolContext,kind:string,value:Row):Row {
  ctx.objectKind=kind;ctx.objectId=value.id;ctx.after=value;return value;
}
export function enqueue(ctx:ToolContext,kind:string,payload:Row,key?:string):Row {
  return insert(ctx,'jobs',{kind,payload_json:JSON.stringify(payload),status:'queued',attempts:0,run_after:ctx.now,dedupe_key:key},true);
}
export function json(value:unknown):string|null{return value===undefined?null:JSON.stringify(value);}
export function parse<T=any>(value:string|null|undefined,fallback:T):T{return value?JSON.parse(value):fallback;}
export function normaliseUrl(input:string):string {
  const url=new URL(input);if(!['http:','https:'].includes(url.protocol))throw new Error('Only http and https links are supported');
  url.hash='';url.hostname=url.hostname.toLowerCase().replace(/^www\./,'').replace(/^twitter\.com$/,'x.com');
  for(const key of [...url.searchParams.keys()])if(/^utm_/i.test(key)||['fbclid','si'].includes(key.toLowerCase())||(url.hostname==='x.com'&&['s','t'].includes(key)))url.searchParams.delete(key);
  url.searchParams.sort();url.pathname=url.pathname.replace(/\/+$/,'')||'/';
  return url.toString().replace(/\/(?=\?|$)/,'');
}
export const normalizeUrl=normaliseUrl;
export function normaliseInput(input:unknown):any {
  if(!input||typeof input!=='object'||Array.isArray(input))return input;
  const out:Row={};for(const [key,value] of Object.entries(input))out[key.replace(/_([a-z])/g,(_,l)=>l.toUpperCase())]=value;
  if(out.theoryId&&!out.id)out.id=out.theoryId;if(out.signalId&&!out.id)out.id=out.signalId;if(out.dumpId&&!out.id)out.id=out.dumpId;
  return out;
}
