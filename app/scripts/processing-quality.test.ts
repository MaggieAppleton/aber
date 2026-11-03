import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createDatabase, migrate, type Database } from '../server/src/db/index.js';
import { createTools } from '../server/src/tools/index.js';
import { processingQualityReport, readProcessingQuality, reviewOptions } from './processing-quality.js';

const databases: Database[] = [];
afterEach(() => { for (const db of databases.splice(0)) db.close(); vi.unstubAllGlobals(); });
function setup(path?: string) {
  const db = createDatabase(path); databases.push(db); migrate(db);
  db.prepare('INSERT INTO people(id,name,created_at) VALUES(?,?,?)').run('maggie', 'Maggie', '2026-11-03');
  const tools = createTools(db);
  const capture = (text: string) => {
    const dump = tools.call('captureDump', { text }, { kind: 'person', id: 'maggie' }) as { id: string };
    db.prepare("UPDATE dumps SET status='done' WHERE id=?").run(dump.id);
    return dump.id;
  };
  return { db, tools, capture };
}
const options = { limit: 10, pool: 100, seed: 'review-test' };

it('retains source, gist, filing provenance and complete Jev/fallback traces without database writes or network', () => {
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Review must not access the network'); }));
  const { db, tools, capture } = setup();
  const dumpId = capture('A laboratory recovered project constraints after four months.');
  const trace = [{ type: 'jev', response: { answers: { support: { choice: 'supported' } } } },
    { type: 'jev_policy', decision: 'gist_support', fallback: true, policyVersion: 'p2' }];
  db.prepare(`INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at,trace_json)
    VALUES('review-run','process_dump','fake','jev-1.14.0','q3','done',?,?)`).run('2026-11-03', JSON.stringify(trace));
  const actor = { kind: 'agent' as const, job: 'process_dump', runId: 'review-run', dumpId };
  const signal = tools.call('createSignal', { dumpId, gist: 'Project constraints survived four months.',
    sources: [{ ownObservation: true }] }, actor) as { id: string };
  const theme = tools.call('createDraftTheme', { name: 'Memory', dumpId }, actor) as { id: string };
  tools.call('fileSignal', { signalId: signal.id, themeId: theme.id }, actor);
  const changes = db.prepare('SELECT total_changes() AS n').get();
  const report = processingQualityReport(db, options);
  expect(db.prepare('SELECT total_changes() AS n').get()).toEqual(changes);
  expect(report.captures).toHaveLength(1);
  const reviewed = report.captures[0];
  expect(reviewed.text).toContain('four months');
  expect(reviewed.signals[0]).toMatchObject({ gist: 'Project constraints survived four months.',
    sources: [{ own_observation: 1 }], themes: [{ id: theme.id, name: 'Memory', status: 'draft' }] });
  expect(reviewed.runs).toEqual([expect.objectContaining({ id: 'review-run', trace })]);
  expect(reviewed.events).toContainEqual(expect.objectContaining({ tool: 'createDraftTheme' }));
  expect(reviewed.review.gistSupportedBySource).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
});

it('samples deterministically, includes no-signal results, excludes chat/deleted/unfinished captures and reports empty pools', () => {
  const { db, capture } = setup();
  expect(processingQualityReport(db, options).captures).toEqual([]);
  const ids = Array.from({ length: 8 }, (_, i) => capture(`Observation ${i}`));
  db.prepare('UPDATE dumps SET is_ask=1 WHERE id=?').run(ids[0]);
  db.prepare("UPDATE dumps SET deleted_at='2026-11-03' WHERE id=?").run(ids[1]);
  db.prepare("UPDATE dumps SET status='processing' WHERE id=?").run(ids[2]);
  const first = processingQualityReport(db, { ...options, limit: 3 });
  const second = processingQualityReport(db, { ...options, limit: 3 });
  expect(first).toEqual(second);
  expect(first.sampling).toMatchObject({ eligibleInPool: 5, sampled: 3 });
  for (const capture of first.captures) {
    expect(ids.slice(3)).toContain(capture.id);
    expect(capture.signals).toEqual([]);
    expect(capture.warnings).toHaveLength(1);
  }
});

it('finds processing traces through job payloads even when a capture created no signals or events', () => {
  const { db, capture } = setup();
  const dumpId = capture('Do not save an observation.');
  db.prepare(`INSERT INTO jobs(id,kind,payload_json,status,run_after,created_at)
    VALUES('empty-job','process_dump',?,'done','2026-11-03','2026-11-03')`).run(JSON.stringify({ dumpId }));
  db.prepare(`INSERT INTO agent_runs(id,job_id,job,provider,model,prompt_version,status,started_at,trace_json)
    VALUES('empty-run','empty-job','process_dump','fake','fixture','v1','done','2026-11-03','[]')`).run();
  expect(processingQualityReport(db, options).captures[0]).toMatchObject({
    signals: [], warnings: [], runs: [expect.objectContaining({ id: 'empty-run', trace: [] })],
  });
});

it('opens an existing database read-only and refuses to create a missing database', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'aber-processing-review-'));
  try {
    const path = resolve(directory, 'aber.db');
    const { capture } = setup(path);
    capture('A reviewable finding.');
    expect(readProcessingQuality(path, options).captures).toHaveLength(1);
    expect(() => readProcessingQuality(resolve(directory, 'missing.db'), options)).toThrow();
  } finally {
    for (const db of databases.splice(0)) db.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('validates bounded sample flags and rejects unknown/repeated options', () => {
  expect(reviewOptions(['--limit', '3', '--pool', '20', '--seed', 'weekly'])).toMatchObject({ limit: 3, pool: 20, seed: 'weekly' });
  for (const args of [['--limit', '0'], ['--limit', '101'], ['--pool', '2'], ['--limit', '1.5'],
    ['--db'], ['--upload', 'yes'], ['--seed', 'a', '--seed', 'b']]) {
    expect(() => reviewOptions(args)).toThrow();
  }
  expect(() => processingQualityReport(setup().db, { ...options, limit: 0 })).toThrow('Invalid');
});
