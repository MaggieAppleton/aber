import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools } from './index.js';

let db: Database;
let tools: ReturnType<typeof createTools>;
const person = { kind: 'person' as const, id: 'maggie' };
beforeEach(() => {
  db = createDatabase(); migrate(db); tools = createTools(db);
  db.prepare('INSERT OR IGNORE INTO people(id,name,created_at) VALUES(?,?,?)').run('maggie', 'Maggie', new Date().toISOString());
});
afterEach(() => db.close());

it('replays a committed confidence command without another stance or event', () => {
  const theory = tools.call('writeTheory', { claim: 'A personal theory' }, person);
  let events = 0;
  tools.subscribe(event => { if (event.tool === 'setConfidence') events++; });
  const input = { id: theory.id, confidence: 4, note: 'My reasoning', commandId: 'one-personal-edit' };
  // The first write commits, but the client loses its acknowledgement.
  tools.call('setConfidence', input, person);
  const replay = tools.call('setConfidence', input, person);
  expect(replay.stances.map((stance: { confidence: number }) => stance.confidence)).toEqual([4]);
  expect(events).toBe(1);
});

it('returns current theory state when an older command is replayed after newer edits', () => {
  const theory = tools.call('writeTheory', { claim: 'A personal theory' }, person);
  const original = { id: theory.id, confidence: 4, commandId: 'first-edit' };
  tools.call('setConfidence', original, person);
  tools.call('setConfidence', { id: theory.id, confidence: 2, commandId: 'later-edit' }, person);
  tools.call('editTheory', { id: theory.id, claim: 'My revised claim' }, person);
  const replay = tools.call('setConfidence', { ...original, note: '' }, person);
  expect(replay).toMatchObject({ confidence: 2, claim: 'My revised claim' });
  expect(replay.stances.map((stance: { confidence: number }) => stance.confidence)).toEqual([4, 2]);
});

it.each([{ confidence: 2 }, { note: 'Different reasoning' }])('rejects changed payload on a reused command: %j', change => {
  const theory = tools.call('writeTheory', { claim: 'A personal theory' }, person);
  const input = { id: theory.id, confidence: 4, note: 'My reasoning', commandId: 'one-edit' };
  tools.call('setConfidence', input, person);
  expect(() => tools.call('setConfidence', { ...input, ...change }, person)).toThrow('already used with different values');
  expect(tools.call('getTheory', { id: theory.id }, person).stances).toHaveLength(1);
});

it('keeps distinct commands and unkeyed reaffirmations as separate deliberate stances', () => {
  const theory = tools.call('writeTheory', { claim: 'A personal theory' }, person);
  const input = { id: theory.id, confidence: 4 };
  tools.call('setConfidence', { ...input, commandId: 'first-edit' }, person);
  tools.call('setConfidence', { ...input, commandId: 'second-edit' }, person);
  tools.call('setConfidence', input, person);
  const last = tools.call('setConfidence', input, person);
  expect(last.stances.map((stance: { confidence: number }) => stance.confidence)).toEqual([4, 4, 4, 4]);
});

it('scopes a command identity to its person, owner and theory', () => {
  const alice = { kind: 'person' as const, id: 'alice' };
  db.prepare('INSERT OR IGNORE INTO people(id,name,created_at,owner_id) VALUES(?,?,?,?)').run('alice', 'Alice', new Date().toISOString(), 'alice');
  const first = tools.call('writeTheory', { claim: 'First theory' }, person);
  const second = tools.call('writeTheory', { claim: 'Second theory' }, person);
  const other = tools.call('writeTheory', { claim: 'Another owner theory' }, alice);
  for (const [theory, author] of [[first, person], [second, person], [other, alice]] as const) {
    const input = { id: theory.id, confidence: 4, commandId: 'same-opaque-id' };
    tools.call('setConfidence', input, author);
    expect(tools.call('setConfidence', input, author).stances).toHaveLength(1);
  }
  expect(() => tools.call('setConfidence', { id: first.id, confidence: 4, commandId: 'same-opaque-id' }, alice)).toThrow('not found');
});

it('does not make the confidence command available to agents', () => {
  const theory = tools.call('writeTheory', { claim: 'A personal theory' }, person);
  expect(() => tools.call('setConfidence', { id: theory.id, confidence: 4, commandId: 'agent-command' }, { kind: 'agent', job: 'chat', runId: 'unregistered' })).toThrow('person-only');
  expect(tools.call('getTheory', { id: theory.id }, person).stances).toEqual([]);
});

it('accepts bounded opaque command identities and rejects invalid lengths', () => {
  const theory = tools.call('writeTheory', { claim: 'A personal theory' }, person);
  const input = { id: theory.id, confidence: 4 };
  for (const commandId of ['', 'x'.repeat(129)]) expect(() => tools.call('setConfidence', { ...input, commandId }, person)).toThrow();
  tools.call('setConfidence', { ...input, commandId: 'x'.repeat(128) }, person);
  expect(tools.call('setConfidence', { ...input, commandId: 'x'.repeat(128) }, person).stances).toHaveLength(1);
});
