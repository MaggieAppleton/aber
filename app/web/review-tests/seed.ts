import { resolve } from "node:path";
import { config } from "../../server/src/config.js";
import { createDatabase } from "../../server/src/db/index.js";
import { createTools } from "../../server/src/tools/index.js";
import { insert, type ToolContext } from "../../server/src/tools/core.js";

if(process.env.AGENT_MODE!=="fake"||!config.dataDir.startsWith("/private/tmp/aber-web-review-"))throw new Error("Review fixtures require their isolated fake database");
const db=createDatabase(resolve(config.dataDir,"aber.db")), tools=createTools(db), now=new Date().toISOString();
db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at,finished_at) VALUES('web-review','process_dump','fake','fixture','v1','done',?,?)").run(now,now);
const person={kind:"person",id:"maggie"} as const, agent={kind:"agent",job:"process_dump",runId:"web-review"} as const;
const ctx:ToolContext={db,actor:person,ownerId:"maggie",now,tool:"web-review-fixture"};
const call=(name:string,input:object)=>tools.call(name,input,person);
const propose=(name:string,input:object)=>tools.call(name,input,agent);
const theory=(claim:string,body="Original reviewed body")=>call("writeTheory",{claim,body,confidence:3,horizon:2028});
const dump=(text:string,column=false)=>insert(ctx,"dumps",{text,status:"done",captured_at:now,captured_from:column?"column":"web"});
const signal=(gist:string,title:string,url:string)=>{
  const origin=dump(`Origin of ${gist}`), value=insert({...ctx,actor:agent},"signals",{gist});
  insert(ctx,"signal_sources",{signal_id:value.id,title,url,url_normalised:url,position:0,own_observation:0});
  insert(ctx,"signal_origins",{signal_id:value.id,dump_id:origin.id});
  return value;
};

theory("Review searchable active claim","The body-only token is quartznebula.");
const retired=theory("Review archived claim with history");call("retireTheory",{id:retired.id,reason:"superseded"});
const retiredTheme=call("writeTheme",{name:"Review archived theme"});call("retireTheme",{id:retiredTheme.id,reason:"abandoned"});
const searchDump=dump("Review transcript source");
const media=insert(ctx,"media",{path:"fixtures/unused.wav",mime:"audio/wav",bytes:0,sha256:"web-review-search"});
insert(ctx,"transcripts",{dump_id:searchDump.id,media_id:media.id,text:"A spoken cobaltraven observation.",provider:"fake",model:"fixture"});
for(let index=0;index<105;index++)insert(ctx,"signals",{id:`review-page-${String(index).padStart(3,"0")}`,gist:`Pagination filler ${index}`});
insert(ctx,"signals",{id:"review-page-older",gist:"Pagination lanternviolet observation",created_at:new Date(Date.now()+1000).toISOString()});

for(const key of ["claim","body","insert","discard"]){
  const target=theory(`Review ${key} revision target`);
  propose("proposeRevision",{targetId:target.id,reasoning:`Review ${key} reasoning`,...(key==="body"?{body:"A complete proposed replacement\n\nWith its second paragraph."}:key==="insert"?{bodyInsert:"A proposed body addition."}:{claim:`Proposed ${key} claim`})});
}
const renamed=call("writeTheme",{name:"Review theme rename target"});
propose("proposeRevision",{themeId:renamed.id,name:"Proposed theme name",reasoning:"Review name reasoning"});
const evidenceTarget=theory("Review evidence proposal target"), evidenceSignal=signal("Review proposed evidence observation","Evidence source","https://example.org/review-evidence");
propose("proposeEvidence",{theoryId:evidenceTarget.id,signalId:evidenceSignal.id,stance:"undermines",note:"Proposed evidence note",reasoning:"Review evidence reasoning"});
// This is a settled history fixture, with no concurrent lookback job adding unrelated hits.
const historical=call("writeTheory",{claim:"Review historical challenge decision",confidence:4,horizon:2028});
db.prepare("UPDATE theories SET tripwire = ?, tripwire_version = 1 WHERE id = ?").run("The memory feature is withdrawn.",historical.id);
const challenge=propose("proposeChallenge",{theoryId:historical.id,signalId:evidenceSignal.id,why:"A matching withdrawal"});
call("decideSuggestion",{id:challenge.id,decision:"accepted"});call("setConfidence",{id:historical.id,confidence:5});
for(const kind of ["theme","theory"]){
  const keep=kind==="theme"?call("writeTheme",{name:"Review merge theme keep"}):theory("Review merge theory keep");
  const absorbed=kind==="theme"?call("writeTheme",{name:"Review merge theme absorbed"}):theory("Review merge theory absorbed");
  propose("proposeMerge",{targetKind:kind,targetId:keep.id,otherId:absorbed.id,reasoning:`Review ${kind} merge reasoning`});
}

const dependencies=[];
for(const reason of ["disproven","superseded","abandoned"]){const dependency=theory(`Review retired dependency ${reason}`);call("retireTheory",{id:dependency.id,reason});dependencies.push(dependency.id);}
call("writePrototype",{name:"Review prototype with retired tests",theories:dependencies});
const a=signal("Review manual merge observation A","First independent source","https://example.org/review-a");
const b=signal("Review manual merge observation B","Second independent source","https://example.org/review-b");
call("linkEvidence",{theoryId:theory("Review first merge evidence target").id,signalId:a.id,stance:"supports"});
call("linkEvidence",{theoryId:theory("Review second merge evidence target").id,signalId:b.id,stance:"undermines"});

const chatDump=dump("Review processing draft cards",true), parts:Record<string,unknown>[]=[];
for(const action of ["accept","rephrase","discard"])for(const kind of ["theme","theory","prototype"]){
  const title=`Review ${action} draft ${kind}`, name=`createDraft${kind[0].toUpperCase()+kind.slice(1)}`;
  const object=propose(name,{dumpId:chatDump.id,...(kind==="theory"?{claim:title,horizon:2028}:{name:title})});
  parts.push({type:"data-draft",data:kind==="theory"&&action==="accept"?object:{...object,kind}});
}
parts.push({type:"tool-showTheory",state:"output-available",output:{...retired,kind:"theory"}});
propose("reply",{dumpId:chatDump.id,parts});
db.close();
