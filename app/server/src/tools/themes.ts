import { z } from 'zod';
import { RetireReasonSchema } from '../../../shared/src/index.js';
import { define, idSchema, insert, target, update, result } from './core.js';
import { getObject } from './queries.js';
const create=z.object({name:z.string().trim().min(1),dumpId:z.string().optional(),key:z.string().optional()});
export const themeTools={
 writeTheme:define(create,'person',(ctx,i)=>{const t=insert(ctx,'themes',{name:i.name,status:'mine'});return result(ctx,'theme',getObject(ctx.db,'theme',t.id,ctx.ownerId)!);}),
 createDraftTheme:define(create,'agent',(ctx,i)=>{ctx.dumpId=i.dumpId??ctx.dumpId;const t=insert(ctx,'themes',{name:i.name,status:'draft'});return result(ctx,'theme',getObject(ctx.db,'theme',t.id,ctx.ownerId)!);},{key:i=>i.key??i.name.trim().toLowerCase()}),
 renameTheme:define(idSchema.extend({name:z.string().trim().min(1)}),'both',(ctx,i)=>{target(ctx,'theme',i.id);update(ctx,'themes',i.id,{name:i.name});return result(ctx,'theme',getObject(ctx.db,'theme',i.id,ctx.ownerId)!);}),
 retireTheme:define(idSchema.extend({reason:RetireReasonSchema}),'person',(ctx,i)=>{target(ctx,'theme',i.id);update(ctx,'themes',i.id,{status:'retired',retire_reason:i.reason,seen_at:ctx.now});return result(ctx,'theme',getObject(ctx.db,'theme',i.id,ctx.ownerId)!);}),
};
