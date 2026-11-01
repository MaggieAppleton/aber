import { z } from 'zod';
import { define, idSchema, objectOutput, normaliseUrl, type Row } from './core.js';
import { AuthorityError } from './authority.js';
import { selectThemes, selectTheories, selectSignals, getObject, getDump, listDumps } from './queries.js';
import { selectSignalPage } from './signals-page.js';
import { searchMaterial } from './search-material.js';
const limit=z.number().int().min(1).max(100).default(20);
const similar=z.object({text:z.string().default(''),urls:z.array(z.string().url()).optional(),limit,embedding:z.array(z.number()).optional()});
const list=z.object({themeId:z.string().optional(),status:z.string().optional(),limit:z.number().int().min(1).max(500).optional()});
function relevance(text:string,candidate:string):number {
 const words=(v:string)=>new Set(v.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)??[]);
 const a=words(text),b=words(candidate);let overlap=0;for(const word of a)if(b.has(word))overlap++;return overlap/Math.sqrt(a.size*b.size||1);
}
function cosine(a:number[],blob:Buffer|undefined|null):number|null {
 if(!blob||blob.length%4)return null;const b=Array.from(new Float32Array(blob.buffer.slice(blob.byteOffset,blob.byteOffset+blob.length)));if(a.length!==b.length)return null;
 let dot=0,aa=0,bb=0;for(let n=0;n<a.length;n++){dot+=a[n]*b[n];aa+=a[n]**2;bb+=b[n]**2;}return aa&&bb?dot/Math.sqrt(aa*bb):0;
}
function chatOnly(ctx:{actor:any}):void {if(ctx.actor.kind!=='agent'||ctx.actor.job!=='chat')throw new AuthorityError('Display tools are available only to chat');}
const read=(input:z.ZodType,run:any,output:z.ZodType=z.array(objectOutput))=>define(input,'both',run,{read:true,output});
export const readTools={
 lookupSignals:read(z.object({urls:z.array(z.string().url()).default([]),gist:z.string().optional()}),(ctx:any,i:any)=>{const urls=i.urls.map(normaliseUrl);const exactMatches=selectSignals(ctx.db,ctx.ownerId).filter((s:Row)=>s.sources.some((source:Row)=>urls.includes(source.url_normalised)));const tombstones=(ctx.db.prepare('SELECT * FROM tombstones WHERE owner_id=?').all(ctx.ownerId) as Row[]).filter(t=>urls.includes(t.url_normalised)||(i.gist&&t.gist.toLowerCase()===i.gist.toLowerCase()));return {exactMatches,tombstones};},objectOutput),
 getDump:read(idSchema,(ctx:any,i:any)=>getDump(ctx.db,i.id,ctx.ownerId),objectOutput.nullable()),
 listDumps:read(z.object({bin:z.union([z.boolean(),z.number()]).default(false)}),(ctx:any,i:any)=>listDumps(ctx.db,!!i.bin,ctx.ownerId)),
 getTheory:read(idSchema,(ctx:any,i:any)=>getObject(ctx.db,'theory',i.id,ctx.ownerId),objectOutput.nullable()),
 getSignal:read(idSchema,(ctx:any,i:any)=>getObject(ctx.db,'signal',i.id,ctx.ownerId),objectOutput.nullable()),
 listThemes:read(list,(ctx:any,i:any)=>selectThemes(ctx.db,ctx.ownerId).filter((t:Row)=>!i.status||t.status===i.status).slice(0,i.limit??500)),
 listTheories:read(list,(ctx:any,i:any)=>selectTheories(ctx.db,ctx.ownerId).filter((t:Row)=>(!i.status||t.status===i.status)&&(!i.themeId||t.themes.includes(i.themeId))).slice(0,i.limit??500)),
 similarSignals:read(similar,(ctx:any,i:any)=>selectSignals(ctx.db,ctx.ownerId).map((s:Row)=>({...s,exactMatch:!!i.urls?.some((url:string)=>s.sources.some((source:Row)=>source.url_normalised===normaliseUrl(url))),similarity:(i.embedding?cosine(i.embedding,s.embedding):null)??relevance(i.text,`${s.gist} ${s.note}`)})).sort((a:Row,b:Row)=>b.similarity-a.similarity||a.id.localeCompare(b.id)).slice(0,i.limit)),
 similarTheories:read(similar,(ctx:any,i:any)=>selectTheories(ctx.db,ctx.ownerId).map((t:Row)=>({...t,similarity:relevance(i.text,`${t.claim} ${t.body}`)})).sort((a:Row,b:Row)=>b.similarity-a.similarity||a.id.localeCompare(b.id)).slice(0,i.limit)),
 listTripwires:read(similar,(ctx:any,i:any)=>selectTheories(ctx.db,ctx.ownerId).filter((t:Row)=>t.status==='held'&&t.tripwire).map((t:Row)=>({...t,similarity:relevance(i.text,t.tripwire)})).sort((a:Row,b:Row)=>b.similarity-a.similarity||a.id.localeCompare(b.id)).slice(0,i.limit)),
 listRecentSignals:read(z.object({since:z.iso.datetime(),until:z.iso.datetime(),cursor:z.string().optional(),limit:z.number().int().min(1).max(200).default(100)}),(ctx:any,i:any)=>{const page=selectSignalPage(ctx.db,i,ctx.ownerId);return {signals:page.ids.map(id=>({id})),signalPage:page.signalPage};},objectOutput),
 search:read(z.object({text:z.string().default(''),query:z.string().optional(),limit}),(ctx:any,i:any)=>searchMaterial(ctx.db,ctx.ownerId,i.query??i.text,i.limit)),
 showTheory:define(idSchema,'agent',(ctx,i)=>{chatOnly(ctx);const theory=getObject(ctx.db,'theory',i.id,ctx.ownerId);if(!theory)throw new Error('Theory not found');return theory;},{read:true}),
 showEvidenceSplit:define(idSchema,'agent',(ctx,i)=>{chatOnly(ctx);const theory=getObject(ctx.db,'theory',i.id,ctx.ownerId);if(!theory)throw new Error('Theory not found');const signals=selectSignals(ctx.db,ctx.ownerId).filter((s:Row)=>s.evidence.some((e:Row)=>e.theory===i.id));return {theoryId:i.id,theory,supports:signals.filter((s:Row)=>s.evidence.some((e:Row)=>e.theory===i.id&&e.stance==='supports')),undermines:signals.filter((s:Row)=>s.evidence.some((e:Row)=>e.theory===i.id&&e.stance==='undermines'))};},{read:true}),
 showSignalList:define(z.object({ids:z.array(z.string()).optional(),themeId:z.string().optional(),theoryId:z.string().optional(),text:z.string().optional(),limit}),'agent',(ctx,i)=>{chatOnly(ctx);const signals=selectSignals(ctx.db,ctx.ownerId).filter((s:Row)=>(!i.ids||i.ids.includes(s.id))&&(!i.themeId||s.themes.includes(i.themeId))&&(!i.theoryId||s.evidence.some((e:Row)=>e.theory===i.theoryId))&&(!i.text||s.gist.toLowerCase().includes(i.text.toLowerCase()))).slice(0,i.limit);return {signals};},{read:true}),
 showThemeActivity:define(z.object({themeId:z.string(),since:z.string().optional()}),'agent',(ctx,i)=>{chatOnly(ctx);const theme=getObject(ctx.db,'theme',i.themeId,ctx.ownerId);if(!theme)throw new Error('Theme not found');const signals=selectSignals(ctx.db,ctx.ownerId).filter((s:Row)=>s.themes.includes(i.themeId)&&(!i.since||s.created_at>=i.since));const theories=selectTheories(ctx.db,ctx.ownerId).filter((t:Row)=>t.themes.includes(i.themeId)&&(!i.since||t.updated_at>=i.since));return {theme,signals,theories,counts:{signals:signals.length,theories:theories.length}};},{read:true}),
 reply:define(z.object({dumpId:z.string(),parts:z.array(z.record(z.string(),z.unknown())),key:z.string().optional()}),'agent',(ctx,i)=>{
  const dump=ctx.db.prepare('SELECT * FROM dumps WHERE id=? AND owner_id=?').get(i.dumpId,ctx.ownerId) as Row|undefined;if(!dump||dump.deleted_at)throw new Error('Dump not found');ctx.dumpId=i.dumpId;
  // Import-free insert keeps read definitions and their display schemas together.
  const id=ctx.actor.kind==='agent'?`${ctx.actor.runId}:${i.dumpId}`:'';const at=ctx.now;
  ctx.db.prepare('INSERT INTO replies(id,owner_id,dump_id,parts_json,run_id,created_at,created_by,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,?)').run(id,ctx.ownerId,i.dumpId,JSON.stringify(i.parts),ctx.actor.kind==='agent'?ctx.actor.runId:null,at,ctx.actor.kind==='agent'?`agent:${ctx.actor.job}:${ctx.actor.runId}`:'person:maggie',at,ctx.actor.kind==='agent'?`agent:${ctx.actor.job}:${ctx.actor.runId}`:'person:maggie');
  ctx.objectKind='dump';ctx.objectId=i.dumpId;return {id,dumpId:i.dumpId,parts:i.parts};
 },{key:i=>i.key??i.dumpId}),
};
