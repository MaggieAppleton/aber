import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { seed } from '../seed.js';
import { createTools } from './index.js';
import { getObject, getWorld } from './queries.js';

let db: Database;
let tools: ReturnType<typeof createTools>;
const person = { kind: 'person' as const, id: 'maggie' };
const frozen = '2026-11-01T12:00:00.000Z';
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(frozen)); db = createDatabase(); migrate(db); seed(db); tools = createTools(db); });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); db.close(); });
const read = (name: string, input = {}, owner = 'maggie') => tools.call(name, input, { kind: 'person', id: owner });
const objects = (kind: string, ids: string[], owner = 'maggie') => ids.map(id => getObject(db, kind, id, owner));
function addUnrelatedHistory() {
  const dumps = db.prepare("INSERT INTO dumps(id,owner_id,text,captured_at,captured_from,status,created_at,created_by,updated_at,updated_by) VALUES(?,'maggie','Unrelated old material',?,'web','done',?,'person:maggie',?,'person:maggie')");
  const jobs = db.prepare("INSERT INTO jobs(id,kind,payload_json,status,run_after,created_at) VALUES(?,'process_dump',?,'done',?,?)");
  const runs = db.prepare("INSERT INTO agent_runs(id,job_id,job,provider,model,prompt_version,status,started_at,trace_json) VALUES(?,?,'process_dump','fake','fixture','v1','done',?,?)");
  const replies = db.prepare("INSERT INTO replies(id,owner_id,dump_id,run_id,parts_json,created_at) VALUES(?,'maggie',?,?,'[]',?)");
  db.transaction(() => {
    for (let index = 0; index < 100; index++) {
      const id = `unrelated-${index}`;
      dumps.run(id, frozen, frozen, frozen); jobs.run(id, JSON.stringify({ dumpId: id }), frozen, frozen);
      runs.run(id, id, frozen, JSON.stringify([{ text: 'Unrelated completed trace. '.repeat(1_000) }])); replies.run(id, id, id, frozen);
    }
  })();
}

it.each([
  ['listThemes', {}], ['listTheories', {}],
  ['similarSignals', { text: 'memory', limit: 8 }],
  ['lookupSignals', { urls: ['https://x.com/aber/seed-s1'] }],
] as const)('%s has identical results and query cost after unrelated dump/run history grows', (name, input) => {
  const prepare = vi.spyOn(db, 'prepare');
  const before = read(name, input), beforeQueries = prepare.mock.calls.map(([sql]) => sql);
  addUnrelatedHistory(); prepare.mockClear();
  const after = read(name, input), afterQueries = prepare.mock.calls.map(([sql]) => sql);
  expect(after).toEqual(before);
  expect(afterQueries.length).toBe(beforeQueries.length);
  // Signal provenance may join dump text and capture time. Full dump/reply/run projections are unrelated.
  expect(afterQueries.filter(sql => /\b(?:FROM|JOIN)\s+(?:replies|agent_runs|transcripts|dump_attachments)\b|\bSELECT\s+\*\s+FROM\s+dumps\b/i.test(sql))).toEqual([]);
});

it('preserves owner, retirement, active filters and creation order with complete pane projections', () => {
  db.prepare("UPDATE themes SET status='retired' WHERE id='identity'").run();
  db.prepare("UPDATE themes SET discarded_at=? WHERE id='funding'").run(frozen);
  db.prepare("UPDATE themes SET merged_into_id='cost' WHERE id='personal'").run();
  db.prepare("UPDATE themes SET owner_id='alice' WHERE id='interfaces'").run();
  db.prepare("UPDATE theories SET status='retired' WHERE id='t2'").run();
  db.prepare("UPDATE theories SET discarded_at=? WHERE id='d2'").run(frozen);
  db.prepare("UPDATE theories SET merged_into_id='t1' WHERE id='d3'").run();
  db.prepare("UPDATE theories SET owner_id='alice' WHERE id='t6'").run();
  db.prepare("UPDATE signals SET discarded_at=? WHERE id='s11'").run(frozen);
  db.prepare("UPDATE signals SET merged_into_id='s1' WHERE id='s10'").run();
  db.prepare("UPDATE signals SET deleted_by_dump_id='D5' WHERE id='s13'").run();
  db.prepare("UPDATE signals SET owner_id='alice' WHERE id='s12'").run();
  const themes = objects('theme', ['cost', 'memory', 'review', 'identity']);
  const theories = objects('theory', ['t1', 't2', 't3', 't4', 't5', 't7', 'd1']);
  expect(read('listThemes')).toEqual(themes); expect(read('listTheories')).toEqual(theories);
  expect(read('listThemes', { status: 'retired', limit: 1 })).toEqual(objects('theme', ['identity']));
  expect(read('listTheories', { status: 'retired', themeId: 'cost', limit: 1 })).toEqual(objects('theory', ['t2']));
  expect(read('listThemes', {}, 'alice')).toEqual(objects('theme', ['interfaces'], 'alice'));
  expect(read('listTheories', {}, 'alice')).toEqual(objects('theory', ['t6'], 'alice'));
  const world = getWorld(db);
  expect(world.themes).toEqual(themes); expect(world.theories).toEqual(theories);
  expect(world.signals.map((signal: { id: string }) => signal.id)).toEqual(['s1', 's2', 's4', 's5', 's7', 's3', 's6', 's8', 's9']);
  expect(world.signals).toEqual(objects('signal', ['s1', 's2', 's4', 's5', 's7', 's3', 's6', 's8', 's9']));
});

it('preserves signal ranking, normalized exact matches, aliases and nested evidence/origins', () => {
  for (const [id, vector] of [['s1', [1, 0]], ['s2', [0, 1]], ['s3', [1, 1]]] as const) db.prepare('UPDATE signals SET embedding=? WHERE id=?').run(Buffer.from(new Float32Array(vector).buffer), id);
  const ranked = read('similarSignals', { text: 'unrelated', embedding: [1, 0], urls: ['https://www.x.com/aber/seed-s1/?utm_source=test'], limit: 2 });
  expect(ranked.map((signal: { id: string }) => signal.id)).toEqual(['s1', 's3']);
  expect(ranked[0]).toEqual({ ...getObject(db, 'signal', 's1'), exactMatch: true, similarity: 1 });
  expect(ranked[1]).toEqual({ ...getObject(db, 'signal', 's3'), exactMatch: false, similarity: 1 / Math.sqrt(2) });
  expect(ranked[0]).toMatchObject({ owner_id: 'maggie', ownerId: 'maggie', sources: [expect.objectContaining({ url_normalised: 'https://x.com/aber/seed-s1', urlNormalised: 'https://x.com/aber/seed-s1' })], origins: [expect.objectContaining({ dump_id: 'D1', dumpId: 'D1' })], evidence: [expect.objectContaining({ theory: 't1', stance: 'supports' })] });
  const tombstone = { id: 'discarded-url', owner_id: 'maggie', signal_id: 's11', url_normalised: 'https://example.org/gone', gist: 'A discarded fact', created_at: frozen };
  db.prepare('INSERT INTO tombstones(id,owner_id,signal_id,url_normalised,gist,created_at) VALUES(@id,@owner_id,@signal_id,@url_normalised,@gist,@created_at)').run(tombstone);
  expect(read('lookupSignals', { urls: ['https://www.x.com/aber/seed-s1/?utm_source=test', 'https://example.org/gone'], gist: 'A DISCARDED FACT' })).toEqual({ exactMatches: objects('signal', ['s1']), tombstones: [expect.objectContaining(tombstone)] });
});

it('keeps theory relevance on claim/body and tripwire relevance on held conditions', () => {
  db.prepare("UPDATE theories SET tripwire=''").run();
  db.prepare("UPDATE theories SET claim='Zircon routine work',body='Routine work',tripwire='Privacy complaints' WHERE id='t1'").run();
  db.prepare("UPDATE theories SET claim='Other claim',body='Zircon routine work',tripwire='Privacy' WHERE id='t2'").run();
  db.prepare("UPDATE theories SET tripwire='Privacy complaints' WHERE id IN ('d1','t3')").run();
  db.prepare("UPDATE theories SET status='retired' WHERE id='t3'").run();
  expect(read('similarTheories', { text: 'zircon', limit: 2 })).toEqual([
    { ...getObject(db, 'theory', 't1'), similarity: 1 / Math.sqrt(3) },
    { ...getObject(db, 'theory', 't2'), similarity: 1 / Math.sqrt(5) },
  ]);
  expect(read('listTripwires', { text: 'privacy complaints', limit: 5 })).toEqual([
    { ...getObject(db, 'theory', 't1'), similarity: 1 },
    { ...getObject(db, 'theory', 't2'), similarity: 1 / Math.sqrt(2) },
  ]);
});
