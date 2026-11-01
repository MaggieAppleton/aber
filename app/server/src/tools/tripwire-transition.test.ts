import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools } from './index.js';

let db: Database;
let tools: ReturnType<typeof createTools>;
const person = { kind: 'person' as const, id: 'maggie' };
const agent = { kind: 'agent' as const, job: 'process_dump', runId: 'tripwire-draft' };
beforeEach(() => {
  db = createDatabase(); migrate(db); tools = createTools(db);
  db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES(?,?,?,?,?,?,?)")
    .run(agent.runId, agent.job, 'fake', 'fixture', 'v1', 'done', new Date().toISOString());
});
afterEach(() => db.close());
const jobs = () => (db.prepare("SELECT payload_json FROM jobs WHERE kind='tripwire' ORDER BY rowid").all() as { payload_json: string }[]).map(row => JSON.parse(row.payload_json));

it('schedules each held tripwire version whether created, edited or set directly', () => {
  const theory = tools.call('writeTheory', { claim: 'A held claim', tripwire: 'The first replication fails' }, person);
  expect(jobs()).toEqual([{ theoryId: theory.id, tripwireVersion: 1 }]);
  tools.call('editTheory', { id: theory.id, tripwire: 'The second replication fails' }, person);
  expect(jobs()).toEqual([{ theoryId: theory.id, tripwireVersion: 1 }, { theoryId: theory.id, tripwireVersion: 2 }]);
  tools.call('setTripwire', { id: theory.id, tripwire: 'The third replication fails' }, person);
  expect(jobs()).toEqual([{ theoryId: theory.id, tripwireVersion: 1 }, { theoryId: theory.id, tripwireVersion: 2 }, { theoryId: theory.id, tripwireVersion: 3 }]);
});

it.each(['acceptDraft', 'rephraseDraft'])('activates a drafted tripwire on %s exactly once', action => {
  const draft = tools.call('createDraftTheory', { claim: 'A drafted claim', tripwire: 'The first replication fails' }, agent);
  tools.call('editDraftTheory', { id: draft.id, tripwire: 'A corrected replication fails' }, agent);
  expect(jobs()).toEqual([]);
  const held = tools.call(action, { id: draft.id, kind: 'theory', claim: 'A personal rephrase' }, person);
  expect(held.status).toBe('held');
  expect(jobs()).toEqual([{ theoryId: draft.id, tripwireVersion: 2 }]);
  tools.call('setTripwire', { id: draft.id, tripwire: 'A corrected replication fails' }, person);
  expect(jobs()).toEqual([{ theoryId: draft.id, tripwireVersion: 2 }]);
});

it('skips empty, unchanged, retired and still-draft tripwires', () => {
  const held = tools.call('writeTheory', { claim: 'No tripwire yet' }, person);
  tools.call('setTripwire', { id: held.id, tripwire: '' }, person);
  tools.call('editTheory', { id: held.id, body: 'Only the body changed' }, person);
  const draft = tools.call('createDraftTheory', { claim: 'Draft condition', tripwire: 'A replication fails' }, agent);
  tools.call('setTripwire', { id: draft.id, tripwire: 'A second replication fails' }, person);
  tools.call('retireTheory', { id: held.id, reason: 'abandoned' }, person);
  tools.call('setTripwire', { id: held.id, tripwire: 'A retired condition' }, person);
  expect(jobs()).toEqual([]);
});

it('does not create work for an unchanged held condition or a cleared condition', () => {
  const held = tools.call('writeTheory', { claim: 'An existing condition' }, person);
  tools.call('setTripwire', { id: held.id, tripwire: 'A replication fails' }, person);
  const job = db.prepare("SELECT id FROM jobs WHERE kind='tripwire'").get() as { id: string };
  db.prepare("UPDATE jobs SET status='done' WHERE id=?").run(job.id);
  tools.call('editTheory', { id: held.id, tripwire: 'A replication fails', body: 'Later body' }, person);
  tools.call('setTripwire', { id: held.id, tripwire: 'A replication fails' }, person);
  tools.call('setTripwire', { id: held.id, tripwire: '' }, person);
  expect(jobs()).toEqual([{ theoryId: held.id, tripwireVersion: 1 }]);
});
