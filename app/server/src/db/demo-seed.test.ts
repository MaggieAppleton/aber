import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createDatabase } from './index.js';
import { seed } from '../seed.js';
import { createTools } from '../tools/index.js';
import { getDump, getWorld } from '../tools/queries.js';
import { createApp } from '../http/app.js';
import { createDemoDirectory, canonicalSnapshot } from './demo-seed.js';
import { DEMO_IDS as ids, DEMO_MANIFEST, DEMO_MANIFEST_FILENAME, DEMO_VOICE } from './demo-manifest.js';
vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, linkSync: vi.fn(actual.linkSync) };
});
const digest = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const person = { kind: 'person' as const, id: 'maggie' };
let parent: string;
beforeEach(() => { parent = mkdtempSync(resolve(tmpdir(), 'aber-demo-test-')); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-01T10:00:00.000Z')); });
afterEach(() => { vi.useRealTimers(); rmSync(parent, { recursive: true, force: true }); });

describe('explicit isolated demo installation', () => {
  it('keeps every canonical row unchanged, adds only fictional drafts and enqueues no work', () => {
    const baseline = createDatabase(); seed(baseline); const original = canonicalSnapshot(baseline); baseline.close();
    const result = createDemoDirectory(resolve(parent, 'new-demo'));
    expect(result.status).toBe('created');
    const db = createDatabase(result.dbPath);
    try {
      expect(canonicalSnapshot(db)).toEqual(original);
      expect(result.manifest.baselineSha256).toBe(digest(JSON.stringify(original)));
      expect(db.prepare('SELECT status,created_by FROM themes WHERE id=?').get(ids.theme)).toMatchObject({ status: 'draft', created_by: `agent:process_dump:${ids.run}` });
      expect(db.prepare('SELECT status,authorship,horizon FROM theories WHERE id=?').get(ids.theory)).toEqual({ status: 'draft', authorship: 'agent', horizon: 2028 });
      expect(db.prepare('SELECT draft,status FROM prototypes WHERE id=?').get(ids.prototype)).toEqual({ draft: 1, status: 'idea' });
      expect(db.prepare("SELECT COUNT(*) n FROM stances WHERE id LIKE 'demo-v1:%'").get()).toEqual({ n: 0 });
      expect(db.prepare("SELECT COUNT(*) n FROM jobs WHERE status IN ('queued','running')").get()).toEqual({ n: 0 });
      expect(db.pragma('foreign_key_check')).toEqual([]);
      expect(db.pragma('integrity_check')).toEqual([{ integrity_check: 'ok' }]);
      expect(JSON.parse((db.prepare('SELECT after_json FROM events WHERE id=?').get(ids.manifest) as any).after_json).pack).toEqual(DEMO_MANIFEST);
    } finally { db.close(); }
  });
  it('uses real draft decisions, pending revision decisions and reversible merge snapshots', () => {
    const result = createDemoDirectory(resolve(parent, 'flows')); const db = createDatabase(result.dbPath); const tools = createTools(db);
    try {
      const dump = getDump(db, ids.voiceDump)!;
      expect(dump.drafts.map((item: any) => item.kind).sort()).toEqual(['prototype', 'theme', 'theory']);
      expect(dump.transcripts[0].text).toBe(readFileSync(new URL('./demo-assets/voice.txt', import.meta.url), 'utf8'));
      const world = getWorld(db);
      expect(world.theories.find((item: any) => item.id === ids.theory)).toMatchObject({ themes: [ids.theme], prototypes: [ids.prototype] });
      expect(world.suggestions.find((item: any) => item.id === ids.revision)).toMatchObject({ status: 'pending', kind: 'revision', target_id: 't3' });
      const before = tools.call('getTheory', { id: 't3' }, person);
      tools.call('decideSuggestion', { id: ids.revision, decision: 'accepted' }, person);
      expect(tools.call('getTheory', { id: 't3' }, person).claim).toContain('vault');
      tools.call('decideSuggestion', { id: ids.revision, decision: 'undo' }, person);
      expect(tools.call('getTheory', { id: 't3' }, person).claim).toBe(before.claim);
      expect(tools.call('getSignal', { id: ids.signal }, person).sources).toHaveLength(2);
      tools.call('undoMerge', { id: ids.merge }, person);
      expect(tools.call('getSignal', { id: ids.signal }, person).sources).toHaveLength(1);
      expect(tools.call('getSignal', { id: ids.copy }, person).merged_into_id).toBeNull();
      tools.call('acceptDraft', { kind: 'theme', id: ids.theme }, person);
      tools.call('rephraseDraft', { kind: 'theory', id: ids.theory, claim: 'My edited demonstration theory' }, person);
      tools.call('discardDraft', { kind: 'prototype', id: ids.prototype }, person);
      expect(db.pragma('foreign_key_check')).toEqual([]);
    } finally { db.close(); }
  });
  it('repeats with zero file changes and preserves person edits', () => {
    const directory = resolve(parent, 'repeat'); const result = createDemoDirectory(directory);
    const db = createDatabase(result.dbPath); createTools(db).call('editTheory', { id: ids.theory, claim: 'Person edit preserved' }, person); db.close();
    const files = [result.dbPath, resolve(directory, DEMO_MANIFEST_FILENAME), resolve(directory, 'media', DEMO_VOICE.filename)];
    const before = files.map(path => ({ bytes: digest(readFileSync(path)), modified: statSync(path).mtimeMs }));
    expect(createDemoDirectory(directory).status).toBe('unchanged');
    expect(files.map(path => ({ bytes: digest(readFileSync(path)), modified: statSync(path).mtimeMs }))).toEqual(before);
    const read = createDatabase(result.dbPath); try { expect((read.prepare('SELECT claim FROM theories WHERE id=?').get(ids.theory) as any).claim).toBe('Person edit preserved'); } finally { read.close(); }
  });
  it('rejects existing directories and collisions before touching their contents', () => {
    const directory = resolve(parent, 'existing'); mkdirSync(directory); writeFileSync(resolve(directory, 'aber.db'), 'personal work');
    expect(() => createDemoDirectory(directory)).toThrow(/existing|manifest/i);
    expect(readFileSync(resolve(directory, 'aber.db'), 'utf8')).toBe('personal work');
    expect(readdirSync(directory)).toEqual(['aber.db']);
    expect(() => createDemoDirectory(resolve(parent, 'main', 'child'), [resolve(parent, 'main')])).toThrow(/protected|main|default/i);
    expect(existsSync(resolve(parent, 'main'))).toBe(false);
  });
  it('requires verified source media before creating any target files', () => {
    const directory = resolve(parent, 'bad-media');
    expect(() => createDemoDirectory(directory, [], { voicePath: resolve(parent, 'missing.wav') })).toThrow();
    expect(existsSync(directory)).toBe(false);
  });
  it('cleans staging and partially published files after media publication fails', async () => {
    const directory = resolve(parent, 'media-failure'); const { linkSync: original } = await vi.importActual<typeof import('node:fs')>('node:fs');
    const spy = vi.mocked(fs.linkSync).mockImplementation((source, destination) => {
      if (String(destination).endsWith(DEMO_VOICE.filename)) throw new Error('simulated media publication failure');
      return original(source, destination);
    });
    try { expect(() => createDemoDirectory(directory)).toThrow('simulated media publication failure'); }
    finally { spy.mockImplementation(original); }
    expect(existsSync(directory)).toBe(false);
    expect(readdirSync(parent)).toEqual([]);
  });
  it('preserves an unexpected file that races with publication', async () => {
    const directory = resolve(parent, 'racing-target'); const { linkSync: original } = await vi.importActual<typeof import('node:fs')>('node:fs');
    const spy = vi.mocked(fs.linkSync).mockImplementation((source, destination) => {
      if (String(destination).endsWith('aber.db')) writeFileSync(destination, 'external file', { flag: 'wx' });
      return original(source, destination);
    });
    try { expect(() => createDemoDirectory(directory)).toThrow(); }
    finally { spy.mockImplementation(original); }
    expect(readFileSync(resolve(directory, 'aber.db'), 'utf8')).toBe('external file');
    expect(readdirSync(directory)).toEqual(['aber.db']);
    expect(readdirSync(parent)).toEqual(['racing-target']);
  });
  it('refuses a modified source asset without creating a target', () => {
    const tampered = resolve(parent, 'tampered.wav'); writeFileSync(tampered, 'wrong audio');
    const directory = resolve(parent, 'hash-failure');
    expect(() => createDemoDirectory(directory, [], { voicePath: tampered })).toThrow(/hash mismatch/);
    expect(existsSync(directory)).toBe(false);
  });
  it('serves the actual authored voice bytes and byte ranges', async () => {
    const result = createDemoDirectory(resolve(parent, 'voice')); const db = createDatabase(result.dbPath);
    try {
      const app = createApp(db, createTools(db), { dataDir: result.directory });
      const response = await app.request(`http://localhost/media/${ids.media}`);
      expect(response.status).toBe(200); expect(response.headers.get('content-type')).toBe('audio/wav');
      const audio = Buffer.from(await response.arrayBuffer());
      expect(audio.length).toBe(DEMO_VOICE.bytes); expect(audio.length).toBeLessThan(2_000_000); expect(digest(audio)).toBe(DEMO_VOICE.sha256);
      expect(audio.subarray(0, 4).toString()).toBe('RIFF'); expect(audio.subarray(8, 12).toString()).toBe('WAVE');
      expect(audio.readUInt16LE(22)).toBe(1); expect(audio.readUInt32LE(24)).toBe(16000);
      let offset = 12;
      while (audio.subarray(offset, offset + 4).toString() !== 'data') offset += 8 + audio.readUInt32LE(offset + 4) + (audio.readUInt32LE(offset + 4) % 2);
      const seconds = audio.readUInt32LE(offset + 4) / 32000;
      expect(seconds).toBeGreaterThan(30); expect(seconds).toBeLessThan(40);
      expect(audio.subarray(offset + 8).some(value => value !== 0)).toBe(true);
      const range = await app.request(`http://localhost/media/${ids.media}`, { headers: { Range: 'bytes=0-31' } });
      expect(range.status).toBe(206); expect(Buffer.from(await range.arrayBuffer())).toEqual(audio.subarray(0, 32));
    } finally { db.close(); }
  });
});
