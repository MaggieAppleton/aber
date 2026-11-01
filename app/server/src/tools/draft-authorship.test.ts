import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools } from './index.js';

let db: Database;
let tools: ReturnType<typeof createTools>;
const person = { kind: 'person' as const, id: 'maggie' };
const agent = { kind: 'agent' as const, job: 'process_dump', runId: 'draft-authorship' };
beforeEach(() => {
  db = createDatabase(); migrate(db); tools = createTools(db);
  db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES(?,?,?,?,?,?,?)")
    .run(agent.runId, agent.job, 'fake', 'fixture', 'v1', 'done', new Date().toISOString());
});
afterEach(() => db.close());

it('keeps agent authorship when a draft is accepted in the agent wording', () => {
  const draft = tools.call('createDraftTheory', { claim: 'An agent claim' }, agent);
  tools.call('editDraftTheory', { id: draft.id, claim: 'An agent revision' }, agent);
  expect(tools.call('acceptDraft', { kind: 'theory', id: draft.id }, person).authorship).toBe('agent');
});

it('records rephrased authorship when the person edited the draft before accepting it', () => {
  const draft = tools.call('createDraftTheory', { claim: 'An agent claim' }, agent);
  tools.call('editTheory', { id: draft.id, claim: 'My own wording' }, person);
  const held = tools.call('acceptDraft', { kind: 'theory', id: draft.id }, person);
  expect(held.claim).toBe('My own wording');
  expect(held.authorship).toBe('rephrased');
});

it('keeps agent authorship when the person edits a draft back to the agent wording', () => {
  const draft = tools.call('createDraftTheory', { claim: 'An agent claim' }, agent);
  tools.call('editTheory', { id: draft.id, claim: 'A passing thought' }, person);
  tools.call('editTheory', { id: draft.id, claim: 'An agent claim' }, person);
  expect(tools.call('acceptDraft', { kind: 'theory', id: draft.id }, person).authorship).toBe('agent');
});
