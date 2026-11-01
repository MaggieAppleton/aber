import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools, restoreSignalMerge } from './index.js';
import { clearRun, CleanupBlockedError } from '../agents/cleanup.js';
import { processDump } from '../agents/jobs/process-dump.js';
import { scriptedModel } from '../agents/scripted-model.js';

let db: Database;
let tools: ReturnType<typeof createTools>;
const person = { kind: 'person' as const, id: 'maggie' };
const url = 'https://example.org/article';
const trackedUrl = 'https://www.example.org/article/?utm_source=repeat';
const firstGist = 'The review team measures a two-day delay';
const secondGist = 'The power supplier signs a ten-year contract';
function actor(runId = 'original') { return { kind: 'agent' as const, job: 'process_dump', runId }; }
function register(runId: string) {
  db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES(?,'process_dump','fake','fixture','v1','done',?)").run(runId, new Date().toISOString());
}
beforeEach(() => {
  process.env.AGENT_MODE = 'fake'; process.env.DAILY_SPEND_CAP_USD = '5';
  db = createDatabase(); migrate(db); tools = createTools(db); register('original'); register('repeat'); register('retry');
});
afterEach(() => db.close());
const dump = (text = 'Two observations from one article') => tools.call('captureDump', { text, urls: [url] }, person);
const create = (dumpId: string, gist: string, runId = 'original', source = url, key?: string) => tools.call('createSignal', { dumpId, gist, sources: [{ url: source }], ...(key ? { key } : {}) }, actor(runId));
const origins = (signalId: string) => (tools.call('getSignal', { id: signalId }, person).origins as { dump_id: string }[]).map(origin => origin.dump_id).sort();
const counts = () => ({ signals: (db.prepare('SELECT COUNT(*) n FROM signals').get() as { n: number }).n, children: (db.prepare("SELECT COUNT(*) n FROM jobs WHERE kind IN ('link_evidence','tripwire')").get() as { n: number }).n });

it('preserves two full-article findings through actual model tools without explicit keys', async () => {
  const captured = dump();
  const fullText = 'The report measures a review delay and separately describes a signed power contract.';
  await processDump(db, tools, captured.id, {
    articleFetcher: async articleUrl => ({ url: articleUrl, title: 'Two measured findings', text: fullText, byline: null, siteName: null, fetchedAt: new Date().toISOString() }),
    model: scriptedModel([{ calls: [
      { toolName: 'createSignal', input: { dumpId: captured.id, gist: firstGist, sources: [{ url }] } },
      { toolName: 'createSignal', input: { dumpId: captured.id, gist: secondGist, sources: [{ url }] } },
    ] }, { text: 'Both findings are captured.' }]),
  });
  const signals = tools.call('getDump', { id: captured.id }, person).signals as { id: string; gist: string }[];
  expect(signals.map(signal => signal.gist).sort()).toEqual([firstGist, secondGist].sort());
  for (const signal of signals) expect(tools.call('getSignal', { id: signal.id }, person).fetched[0].text).toBe(fullText);
  expect(counts()).toEqual({ signals: 2, children: 4 });
});

it('makes repeated gists idempotent while keeping distinct same-source observations separate', () => {
  const captured = dump();
  const first = create(captured.id, firstGist), second = create(captured.id, secondGist);
  expect(second.id).not.toBe(first.id);
  expect(create(captured.id, `  ${firstGist.toUpperCase()}  `, 'original', trackedUrl).id).toBe(first.id);
  expect(create(captured.id, firstGist, 'original', url, 'different-call-key').id).toBe(first.id);
  expect(counts()).toEqual({ signals: 2, children: 4 });
});

it.each(['original', 'repeat'])('attaches every prior URL finding once during a later capture by run %s', runId => {
  const initial = dump(), first = create(initial.id, firstGist), second = create(initial.id, secondGist);
  const later = dump('The article again');
  const lookup = tools.call('lookupSignals', { urls: [trackedUrl] }, actor(runId));
  expect(lookup.exactMatches.map((signal: { id: string }) => signal.id).sort()).toEqual([first.id, second.id].sort());
  create(later.id, 'A new summary of the old article', runId, trackedUrl);
  create(later.id, 'A second summary of the old article', runId);
  expect(origins(first.id)).toEqual([initial.id, later.id].sort());
  expect(origins(second.id)).toEqual([initial.id, later.id].sort());
  expect(counts()).toEqual({ signals: 2, children: 4 });
  expect(db.prepare('SELECT COUNT(*) n FROM mentions WHERE dump_id=?').get(later.id)).toEqual({ n: 2 });
});

it('treats reprocessing the same dump by another successful run as already-saved material', () => {
  const captured = dump(), first = create(captured.id, firstGist), second = create(captured.id, secondGist);
  create(captured.id, 'A different summary during reprocessing', 'repeat');
  expect(counts()).toEqual({ signals: 2, children: 4 });
  expect(origins(first.id)).toEqual([captured.id]); expect(origins(second.id)).toEqual([captured.id]);
});

it('retries both findings after failed-run cleanup without retaining their first attempt', () => {
  const captured = dump();
  create(captured.id, firstGist); create(captured.id, secondGist);
  db.prepare("UPDATE agent_runs SET status='failed' WHERE id='original'").run();
  clearRun(db, 'original');
  expect(counts()).toEqual({ signals: 0, children: 0 });
  const first = create(captured.id, firstGist, 'retry'), second = create(captured.id, secondGist, 'retry');
  expect(first.id).not.toBe(second.id);
  expect(create(captured.id, firstGist, 'retry').id).toBe(first.id);
  expect(create(captured.id, secondGist, 'retry').id).toBe(second.id);
  expect(counts()).toEqual({ signals: 2, children: 4 });
});

it('keeps person edits while a failed repeat run clears only its new origins', () => {
  const initial = dump(), first = create(initial.id, firstGist), second = create(initial.id, secondGist);
  tools.call('editSignal', { id: second.id, note: 'A personal interpretation' }, person);
  const later = dump('Repeated article'); create(later.id, firstGist, 'repeat');
  clearRun(db, 'repeat');
  expect(origins(first.id)).toEqual([initial.id]); expect(origins(second.id)).toEqual([initial.id]);
  expect(tools.call('getSignal', { id: second.id }, person).note).toBe('A personal interpretation');
  expect(counts()).toEqual({ signals: 2, children: 4 });
  expect(() => clearRun(db, 'original')).toThrow(CleanupBlockedError);
});

it('attaches a repeated article to active merge survivors without reviving absorbed signals', () => {
  const initial = dump(), first = create(initial.id, firstGist), second = create(initial.id, secondGist);
  const other = tools.call('captureDump', { text: 'Another report of the review finding' }, person);
  const survivor = create(other.id, firstGist, 'repeat', 'https://example.org/other-report');
  tools.call('mergeNearDuplicateSignals', { survivorId: survivor.id, absorbedId: first.id, reasoning: 'Same review finding' }, person);
  const later = dump('Repeated original article'); create(later.id, 'The article again', 'retry');
  expect(origins(survivor.id)).toEqual([initial.id, other.id, later.id].sort());
  expect(origins(second.id)).toEqual([initial.id, later.id].sort());
  expect(tools.call('getSignal', { id: first.id }, person).merged_into_id).toBe(survivor.id);
  expect(db.prepare('SELECT COUNT(*) n FROM signals WHERE merged_into_id IS NULL').get()).toEqual({ n: 2 });
});

it('keeps a new article distinct after its first finding merges into an older survivor', () => {
  const earlier = tools.call('captureDump', { text: 'An earlier review report' }, person);
  const survivor = create(earlier.id, firstGist, 'original', 'https://example.org/earlier-review');
  const captured = dump(), first = create(captured.id, firstGist, 'repeat');
  tools.call('mergeNearDuplicateSignals', { survivorId: survivor.id, absorbedId: first.id, dumpId: captured.id, reasoning: 'The same review finding' }, actor('repeat'));
  const second = create(captured.id, secondGist, 'repeat');
  const signals = tools.call('getDump', { id: captured.id }, person).signals as { id: string; gist: string }[];
  expect(signals.map(signal => signal.gist).sort()).toEqual([firstGist, secondGist].sort());
  expect(second.id).not.toBe(survivor.id);
  const later = dump('The new article, repeated later');
  create(later.id, 'Another summary of the article', 'retry', trackedUrl);
  create(later.id, 'A further summary of the article', 'retry');
  expect(origins(survivor.id)).toEqual([earlier.id, captured.id, later.id].sort());
  expect(origins(second.id)).toEqual([captured.id, later.id].sort());
  expect(counts()).toEqual({ signals: 3, children: 6 });
});

it('restores original source provenance when a failed extraction with an early merge is cleared', () => {
  const earlier = tools.call('captureDump', { text: 'An earlier review report' }, person);
  const previousUrl = 'https://example.org/earlier-review';
  const survivor = create(earlier.id, firstGist, 'original', previousUrl);
  const captured = dump(), first = create(captured.id, firstGist, 'repeat');
  tools.call('mergeNearDuplicateSignals', { survivorId: survivor.id, absorbedId: first.id, dumpId: captured.id, reasoning: 'The same review finding' }, actor('repeat'));
  create(captured.id, secondGist, 'repeat');
  clearRun(db, 'repeat', { restoreMerge: (database, id) => { restoreSignalMerge(database, id); } });
  const restored = tools.call('getSignal', { id: survivor.id }, person);
  expect(restored.sources.map((source: { url: string }) => source.url)).toEqual([previousUrl]);
  expect(origins(survivor.id)).toEqual([earlier.id]);
  expect(tools.call('getDump', { id: captured.id }, person).signals).toEqual([]);
  const retriedFirst = create(captured.id, firstGist, 'retry'), retriedSecond = create(captured.id, secondGist, 'retry');
  expect(retriedFirst.id).not.toBe(retriedSecond.id);
});

it('retains URL tombstones even when a sibling finding from that article is active', () => {
  const initial = dump(), first = create(initial.id, firstGist), second = create(initial.id, secondGist);
  tools.call('discardSignal', { id: first.id }, person);
  const later = dump('Do not recreate the discarded article');
  expect(() => create(later.id, 'A new summary', 'repeat', trackedUrl)).toThrow('tombstone');
  expect(origins(second.id)).toEqual([initial.id]);
  expect(tools.call('getDump', { id: later.id }, person).signals).toEqual([]);
  expect(db.prepare('SELECT COUNT(*) n FROM signals').get()).toEqual({ n: 2 });
});
