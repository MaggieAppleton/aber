import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools } from './index.js';
import { getObject } from './queries.js';

const person = { kind: 'person', id: 'maggie' } as const;
const agent = { kind: 'agent', job: 'process_dump', runId: 'revision-test' } as const;
let db: Database;
let tools: ReturnType<typeof createTools>;
beforeEach(() => {
  db = createDatabase(); migrate(db); tools = createTools(db);
  db.prepare("INSERT INTO people(id,name,created_at) VALUES('maggie','Maggie',?)").run(new Date().toISOString());
  db.prepare('INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES(?,?,?,?,?,?,?)')
    .run(agent.runId, agent.job, 'fake', 'fake', 'v1', 'running', new Date().toISOString());
});
afterEach(() => db.close());

function propose() {
  const theory = tools.call('createDraftTheory', { claim: 'Original claim', body: 'Original body' }, agent) as any;
  tools.call('acceptDraft', { kind: 'theory', id: theory.id }, person);
  const suggestion = tools.call('proposeRevision', { theoryId: theory.id, claim: 'Proposed claim', bodyInsert: 'Proposed addition' }, agent) as any;
  return { theory, suggestion };
}

it('records manual revision wording as rephrased and restores authorship on undo', () => {
  const { theory, suggestion } = propose();
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'rephrase', claim: 'My claim', bodyInsert: 'My addition' }, person);
  expect(getObject(db, 'theory', theory.id)).toMatchObject({ claim: 'My claim', body: 'Original body\n\nMy addition', authorship: 'rephrased' });
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'undo' }, person);
  expect(getObject(db, 'theory', theory.id)).toMatchObject({ claim: 'Original claim', body: 'Original body', authorship: 'agent' });
});

it('preserves authorship when accepting unchanged proposed wording, even if explicitly supplied', () => {
  const { theory, suggestion } = propose();
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'accepted', claim: 'Proposed claim', bodyInsert: 'Proposed addition' }, person);
  expect(getObject(db, 'theory', theory.id)).toMatchObject({ claim: 'Proposed claim', body: 'Original body\n\nProposed addition', authorship: 'agent' });
});

it('tracks a manually overridden full body as rephrased', () => {
  const theory = tools.call('writeTheory', { claim: 'My original claim', body: 'My original body' }, person) as any;
  const suggestion = tools.call('proposeRevision', { theoryId: theory.id, body: 'Proposed replacement' }, agent) as any;
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'accepted', body: 'My revised body' }, person);
  expect(getObject(db, 'theory', theory.id)).toMatchObject({ body: 'My revised body', authorship: 'rephrased' });
});

it('undoes only the revision while preserving later body, horizon and tripwire edits', () => {
  const theory = tools.call('writeTheory', { claim: 'Original', body: 'Original body', horizon: 2030, tripwire: 'Old tripwire' }, person) as any;
  const suggestion = tools.call('proposeRevision', { theoryId: theory.id, claim: 'Proposed' }, agent) as any;
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'accepted' }, person);
  tools.call('setHorizon', { id: theory.id, horizon: 2040 }, person);
  tools.call('setTripwire', { id: theory.id, tripwire: 'Later tripwire' }, person);
  tools.call('editTheory', { id: theory.id, body: 'Later body' }, person);
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'undo' }, person);
  expect(getObject(db, 'theory', theory.id)).toMatchObject({ claim: 'Original', body: 'Later body', horizon: 2040, tripwire: 'Later tripwire', tripwire_version: 2 });
});

it('preserves later wording in a field that the revision changed', () => {
  const { theory, suggestion } = propose();
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'accepted' }, person);
  tools.call('editTheory', { id: theory.id, claim: 'Later personal claim' }, person);
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'undo' }, person);
  expect(getObject(db, 'theory', theory.id)).toMatchObject({ claim: 'Later personal claim', body: 'Original body' });
});

it('preserves a later theme rename when undoing its revision', () => {
  const theme = tools.call('writeTheme', { name: 'Original theme' }, person) as any;
  const suggestion = tools.call('proposeRevision', { themeId: theme.id, name: 'Proposed theme' }, agent) as any;
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'accepted' }, person);
  tools.call('renameTheme', { id: theme.id, name: 'Later theme name' }, person);
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'undo' }, person);
  expect(getObject(db, 'theme', theme.id)).toMatchObject({ name: 'Later theme name' });
});

function evidenceProposal(existing = false) {
  const dump = tools.call('captureDump', { text: 'Finding' }, person) as any;
  const signal = tools.call('createSignal', { dumpId: dump.id, gist: 'Finding' }, agent) as any;
  const theory = tools.call('writeTheory', { claim: 'Theory' }, person) as any;
  const pair = { theoryId: theory.id, signalId: signal.id };
  if (existing) tools.call('linkEvidence', { ...pair, stance: 'undermines', note: 'Original decision' }, person);
  const suggestion = tools.call('proposeEvidence', { ...pair, stance: 'supports', note: 'Proposed evidence' }, agent) as any;
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'accepted' }, person);
  return { pair, suggestion, theory };
}

it('preserves a later evidence decision when undoing a proposal', () => {
  const { pair, suggestion, theory } = evidenceProposal();
  tools.call('linkEvidence', { ...pair, stance: 'undermines', note: 'Later decision' }, person);
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'undo' }, person);
  expect(getObject(db, 'theory', theory.id)?.evidence).toContainEqual(expect.objectContaining({ stance: 'undermines', note: 'Later decision' }));
});

it('does not resurrect evidence a person unlinked after acceptance', () => {
  const { pair, suggestion, theory } = evidenceProposal(true);
  tools.call('unlinkEvidence', pair, person);
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'undo' }, person);
  expect(getObject(db, 'theory', theory.id)?.evidence).toEqual([]);
});

it('restores the prior evidence when no later decision has changed the accepted edge', () => {
  const { suggestion, theory } = evidenceProposal(true);
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'undo' }, person);
  expect(getObject(db, 'theory', theory.id)?.evidence).toContainEqual(expect.objectContaining({ stance: 'undermines', note: 'Original decision' }));
});

it('respects a later explicit evidence decision even when its wording is identical', () => {
  const { pair, suggestion, theory } = evidenceProposal(true);
  tools.call('linkEvidence', { ...pair, stance: 'supports', note: 'Proposed evidence' }, person);
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'undo' }, person);
  expect(getObject(db, 'theory', theory.id)?.evidence).toContainEqual(expect.objectContaining({ stance: 'supports', note: 'Proposed evidence' }));
});

it('uses an explicit full-body rephrase instead of the proposed insertion', () => {
  const { theory, suggestion } = propose();
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'rephrase', body: 'My complete replacement' }, person);
  expect(getObject(db, 'theory', theory.id)).toMatchObject({ body: 'My complete replacement', authorship: 'rephrased' });
  tools.call('decideSuggestion', { id: suggestion.id, decision: 'undo' }, person);
  expect(getObject(db, 'theory', theory.id)).toMatchObject({ body: 'Original body', authorship: 'agent' });
});
