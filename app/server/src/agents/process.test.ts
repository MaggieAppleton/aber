import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools } from '../tools/index.js';
import { processJobs } from '../jobs/runner.js';
import { processDump } from './jobs/process-dump.js';
import { SYNTHETIC_D1 } from './fixtures.js';
import { scriptedModel } from './scripted-model.js';
import { seed } from '../seed.js';
let db: Database;
let tools: ReturnType<typeof createTools>;
const person = { kind: 'person' as const, id: 'maggie' };
beforeEach(() => {
  process.env.AGENT_MODE = 'fake'; process.env.DAILY_SPEND_CAP_USD = '5';
  db = createDatabase(); migrate(db); tools = createTools(db);
  db.prepare('INSERT OR IGNORE INTO people(id,name,created_at) VALUES(?,?,?)').run('maggie', 'Maggie', new Date().toISOString());
  tools.call('writeTheme', { name: 'Cost of intelligence' }, person);
});
afterEach(() => db.close());
const capture = (text: string, url?: string) => tools.call('captureDump', { text, urls: url ? [url] : [] }, person);

it('processes synthetic D1 into three filed signals and chains follow-up jobs', async () => {
  const dump = capture(SYNTHETIC_D1.text);
  await processJobs(db, tools);
  const result = tools.call('getDump', { id: dump.id }, person);
  expect(result.status).toBe('done'); expect(result.signals).toHaveLength(3);
  for (const signal of result.signals) {
    const object = tools.call('getSignal', { id: signal.id }, person);
    expect(object.origins.map((origin: any) => origin.dump_id)).toContain(dump.id);
    expect(object.themes).toHaveLength(1);
  }
  expect(db.prepare("SELECT COUNT(*) n FROM jobs WHERE status='done' AND kind IN ('tripwire','link_evidence')").get()).toEqual({ n: 6 });
  expect(result.replies.some((reply: any) => reply.parts.some((part: any) => part.type === 'data-filed'))).toBe(true);
});
it('attaches a repeated URL and records its mention without a second signal', async () => {
  const first = capture('Routine inference prices fell again.', 'https://example.org/finding?utm_source=test');
  await processJobs(db, tools);
  const second = capture('The same report again.', 'https://example.org/finding'); await processJobs(db, tools);
  expect(db.prepare('SELECT COUNT(*) n FROM signals').get()).toEqual({ n: 1 });
  const signal = tools.call('getDump', { id: first.id }, person).signals[0];
  expect(tools.call('getSignal', { id: signal.id }, person).origins).toHaveLength(2);
  expect(db.prepare('SELECT COUNT(*) n FROM mentions WHERE dump_id=?').get(second.id)).toEqual({ n: 1 });
});
it('does not recreate a tombstoned link and retains the refusal in its trace', async () => {
  const first = capture('A discarded finding.', 'https://example.org/discarded'); await processJobs(db, tools);
  const signal = tools.call('getDump', { id: first.id }, person).signals[0]; tools.call('discardSignal', { id: signal.id }, person);
  const next = capture('An attempt to save that report.', 'https://example.org/discarded'); await processJobs(db, tools);
  expect(tools.call('getDump', { id: next.id }, person).signals).toHaveLength(0);
  expect(db.prepare("SELECT trace_json FROM agent_runs WHERE job='process_dump' ORDER BY started_at DESC,id DESC LIMIT 1").get()).toMatchObject({ trace_json: expect.stringContaining('tombstone') });
});
it('gates a planted same-finding merge through near_dup and Undo restores sources', async () => {
  const first = capture('Small models cut routine inference prices.', 'https://example.org/first'); await processJobs(db, tools);
  const existing = tools.call('getDump', { id: first.id }, person).signals[0];
  const next = capture('Small models cut routine inference prices.', 'https://example.org/second'); await processJobs(db, tools);
  const merge = db.prepare('SELECT * FROM merges WHERE undone_at IS NULL').get() as { id: string };
  expect(merge).toBeTruthy(); expect(tools.call('getSignal', { id: existing.id }, person).sources).toHaveLength(2);
  expect(db.prepare("SELECT COUNT(*) n FROM agent_runs WHERE job='near_dup' AND status='done'").get()).toEqual({ n: 1 });
  tools.call('undoMerge', { id: merge.id }, person);
  expect(tools.call('getSignal', { id: existing.id }, person).sources).toHaveLength(1);
  expect(tools.call('getDump', { id: next.id }, person).signals).toHaveLength(1);
});
it('keeps different findings about the same topic separate', async () => {
  capture('Small models cut routine inference prices.', 'https://example.org/price'); await processJobs(db, tools);
  capture('Small models improve a new reasoning benchmark.', 'https://example.org/benchmark'); await processJobs(db, tools);
  expect(db.prepare('SELECT COUNT(*) n FROM merges').get()).toEqual({ n: 0 });
  expect(db.prepare('SELECT COUNT(*) n FROM signals').get()).toEqual({ n: 2 });
});
it('passes full fetched article text to the model and stores it as best effort', async () => {
  const dump = capture('A useful report.', 'https://example.org/article');
  const fullText = 'The full article explains a measured result beyond the headline. '.repeat(15);
  let received = false;
  await processDump(db, tools, dump.id, {
    articleFetcher: async url => ({ url, title: 'The measured finding', text: fullText, byline: 'Researcher', siteName: 'Example', fetchedAt: new Date().toISOString() }),
    model: scriptedModel([options => {
      received = JSON.stringify(options.prompt).includes(fullText);
      return { calls: [{ toolName: 'createSignal', input: { dumpId: dump.id, gist: 'The measured finding', sources: [{ url: 'https://example.org/article' }] } }] };
    }, { text: 'Done' }]),
  });
  expect(received).toBe(true);
  const signal = tools.call('getDump', { id: dump.id }, person).signals[0];
  expect(tools.call('getSignal', { id: signal.id }, person).fetched[0].text).toBe(fullText);
});
it('still creates the signal when article fetching fails', async () => {
  const dump = capture('An observation behind a paywall.', 'https://example.org/paywall');
  await processDump(db, tools, dump.id, { articleFetcher: async () => null });
  const signal = tools.call('getDump', { id: dump.id }, person).signals[0];
  expect(signal).toBeTruthy(); expect(signal.fetched_json).toBeNull();
});
it('records a bounded-input failure for an oversized article without silently truncating it', async () => {
  const dump = capture('A long report.', 'https://example.org/long');
  await expect(processDump(db, tools, dump.id, {
    articleFetcher: async url => ({ url, title: 'Long article', text: 'Full source material. '.repeat(10_000), byline: null, siteName: null, fetchedAt: new Date().toISOString() }),
  })).rejects.toThrow('safety bound');
  expect(db.prepare("SELECT status,error FROM agent_runs WHERE job='process_dump'").get()).toMatchObject({ status: 'failed', error: expect.stringContaining('safety bound') });
  expect(db.prepare('SELECT COUNT(*) n FROM signals').get()).toEqual({ n: 0 });
});
it('reproduces the live provider’s twenty-result multi-read pattern without a false input limit', async () => {
  db.close(); db = createDatabase(); seed(db); tools = createTools(db);
  const dump = capture('A small studio reports local coding models complete routine refactors without a hosted model. Senior engineers spend more time reviewing changes than writing code.');
  let providerBytes = 0;
  const result = await processDump(db, tools, dump.id, { model: scriptedModel([
    { calls: [
      { toolName: 'lookupSignals', input: { urls: [], gist: 'Local coding models complete routine refactors.' } },
      { toolName: 'lookupSignals', input: { urls: [], gist: 'Senior engineers spend more time reviewing.' } },
      { toolName: 'similarSignals', input: { text: 'Local coding models complete routine refactors.', limit: 20 } },
      { toolName: 'similarSignals', input: { text: 'Senior engineers spend more time reviewing changes.', limit: 20 } },
      { toolName: 'similarTheories', input: { text: 'Local models and code review.', limit: 20 } },
    ] },
    options => { providerBytes = Buffer.byteLength(JSON.stringify(options.prompt)); return { calls: [{ toolName: 'createSignal', input: { dumpId: dump.id, gist: 'A studio uses local models for refactors.' } }] }; },
    { text: 'Completed the real read pattern.' },
  ]) });
  expect(result?.text).toBe('Completed the real read pattern.'); expect(providerBytes).toBeLessThan(60_000);
});
it('persists explicitly typed theme, theory and prototype draft parts for the three-kind fixture', async () => {
  const dump = capture('Fixture: all draft kinds.');
  await processJobs(db, tools, { maxJobs: 100 });
  const persisted = tools.call('getDump', { id: dump.id }, person);
  const parts = persisted.replies.flatMap((reply: any) => reply.parts).filter((part: any) => part.type === 'data-draft');
  expect(parts).toHaveLength(3);
  expect(parts.map((part: any) => part.data.kind).sort()).toEqual(['prototype', 'theme', 'theory']);
  for (const part of parts) {
    const object = part.data.kind === 'theory'
      ? tools.call('getTheory', { id: part.data.id }, person)
      : db.prepare(`SELECT * FROM ${part.data.kind === 'theme' ? 'themes' : 'prototypes'} WHERE id=?`).get(part.data.id) as Record<string, any>;
    expect(part.data.kind === 'theory' ? object.claim : object.name).toBe(part.data.kind === 'theory' ? part.data.claim : part.data.name);
  }
  expect(tools.call('getDump', { id: dump.id }, person).replies.flatMap((reply: any) => reply.parts).filter((part: any) => part.type === 'data-draft')).toEqual(parts);
});
