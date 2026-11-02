import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools, purgeBin } from './index.js';
import { getDump, getObject, getWorld } from './queries.js';

const person = { kind: 'person', id: 'maggie' } as const;
const agent = { kind: 'agent', job: 'process_dump', runId: 'bin-merge' } as const;
let db: Database;
let tools: ReturnType<typeof createTools>;
beforeEach(() => {
  db = createDatabase(); migrate(db); tools = createTools(db);
  db.prepare("INSERT OR IGNORE INTO people(id,name,created_at) VALUES('maggie','Maggie',?)").run(new Date().toISOString());
  db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES('bin-merge','process_dump','fake','fake','v1','running',?)").run(new Date().toISOString());
});
afterEach(() => db.close());
const dump = (text: string) => tools.call('captureDump', { text }, person) as any;
const signal = (dumpId: string, gist: string) => tools.call('createSignal', { dumpId, gist, sources: [{ url: `https://${gist}.test/` }] }, agent) as any;
const merge = (survivorId: string, absorbedId: string) => tools.call('mergeNearDuplicateSignals', { survivorId, absorbedId, reasoning: 'Same finding' }, person) as any;
const bin = (id: string) => tools.call('deleteDump', { id }, person);
const restore = (id: string) => tools.call('restoreDump', { id }, person);
const origins = (id: string) => getObject(db, 'signal', id)!.origins.map((o: any) => o.dump_id).sort();
function fixture(removed = false) {
  const d1 = dump('Original A'), d2 = dump('Repeat A'), d3 = dump('B');
  const a = signal(d1.id, 'a'), b = signal(d3.id, 'b');
  tools.call('attachOrigin', { signalId: a.id, dumpId: d2.id }, agent);
  bin(d1.id);
  if (removed) { bin(d2.id); restore(d1.id); }
  const merged = merge(b.id, a.id);
  return { d1, d2, d3, a, b, merged, restoring: removed ? d2 : d1 };
}

for (const removed of [false, true]) {
  it(`routes ${removed ? 'removed snapshots' : 'detached origins'} to the survivor and retains the finding after other dumps expire`, () => {
    const { d1, d2, d3, a, b, restoring } = fixture(removed);
    restore(restoring.id);
    expect(origins(b.id)).toEqual([d1.id, d2.id, d3.id].sort());
    expect(origins(a.id)).toEqual([]);
    expect(getDump(db, restoring.id)!.signals.map((s: any) => s.id)).toEqual([b.id]);
    for (const d of [d1, d2, d3]) if (d.id !== restoring.id) bin(d.id);
    expect(getWorld(db).signals.map((s: any) => s.id)).toEqual([b.id]);
    expect(purgeBin(db, new Date(Date.now() + 31 * 86400000).toISOString()).dumps).toBe(2);
    expect(getWorld(db).signals.map((s: any) => s.id)).toEqual([b.id]);
    expect(origins(b.id)).toEqual([restoring.id]);
    expect(db.pragma('foreign_key_check')).toEqual([]);
  });
}

it('follows a chain of merges and preserves the restored origin when those merges are undone', () => {
  const { d1, d2, d3, a, b, merged } = fixture();
  const d4 = dump('C'), c = signal(d4.id, 'c');
  const later = merge(c.id, b.id);
  restore(d1.id);
  expect(origins(c.id)).toEqual([d1.id, d2.id, d3.id, d4.id].sort());
  tools.call('undoMerge', { id: later.id }, person);
  tools.call('undoMerge', { id: merged.id }, person);
  expect(getWorld(db).signals).toHaveLength(3);
  // An origin restored after the merges stays on the destination the restore exposed.
  expect(origins(c.id)).toEqual([d1.id, d4.id].sort());
  expect(origins(b.id)).toEqual([d3.id]);
  expect(origins(a.id)).toEqual([d2.id]);
  expect(db.pragma('foreign_key_check')).toEqual([]);
});

it('restores a binned merge survivor from its own snapshot before attaching the returning origin', () => {
  const { d1, d2, d3, a, b } = fixture();
  bin(d2.id); bin(d3.id);
  restore(d1.id);
  expect(getWorld(db).signals.map((s: any) => s.id)).toEqual([b.id]);
  expect(origins(b.id)).toEqual([d1.id]);
  expect(origins(a.id)).toEqual([]);
  expect(getObject(db, 'signal', b.id)!.sources.map((s: any) => s.url).sort()).toEqual(['https://a.test/', 'https://b.test/']);
});

it('does not replay removed-snapshot evidence or filings over later survivor decisions', () => {
  const d1 = dump('Original A'), d2 = dump('Repeat A'), d3 = dump('B');
  const a = signal(d1.id, 'a'), b = signal(d3.id, 'b');
  const theme = tools.call('writeTheme', { name: 'Area' }, person) as any;
  const theory = tools.call('writeTheory', { claim: 'Claim' }, person) as any;
  tools.call('attachOrigin', { signalId: a.id, dumpId: d2.id }, agent);
  tools.call('fileSignal', { signalId: a.id, themeId: theme.id }, person);
  tools.call('linkEvidence', { signalId: a.id, theoryId: theory.id, stance: 'supports' }, person);
  bin(d1.id); bin(d2.id); restore(d1.id); merge(b.id, a.id);
  tools.call('unfileSignal', { signalId: b.id, themeId: theme.id }, person);
  tools.call('unlinkEvidence', { signalId: b.id, theoryId: theory.id }, person);
  restore(d2.id);
  expect(getObject(db, 'signal', b.id)!.themes).toEqual([]);
  expect(getObject(db, 'signal', b.id)!.evidence).toEqual([]);
  expect(getObject(db, 'signal', a.id)!.themes).toEqual([]);
  expect(getObject(db, 'signal', a.id)!.evidence).toEqual([]);
});

it('rejects an invalid merge cycle without changing the dump, relations, or events', () => {
  const { d1, a, b } = fixture();
  db.prepare('UPDATE signals SET merged_into_id=? WHERE id=?').run(a.id, b.id);
  const tables = ['dumps', 'signals', 'signal_origins', 'signal_sources', 'events', 'jobs'];
  const before = tables.map(table => db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all());
  expect(() => restore(d1.id)).toThrow('merge chain');
  expect(tables.map(table => db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())).toEqual(before);
});
