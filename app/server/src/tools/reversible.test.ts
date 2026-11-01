import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools, purgeBin } from './index.js';
import { getObject, getDump } from './queries.js';
const person = { kind:'person',id:'maggie' } as const;
const agent = { kind:'agent',job:'process_dump',runId:'run1' } as const;
let db:Database; let tools:ReturnType<typeof createTools>;
beforeEach(() => {
 db=createDatabase();migrate(db);tools=createTools(db);
 db.prepare("INSERT INTO people(id,name,created_at) VALUES('maggie','Maggie',?)").run(new Date().toISOString());
 db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES('run1','process_dump','fake','fake','v1','running',?)").run(new Date().toISOString());
});
afterEach(() => db.close());
const dump=(text:string)=>tools.call('captureDump',{text},person) as any;
const signal=(dumpId:string,gist:string,url:string)=>tools.call('createSignal',{dumpId,gist,sources:[{url}]},agent) as any;
it('merge undo round-trips sources, origins, themes, evidence and notes exactly',()=>{
 const d=dump('Two reports'); const a=signal(d.id,'Finding','https://a.test/a'); const b=signal(d.id,'Same finding','https://b.test/a');
 tools.call('editSignal',{id:a.id,note:'First note'},person);tools.call('editSignal',{id:b.id,note:'Second note'},person);
 const theme=tools.call('writeTheme',{name:'Area'},person) as any; const t=tools.call('writeTheory',{claim:'Claim'},person) as any;
 tools.call('fileSignal',{signalId:b.id,themeId:theme.id},agent);tools.call('linkEvidence',{signalId:b.id,theoryId:t.id,stance:'supports'},person);
 const beforeA=getObject(db,'signal',a.id);const beforeB=getObject(db,'signal',b.id);
 const m=tools.call('mergeNearDuplicateSignals',{survivorId:a.id,absorbedId:b.id,reasoning:'Same event'},agent) as any;
 expect((getObject(db,'signal',a.id) as any).sources).toHaveLength(2);
 tools.call('undoMerge',{id:m.id},person);
 expect(getObject(db,'signal',a.id)).toEqual(beforeA);expect(getObject(db,'signal',b.id)).toEqual(beforeB);
});
it('bin removes sole-origin signals and restores their evidence and shared origins',()=>{
 const d1=dump('One');const d2=dump('Two');const sole=signal(d1.id,'Sole','https://a.test/1');const shared=signal(d1.id,'Shared','https://a.test/2');
 tools.call('attachOrigin',{signalId:shared.id,dumpId:d2.id},agent);
 const t=tools.call('writeTheory',{claim:'Claim'},person) as any;tools.call('linkEvidence',{signalId:sole.id,theoryId:t.id,stance:'supports'},person);
 const before=getObject(db,'signal',sole.id);
 expect(tools.call('previewDeleteDump',{id:d1.id},person)).toMatchObject({signals:1,evidence:1});
 tools.call('deleteDump',{id:d1.id},person);expect((getDump(db,d1.id) as any).deleted_at).toBeTruthy();
 expect((getObject(db,'signal',shared.id) as any).origins).toHaveLength(1);
 tools.call('restoreDump',{id:d1.id},person);expect(getObject(db,'signal',sole.id)).toEqual(before);
 expect((getObject(db,'signal',shared.id) as any).origins).toHaveLength(2);
});
it('deduplicates normalised links and refuses discarded tombstones',()=>{
 const d1=dump('One');const d2=dump('Two');const s=signal(d1.id,'A thing','https://www.twitter.com/a/status/1?s=20&utm_source=x');
 expect(signal(d2.id,'New wording','https://x.com/a/status/1/').id).toBe(s.id);
 expect((getObject(db,'signal',s.id) as any).origins).toHaveLength(2);tools.call('discardSignal',{id:s.id},person);
 expect(()=>signal(d2.id,'Again','https://x.com/a/status/1')).toThrow('discarded');
});
it('accepts a challenge once; undo appends a restoring stance',()=>{
 const d=dump('Counterexample');const s=signal(d.id,'Memory withdrawn','https://a.test');const t=tools.call('writeTheory',{claim:'Memory persists'},person) as any;
 tools.call('setConfidence',{id:t.id,confidence:4},person);tools.call('setTripwire',{id:t.id,tripwire:'memory withdrawn'},person);
 const p=tools.call('proposeChallenge',{theoryId:t.id,signalId:s.id,why:'Memory withdrawn',tripwireVersion:1},agent) as any;
 tools.call('decideSuggestion',{id:p.id,decision:'accept'},person);tools.call('decideSuggestion',{id:p.id,decision:'accept'},person);
 expect((getObject(db,'theory',t.id) as any).confidence).toBe(3);
 tools.call('decideSuggestion',{id:p.id,decision:'undo'},person);
 expect(db.prepare('SELECT confidence,cause FROM stances ORDER BY rowid').all()).toEqual([{confidence:4,cause:'set'},{confidence:3,cause:'challenge_accepted'},{confidence:4,cause:'undo'}]);
});
it('restores Float32 embedding BLOBs from JSON bin and merge snapshots',()=>{
 const d=dump('Embedded signals');
 const a=tools.call('createSignal',{dumpId:d.id,gist:'Embedded finding',sources:[{url:'https://a.test/embedded'}],embedding:[0.1,0.2,0.3]},agent) as any;
 const b=tools.call('createSignal',{dumpId:d.id,gist:'Second embedded finding',sources:[{url:'https://b.test/embedded'}],embedding:[0.3,0.2,0.1]},agent) as any;
 const originalA=(db.prepare('SELECT embedding FROM signals WHERE id=?').get(a.id) as any).embedding;
 const originalB=(db.prepare('SELECT embedding FROM signals WHERE id=?').get(b.id) as any).embedding;
 const m=tools.call('mergeNearDuplicateSignals',{survivorId:a.id,absorbedId:b.id,reasoning:'Same finding'},agent) as any;
 tools.call('undoMerge',{id:m.id},person);
 expect((db.prepare('SELECT embedding FROM signals WHERE id=?').get(a.id) as any).embedding).toEqual(originalA);
 expect((db.prepare('SELECT embedding FROM signals WHERE id=?').get(b.id) as any).embedding).toEqual(originalB);
 tools.call('deleteDump',{id:d.id},person);tools.call('restoreDump',{id:d.id},person);
 expect((db.prepare('SELECT embedding FROM signals WHERE id=?').get(a.id) as any).embedding).toEqual(originalA);
 expect((db.prepare('SELECT embedding FROM signals WHERE id=?').get(b.id) as any).embedding).toEqual(originalB);
 expect(db.pragma('foreign_key_check')).toEqual([]);
});
it('purges only expired bin entries and returns orphaned media paths',()=>{
 const d=tools.call('captureDump',{text:'Audio',attachments:[{kind:'audio',path:'2026/10/note.m4a',mime:'audio/mp4',bytes:32,sha256:'abc'}]},person) as any;
 const retained=dump('Retained');signal(d.id,'Finding','https://a.test/purged');
 tools.call('deleteDump',{id:d.id},person);tools.call('deleteDump',{id:retained.id},person);
 db.prepare('UPDATE dumps SET purge_after=? WHERE id=?').run('2000-01-01T00:00:00.000Z',d.id);
 expect(()=>tools.call('restoreDump',{id:d.id},person)).toThrow('30-day');
 const removed=purgeBin(db);
 expect(removed).toMatchObject({dumps:1,paths:['2026/10/note.m4a']});
 expect(getDump(db,d.id)).toBeNull();expect(getDump(db,retained.id)).not.toBeNull();
 expect(db.prepare('SELECT COUNT(*) n FROM media').get()).toEqual({n:0});
 expect(db.pragma('foreign_key_check')).toEqual([]);
});
it('purging a merged sole-origin signal cannot revive its absorbed signal without provenance',()=>{
 const d=dump('Two reports');const a=signal(d.id,'One','https://a.test/sole');const b=signal(d.id,'Another','https://b.test/sole');
 tools.call('mergeNearDuplicateSignals',{survivorId:a.id,absorbedId:b.id,reasoning:'Same event'},agent);
 tools.call('deleteDump',{id:d.id},person);db.prepare('UPDATE dumps SET purge_after=? WHERE id=?').run('2000-01-01T00:00:00.000Z',d.id);
 purgeBin(db);
 expect(db.prepare('SELECT COUNT(*) n FROM signals').get()).toEqual({n:0});
 expect(db.pragma('foreign_key_check')).toEqual([]);
});
