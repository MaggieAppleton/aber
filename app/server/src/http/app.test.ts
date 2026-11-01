import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools } from '../tools/index.js';
import { createApp } from './app.js';

describe('capture HTTP boundary', () => {
  let db: Database;
  let directory: string;
  let app: ReturnType<typeof createApp>;
  beforeEach(async () => {
    directory = await mkdtemp(resolve(tmpdir(), 'aber-http-'));
    db = createDatabase(); migrate(db);
    db.prepare('INSERT OR IGNORE INTO people(id,name,created_at) VALUES(?,?,?)').run('maggie', 'Maggie', new Date().toISOString());
    app = createApp(db, createTools(db), { dataDir: directory });
  });
  afterEach(async () => { db.close(); await rm(directory, { recursive: true, force: true }); });
  const post = (text: unknown, headers: Record<string, string> = {}) => ({ method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(text) });

  it('persists verbatim capture, normalises links, queues once and returns promptly', async () => {
    const text = '  Two observations\n\nKeep this spacing.  ';
    const started = performance.now();
    const response = await app.request('/api/dumps', post({ text, urls: ['https://WWW.Twitter.com/test/status/123?s=20&utm_source=test'], from: 'shortcut' }, { 'Idempotency-Key': 'repeat-me' }));
    expect(response.status).toBe(201);
    expect(performance.now() - started).toBeLessThan(1000);
    const dump = await response.json();
    expect(db.prepare('SELECT text FROM dumps WHERE id=?').get(dump.id)).toEqual({ text });
    expect(db.prepare('SELECT url_normalised FROM dump_attachments WHERE dump_id=?').get(dump.id)).toEqual({ url_normalised: 'https://x.com/test/status/123' });
    const repeat = await app.request('/api/dumps', post({ text: 'different input' }, { 'Idempotency-Key': 'repeat-me' }));
    expect((await repeat.json()).id).toBe(dump.id);
    expect((db.prepare('SELECT COUNT(*) n FROM jobs').get() as { n: number }).n).toBe(1);
  });

  it('stores multipart audio on disk and serves its exact bytes', async () => {
    const form = new FormData(); form.append('from', 'shortcut');
    form.append('file', new File([new Uint8Array([1, 2, 3, 4])], 'note.m4a', { type: 'audio/mp4' }));
    expect((await app.request('/api/dumps', { method: 'POST', body: form })).status).toBe(201);
    const media = db.prepare('SELECT * FROM media').get() as { id: string; path: string; sha256: string; bytes: number };
    expect(media.sha256).toHaveLength(64); expect(media.bytes).toBe(4);
    expect(await readFile(resolve(directory, 'media', media.path))).toEqual(Buffer.from([1, 2, 3, 4]));
    expect((db.prepare('SELECT kind FROM jobs').get() as { kind: string }).kind).toBe('transcribe');
    const served = await app.request(`/media/${media.id}`);
    expect(served.headers.get('Content-Type')).toBe('audio/mp4');
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
    const partial = await app.request(`/media/${media.id}`, { headers: { Range: 'bytes=1-2' } });
    expect(partial.status).toBe(206);
    expect(partial.headers.get('Content-Range')).toBe('bytes 1-2/4');
    expect(new Uint8Array(await partial.arrayBuffer())).toEqual(new Uint8Array([2, 3]));
  });

  it('rejects empty dumps, malformed payloads and cross-site writes', async () => {
    expect((await app.request('/api/dumps', post({ text: '' }))).status).toBe(400);
    expect((await app.request('/api/dumps', post({ urls: ['not a URL'] }))).status).toBe(400);
    expect((await app.request('/api/dumps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status).toBe(400);
    expect((await app.request('/api/dumps', post({ text: 'blocked' }, { Origin: 'https://outside.example' }))).status).toBe(403);
    expect((db.prepare('SELECT COUNT(*) n FROM dumps').get() as { n: number }).n).toBe(0);
  });

  it('enforces tool authority at the HTTP boundary', async () => {
    expect((await app.request('/api/tools/createSignal', post({ gist: 'An observation', dumpId: 'missing' }))).status).toBe(403);
    expect((db.prepare('SELECT COUNT(*) n FROM signals').get() as { n: number }).n).toBe(0);
  });

  it('uploads prototype media without creating a dump or scheduling agent jobs', async () => {
    const form = new FormData();
    form.append('file', new File([new Uint8Array([137, 80, 78, 71])], 'prototype.png', { type: 'image/png' }));
    const response = await app.request('/api/media', { method: 'POST', body: form });
    expect(response.status).toBe(201);
    const media = await response.json();
    expect(media.id).toBeTruthy();
    expect((db.prepare('SELECT COUNT(*) n FROM dumps').get() as { n: number }).n).toBe(0);
    expect((db.prepare('SELECT COUNT(*) n FROM jobs').get() as { n: number }).n).toBe(0);
    const tools = createTools(db);
    const prototype = tools.call('writePrototype', { name: 'A standalone media test' }, { kind: 'person', id: 'maggie' });
    const attached = tools.call('attachPrototypeMedia', { prototypeId: prototype.id, mediaId: media.id }, { kind: 'person', id: 'maggie' });
    expect(attached.media.map((item: any) => item.id)).toContain(media.id);
    expect((db.prepare("SELECT COUNT(*) n FROM events WHERE tool='storeMedia'").get() as { n: number }).n).toBe(1);
  });
});
