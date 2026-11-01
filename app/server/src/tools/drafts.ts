import { z } from 'zod';
import { define, target, update, result, type ToolContext, type Row } from './core.js';
import { getObject } from './queries.js';
import { appendStance, versionTheory } from './theories.js';
const input=z.object({kind:z.enum(['theme','theory','prototype']).optional(),id:z.string(),confidence:z.number().int().min(1).max(5).optional(),claim:z.string().trim().min(1).optional(),name:z.string().trim().min(1).optional(),body:z.string().optional(),text:z.string().trim().min(1).optional()});
function resolveKind(ctx:ToolContext,i:Row):string {
 if(i.kind)return i.kind;
 for(const [kind,table] of [['theme','themes'],['theory','theories'],['prototype','prototypes']])if(ctx.db.prepare(`SELECT 1 FROM ${table} WHERE id=? AND owner_id=?`).get(i.id,ctx.ownerId))return kind;
 throw new Error('Draft not found');
}
function decideDraft(ctx:ToolContext,i:Row,rephrase=false,discard=false):Row {
 const kind=resolveKind(ctx,i);const value=target(ctx,kind,i.id);
 if(value.discarded_at)throw new Error('Draft was discarded');
 if(!(value.status==='draft'||value.draft===1))throw new Error('Object is no longer a draft');
 const table=kind==='theory'?'theories':`${kind}s`;
 if(discard)update(ctx,table,i.id,{discarded_at:ctx.now,seen_at:ctx.now});
 else {
  const patch:Row={seen_at:ctx.now};
  if(kind==='prototype')patch.draft=0;else patch.status=kind==='theory'?'held':'mine';
  if(kind==='theory')patch.authorship=rephrase?'rephrased':'agent';
  if(rephrase){
   if(kind==='theory'){patch.claim=i.claim??i.text??value.claim;patch.body=i.body??value.body;}
   else patch.name=i.name??i.text??value.name;
  }
  update(ctx,table,i.id,patch);
  if(kind==='theory'){
   if(rephrase)versionTheory(ctx,i.id);
   if(i.confidence!=null)appendStance(ctx,i.id,i.confidence,'','accepted_draft');
  }
 }
 return result(ctx,kind,getObject(ctx.db,kind,i.id,ctx.ownerId)!);
}
export const draftTools={
 acceptDraft:define(input,'person',(ctx,i)=>decideDraft(ctx,i)),
 rephraseDraft:define(input,'person',(ctx,i)=>decideDraft(ctx,i,true)),
 discardDraft:define(input,'person',(ctx,i)=>decideDraft(ctx,i,false,true)),
};
