import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { config } from './config.js';
import { createDatabase, migrate, type Database } from './db/index.js';
import { THEMES, THEORIES, SIGNALS, DUMPS, PROTOTYPES } from './db/seed-world.js';
import { HISTORY } from './db/seed-histories.js';
import { TRIPS } from './db/seed-trips.js';
import { insert, normaliseUrl, type ToolContext } from './tools/core.js';
import { actorString } from './tools/authority.js';

/** Idempotent bootstrap with the canonical jig's actual objects and append-only confidence history. */
export function seed(db:Database):void {
 migrate(db);
 if(db.prepare("SELECT 1 FROM events WHERE id='seed-jig-world'").get())return;
 db.transaction(()=>{
  const now=new Date().toISOString();
  const createdAt=(index:number)=>new Date(Date.parse(now)-1000+index).toISOString();
  db.prepare('INSERT OR IGNORE INTO people(id,name,created_at) VALUES(?,?,?)').run('maggie','Maggie',now);
  db.prepare("INSERT OR IGNORE INTO agent_runs(id,job,provider,model,prompt_version,status,started_at,finished_at) VALUES('seed-run','process_dump','seed','jig-world','v1','done',?,?)").run(now,now);
  const person:ToolContext={db,actor:{kind:'person',id:'maggie'},ownerId:'maggie',now,tool:'seed'};
  const agent:ToolContext={...person,actor:{kind:'agent',job:'process_dump',runId:'seed-run'}};
  const dayTime=(day:string,time:string):string=>{const d=new Date();d.setHours(0,0,0,0);if(day==='Yesterday')d.setDate(d.getDate()-1);else if(day!=='Today')d.setDate(d.getDate()-4);const [hours,minutes]=time.split(':').map(Number);d.setHours(hours,minutes,0,0);return d.toISOString();};
  for(const dump of DUMPS){const at=dayTime(dump.day,dump.time);insert(person,'dumps',{id:dump.id,text:dump.first,captured_at:at,captured_from:dump.kind==='link'?'shortcut':dump.kind==='voice'?'web':'column',is_ask:dump.first.includes('?')?1:0,status:'done',created_at:at,updated_at:at});}
  for(const [index,theme] of THEMES.entries())insert(person,'themes',{id:theme.id,name:theme.name,status:'mine',seen_at:now,created_at:createdAt(index)});
  for(const [index,theory] of THEORIES.entries()){
   const ctx=theory.draft?agent:person;const trip=TRIPS[theory.id];
   insert(ctx,'theories',{id:theory.id,claim:theory.claim,body:theory.body,status:theory.draft?'draft':'held',authorship:theory.draft?'agent':'mine',horizon:theory.horizon,tripwire:trip?.text??'',tripwire_version:trip?.text?1:0,seen_at:theory.draft?null:now,created_at:createdAt(index)});
   insert(ctx,'theory_versions',{id:`version:${theory.id}`,theory_id:theory.id,claim:theory.claim,body:theory.body,tripwire:trip?.text??'',horizon:theory.horizon,at:now,actor:actorString(ctx.actor)});
   const originDump=DUMPS.find(d=>d.produced.includes(theory.id));if(theory.draft&&originDump)insert(agent,'events',{id:`seed-draft:${theory.id}`,at:now,actor:actorString(agent.actor),tool:'createDraftTheory',object_kind:'theory',object_id:theory.id,dump_id:originDump.id,after_json:JSON.stringify({id:theory.id})});
   for(const themeId of theory.themes)insert(ctx,'theory_themes',{theory_id:theory.id,theme_id:themeId});
   for(const fromId of theory.follows)insert(ctx,'follows',{theory_id:theory.id,from_id:fromId});
   for(const rivalId of theory.rivals){const [a,b]=[theory.id,rivalId].sort();insert(ctx,'rivals',{a_id:a,b_id:b},true);}
   for(const stance of HISTORY[theory.id]??[])insert(person,'stances',{id:`${theory.id}:${stance.id}`,person_id:'maggie',theory_id:theory.id,confidence:stance.level,note:stance.note,cause:stance.challenge?'challenge_accepted':'set',at:new Date(`${stance.date} UTC`).toISOString()});
  }
  for(const [index,signal] of SIGNALS.entries()){
   const dump=DUMPS.find(d=>d.id===signal.dump)!;const at=dayTime(dump.day,dump.time);
   insert(agent,'signals',{id:signal.id,gist:signal.gist,note:'',seen_at:signal.day==='Today'?null:now,created_at:createdAt(index),updated_at:at});
   const url=signal.source==='My observation'?null:`https://${signal.source}/aber/seed-${signal.id}`;
   insert(agent,'signal_sources',{id:`source:${signal.id}`,signal_id:signal.id,url,url_normalised:url?normaliseUrl(url):null,title:signal.gist,own_observation:url?0:1,position:0});
   insert(agent,'signal_origins',{signal_id:signal.id,dump_id:signal.dump});
   for(const themeId of signal.themes)insert(agent,'signal_themes',{signal_id:signal.id,theme_id:themeId});
   for(const [index,evidence] of signal.evidence.entries()){
    if(evidence.suggested)insert(agent,'suggestions',{id:`suggestion:${signal.id}:${evidence.theory}`,kind:'evidence',target_kind:'theory',target_id:evidence.theory,payload_json:JSON.stringify({signal_id:signal.id,stance:evidence.stance,note:''}),reasoning:`${signal.gist} ${evidence.stance} this theory`,status:'pending',dump_id:signal.dump});
    else insert(agent,'evidence',{id:`evidence:${signal.id}:${index}`,signal_id:signal.id,theory_id:evidence.theory,stance:evidence.stance,note:''});
   }
  }
  for(const [theoryId,trip] of Object.entries(TRIPS))for(const hit of trip.hits){const decision=trip.decisions?.[hit.id];insert(agent,'suggestions',{id:`challenge:${theoryId}:${hit.id}`,kind:'challenge',target_kind:'theory',target_id:theoryId,payload_json:JSON.stringify({signal_id:hit.id,gist:hit.gist,source:hit.source,day:hit.day,why:hit.why,tripwire_version:1}),reasoning:hit.why,status:decision==='accepted'?'accepted':decision==='dismissed'?'discarded':'pending',decided_at:decision?now:null,seen_at:decision?now:null,dump_id:SIGNALS.find(s=>s.id===hit.id)?.dump});}
  for(const [index,prototype] of PROTOTYPES.entries()){insert(person,'prototypes',{id:prototype.id,name:prototype.name,body:'',draft:0,status:prototype.status,links_json:'[]',seen_at:now,created_at:createdAt(index)});for(const theoryId of prototype.theories)insert(person,'prototype_theories',{prototype_id:prototype.id,theory_id:theoryId});}
  insert(agent,'events',{id:'seed-jig-world',at:now,actor:actorString(agent.actor),tool:'seed',object_kind:'world',object_id:'jig',after_json:JSON.stringify({themes:THEMES.length,theories:THEORIES.length,signals:SIGNALS.length,dumps:DUMPS.length,prototypes:PROTOTYPES.length})});
 })();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const path=resolve(config.dataDir,'aber.db');const db=createDatabase(path);seed(db);db.close();console.log(`Seeded ${path}`);
}
