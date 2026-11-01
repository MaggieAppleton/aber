import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools } from './index.js';
import { AuthorityError } from './authority.js';
const person = { kind: 'person', id: 'maggie' } as const;
const agent = { kind: 'agent', job: 'process_dump', runId: 'run1' } as const;
let db: Database; let tools: ReturnType<typeof createTools>;
beforeEach(() => {
 db = createDatabase(); migrate(db); tools = createTools(db);
 db.prepare("INSERT INTO people(id,name,created_at) VALUES('maggie','Maggie',?)").run(new Date().toISOString());
 for (const id of ['run1','run2']) db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES(?,'process_dump','fake','fake','v1','running',?)").run(id,new Date().toISOString());
});
afterEach(() => db.close());
describe('authority and audit', () => {
 it('rejects person tools for agents without events or partial writes', () => {
  const theory = tools.call('writeTheory', { claim: 'A claim' }, person) as any;
  expect(() => tools.call('setConfidence', { id: theory.id, confidence: 4 }, agent)).toThrow(AuthorityError);
  expect(() => tools.call('editTheory', { id: theory.id, claim: 'Agent wording' }, agent)).toThrow(AuthorityError);
  expect(db.prepare('SELECT COUNT(*) n FROM stances').get()).toEqual({ n: 0 });
  expect(db.prepare('SELECT COUNT(*) n FROM events').get()).toEqual({ n: 1 });
 });
 it('edits only this agent run’s own drafts', () => {
  const draft = tools.call('createDraftTheory', { claim: 'An agent claim' }, agent) as any;
  tools.call('editDraftTheory', { id: draft.id, body: 'Own draft' }, agent);
  expect(() => tools.call('editDraftTheory', { id: draft.id, body: 'Other run' }, { ...agent, runId: 'run2' })).toThrow(AuthorityError);
  tools.call('acceptDraft', { kind: 'theory', id: draft.id }, person);
  expect(() => tools.call('editDraftTheory', { id: draft.id, body: 'After acceptance' }, agent)).toThrow(AuthorityError);
 });
 it('validates inputs, records actor, and makes creation idempotent per run', () => {
  expect(() => tools.call('writeTheory', { claim: '' }, person)).toThrow();
  const a = tools.call('createDraftTheory', { claim: 'The same claim' }, agent) as any;
  const b = tools.call('createDraftTheory', { claim: 'The same claim' }, agent) as any;
  expect(b.id).toBe(a.id);
  expect(db.prepare('SELECT actor,tool,run_id FROM events').all()).toEqual([{ actor:'agent:process_dump:run1',tool:'createDraftTheory',run_id:'run1' }]);
 });
 it('enforces append-only stances in SQLite', () => {
  const t = tools.call('writeTheory', { claim: 'Claim' }, person) as any;
  tools.call('setConfidence', { id:t.id, confidence:4 }, person);
  expect(() => db.prepare('UPDATE stances SET confidence=1').run()).toThrow('append-only');
  expect(() => db.prepare('DELETE FROM stances').run()).toThrow('append-only');
 });
});
it('denies every person-only registry tool to an agent before input parsing',()=>{
 for(const [name,definition] of Object.entries(tools.definitions))if(definition.who==='person')expect(()=>tools.call(name,{},agent),name).toThrow(AuthorityError);
});
it('links evidence only to the agent’s own draft and keeps held theory changes as proposals',()=>{
 const d=tools.call('captureDump',{text:'An observation'},person) as any;
 const s=tools.call('createSignal',{dumpId:d.id,gist:'Observed',sources:[{ownObservation:true}]},agent) as any;
 const draft=tools.call('createDraftTheory',{claim:'A draft'},agent) as any;const held=tools.call('writeTheory',{claim:'A held claim'},person) as any;
 tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports'},agent);
 expect(()=>tools.call('linkEvidence',{theoryId:held.id,signalId:s.id,stance:'supports'},agent)).toThrow(AuthorityError);
 tools.call('proposeEvidence',{theoryId:held.id,signalId:s.id,stance:'supports',reasoning:'Relevant observation'},agent);
 expect((db.prepare('SELECT COUNT(*) n FROM evidence WHERE theory_id=?').get(held.id) as any).n).toBe(0);
 expect((db.prepare('SELECT COUNT(*) n FROM suggestions WHERE target_id=?').get(held.id) as any).n).toBe(1);
});
