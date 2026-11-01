import { z } from 'zod';
import { createHash } from 'node:crypto';
import { SourceSchema } from '../../../shared/src/index.js';
import { define, idSchema, insert, target, result, row, normaliseUrl, enqueue, update, activeSignal, type ToolContext, type Row } from './core.js';
import { getObject } from './queries.js';
function attachOrigin(ctx:ToolContext,signalId:string,dumpId:string,mention=true):void {
 activeSignal(ctx,signalId);const dump=row(ctx,'dump',dumpId);if(dump.deleted_at)throw new Error('Cannot attach a deleted dump');
 const exists=ctx.db.prepare('SELECT 1 FROM signal_origins WHERE signal_id=? AND dump_id=?').get(signalId,dumpId);
 insert(ctx,'signal_origins',{signal_id:signalId,dump_id:dumpId},true);
 if(mention&&!exists)insert(ctx,'mentions',{object_kind:'signal',object_id:signalId,dump_id:dumpId,at:ctx.now});
}
function identity(i:Row):string {return i.key??i.idempotencyKey??`${i.dumpId}:`+createHash('sha256').update(i.sources?.filter((s:Row)=>s.url).map((s:Row)=>normaliseUrl(s.url)).sort().join('|')||i.gist.trim().toLowerCase()).digest('hex');}
export const signalTools={
 createSignal:define(z.object({dumpId:z.string(),gist:z.string().trim().min(1),note:z.string().default(''),sources:z.array(SourceSchema).min(1).default([{ownObservation:true}]),fetched:z.unknown().optional(),embedding:z.array(z.number()).optional(),key:z.string().optional(),idempotencyKey:z.string().optional()}),'agent',(ctx,i)=>{
  ctx.dumpId=i.dumpId;const dump=row(ctx,'dump',i.dumpId);if(dump.deleted_at)throw new Error('Cannot process a deleted dump');
  for(const source of i.sources){if(source.url&&ctx.db.prepare('SELECT 1 FROM tombstones WHERE url_normalised=? AND owner_id=?').get(normaliseUrl(source.url),ctx.ownerId))throw new Error('Signal was previously discarded (tombstone)');}
  for(const source of i.sources){if(!source.url)continue;const url=normaliseUrl(source.url);
   if(ctx.db.prepare('SELECT 1 FROM tombstones WHERE url_normalised=? AND owner_id=?').get(url,ctx.ownerId))throw new Error('Signal was previously discarded (tombstone)');
   const existing=ctx.db.prepare('SELECT s.id FROM signals s JOIN signal_sources ss ON ss.signal_id=s.id WHERE ss.url_normalised=? AND s.owner_id=? AND s.discarded_at IS NULL AND s.deleted_by_dump_id IS NULL AND s.merged_into_id IS NULL').get(url,ctx.ownerId) as Row|undefined;
   if(existing){attachOrigin(ctx,existing.id,i.dumpId);return result(ctx,'signal',getObject(ctx.db,'signal',existing.id,ctx.ownerId)!);}
  }
  if(ctx.db.prepare('SELECT 1 FROM tombstones WHERE lower(gist)=? AND owner_id=?').get(i.gist.toLowerCase(),ctx.ownerId))throw new Error('Signal was previously discarded (tombstone)');
  const signal=insert(ctx,'signals',{gist:i.gist,note:i.note,fetched_json:i.fetched==null?null:JSON.stringify(i.fetched),embedding:i.embedding?Buffer.from(new Float32Array(i.embedding).buffer):null});
  for(const [position,source] of i.sources.entries())insert(ctx,'signal_sources',{signal_id:signal.id,url:source.url,url_normalised:source.url?normaliseUrl(source.url):null,author:source.author,published_at:source.publishedAt,title:source.title,own_observation:source.ownObservation?1:source.url?0:1,position});
  attachOrigin(ctx,signal.id,i.dumpId,false);enqueue(ctx,'link_evidence',{signalId:signal.id,dumpId:i.dumpId},`link_evidence:${signal.id}`);enqueue(ctx,'tripwire',{signalId:signal.id,dumpId:i.dumpId},`tripwire:${signal.id}`);
  return result(ctx,'signal',getObject(ctx.db,'signal',signal.id,ctx.ownerId)!);
 },{key:identity}),
 attachOrigin:define(z.object({signalId:z.string(),dumpId:z.string()}),'agent',(ctx,i)=>{ctx.dumpId=i.dumpId;ctx.before=getObject(ctx.db,'signal',i.signalId,ctx.ownerId);attachOrigin(ctx,i.signalId,i.dumpId);return result(ctx,'signal',getObject(ctx.db,'signal',i.signalId,ctx.ownerId)!);}),
 fileSignal:define(z.object({signalId:z.string(),themeId:z.string()}),'both',(ctx,i)=>{activeSignal(ctx,i.signalId);target(ctx,'signal',i.signalId);row(ctx,'theme',i.themeId);insert(ctx,'signal_themes',{signal_id:i.signalId,theme_id:i.themeId},true);return result(ctx,'signal',getObject(ctx.db,'signal',i.signalId,ctx.ownerId)!);}),
 unfileSignal:define(z.object({signalId:z.string(),themeId:z.string()}),'person',(ctx,i)=>{activeSignal(ctx,i.signalId);target(ctx,'signal',i.signalId);ctx.db.prepare('DELETE FROM signal_themes WHERE signal_id=? AND theme_id=? AND owner_id=?').run(i.signalId,i.themeId,ctx.ownerId);return result(ctx,'signal',getObject(ctx.db,'signal',i.signalId,ctx.ownerId)!);}),
 editSignal:define(idSchema.extend({gist:z.string().trim().min(1).optional(),note:z.string().optional()}),'person',(ctx,i)=>{activeSignal(ctx,i.id);target(ctx,'signal',i.id);update(ctx,'signals',i.id,{gist:i.gist,note:i.note});return result(ctx,'signal',getObject(ctx.db,'signal',i.id,ctx.ownerId)!);}),
 discardSignal:define(idSchema,'person',(ctx,i)=>{
  const signal=target(ctx,'signal',i.id);if(signal.discarded_at){ctx.noEvent=true;return signal;}
  const sources=ctx.db.prepare('SELECT * FROM signal_sources WHERE signal_id=?').all(i.id) as Row[];
  for(const source of sources.length?sources:[{}])insert(ctx,'tombstones',{signal_id:i.id,gist:signal.gist,url_normalised:source.url_normalised,embedding:signal.embedding});
  update(ctx,'signals',i.id,{discarded_at:ctx.now});return result(ctx,'signal',getObject(ctx.db,'signal',i.id,ctx.ownerId)!);
 }),
 recordMention:define(z.object({kind:z.enum(['signal','theme','theory']),id:z.string(),dumpId:z.string()}),'agent',(ctx,i)=>{row(ctx,i.kind,i.id);row(ctx,'dump',i.dumpId);ctx.dumpId=i.dumpId;const mention=insert(ctx,'mentions',{object_kind:i.kind,object_id:i.id,dump_id:i.dumpId,at:ctx.now});ctx.objectKind=i.kind;ctx.objectId=i.id;return mention;},{key:i=>`${i.kind}:${i.id}:${i.dumpId}`}),
 markSeen:define(z.object({kind:z.enum(['signal','suggestion','theme','theory','prototype','merge']),id:z.string()}),'person',(ctx,i)=>{target(ctx,i.kind,i.id);if(i.kind==='merge'){update(ctx,'merges',i.id,{seen_at:ctx.now});}else update(ctx,`${i.kind==='theory'?'theorie':i.kind}s`,i.id,{seen_at:ctx.now});return result(ctx,i.kind,getObject(ctx.db,i.kind,i.id,ctx.ownerId)!);}),
};
