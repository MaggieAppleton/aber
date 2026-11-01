import { z } from 'zod';
import { PrototypeStatusSchema } from '../../../shared/src/index.js';
import { define, idSchema, insert, target, update, result, row, type ToolContext, type Row } from './core.js';
import { getObject } from './queries.js';
const fields={name:z.string().trim().min(1),body:z.string().default(''),status:PrototypeStatusSchema.default('idea'),links:z.array(z.object({label:z.string().optional(),url:z.string().url()})).default([]),theories:z.array(z.string()).default([])};
function create(ctx:ToolContext,i:Row,draft=false):Row {
 const p=insert(ctx,'prototypes',{name:i.name,body:i.body,status:i.status,draft:draft?1:0,links_json:JSON.stringify(i.links)});
 for(const theoryId of i.theories){row(ctx,'theory',theoryId);insert(ctx,'prototype_theories',{prototype_id:p.id,theory_id:theoryId},true);}
 return result(ctx,'prototype',getObject(ctx.db,'prototype',p.id,ctx.ownerId)!);
}
export const prototypeTools={
 writePrototype:define(z.object(fields),'person',(ctx,i)=>create(ctx,i)),
 createDraftPrototype:define(z.object({...fields,dumpId:z.string().optional(),key:z.string().optional()}),'agent',(ctx,i)=>{ctx.dumpId=i.dumpId??ctx.dumpId;return create(ctx,i,true);},{key:i=>i.key??i.name.trim().toLowerCase()}),
 editPrototype:define(idSchema.extend({name:fields.name.optional(),body:z.string().optional(),links:fields.links.optional()}),'both',(ctx,i)=>{target(ctx,'prototype',i.id);update(ctx,'prototypes',i.id,{name:i.name,body:i.body,links_json:i.links===undefined?undefined:JSON.stringify(i.links)});return result(ctx,'prototype',getObject(ctx.db,'prototype',i.id,ctx.ownerId)!);}),
 setPrototypeStatus:define(idSchema.extend({status:PrototypeStatusSchema}),'both',(ctx,i)=>{target(ctx,'prototype',i.id);update(ctx,'prototypes',i.id,{status:i.status});return result(ctx,'prototype',getObject(ctx.db,'prototype',i.id,ctx.ownerId)!);}),
 linkPrototypeTheory:define(z.object({prototypeId:z.string(),theoryId:z.string()}),'both',(ctx,i)=>{target(ctx,'prototype',i.prototypeId);row(ctx,'theory',i.theoryId);insert(ctx,'prototype_theories',{prototype_id:i.prototypeId,theory_id:i.theoryId},true);return result(ctx,'prototype',getObject(ctx.db,'prototype',i.prototypeId,ctx.ownerId)!);}),
 attachPrototypeMedia:define(z.object({prototypeId:z.string(),mediaId:z.string(),position:z.number().int().nonnegative().default(0)}),'both',(ctx,i)=>{target(ctx,'prototype',i.prototypeId);if(!ctx.db.prepare('SELECT 1 FROM media WHERE id=? AND owner_id=?').get(i.mediaId,ctx.ownerId))throw new Error('Media not found');insert(ctx,'prototype_media',{prototype_id:i.prototypeId,media_id:i.mediaId,position:i.position},true);return result(ctx,'prototype',getObject(ctx.db,'prototype',i.prototypeId,ctx.ownerId)!);}),
};
