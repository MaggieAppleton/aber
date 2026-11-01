import { spawn } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { get } from 'node:http';
import assert from 'node:assert/strict';
import { createDatabase } from '../server/src/db/index.js';
import { seed } from '../server/src/seed.js';
import { appDir } from '../server/src/config.js';

const directory = await mkdtemp(resolve(tmpdir(), 'aber-production-'));
const db = createDatabase(resolve(directory, 'aber.db'));
seed(db); db.close();
const reserve = createServer();
await new Promise<void>(resolve => reserve.listen(0, '127.0.0.1', resolve));
const address = reserve.address();
assert(address && typeof address === 'object');
const port = address.port;
await new Promise<void>(resolve => reserve.close(() => resolve()));
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['dist/server/index.js'], {
  cwd: appDir, env: { ...process.env, AGENT_MODE: 'fake', ABER_DATA_DIR: directory, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout.on('data', data => { output += data.toString(); });
child.stderr.on('data', data => { output += data.toString(); });
const exited = new Promise<void>(resolve => child.once('exit', () => resolve()));
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

try {
  for (let i = 0; ; i++) {
    if (child.exitCode !== null) throw new Error(`Built server stopped: ${output}`);
    try { if ((await fetch(`${base}/healthz`)).ok) break; } catch {}
    if (i >= 100) throw new Error(`Built server did not start: ${output}`);
    await pause(100);
  }
  const html = await (await fetch(base)).text();
  assert.match(html, /<title>Aber/);
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(match => match[1]);
  assert(assets.length > 0, 'The built document must reference its bundled assets');
  for (const path of assets) assert((await fetch(base + path)).ok, `Missing built asset ${path}`);
  const world = await (await fetch(`${base}/api/world`)).json();
  assert.equal(world.themes.length, 7);
  // Node fetch replaces a custom Host header; raw HTTP exercises the real boundary.
  const foreignHostStatus = await new Promise<number | undefined>((resolveStatus, reject) => {
    get(`${base}/api/world`, { headers: { Host: 'untrusted.invalid' } }, response => {
      response.resume(); response.once('end', () => resolveStatus(response.statusCode));
    }).once('error', reject);
  });
  assert.equal(foreignHostStatus, 403, 'The built server must reject a foreign Host before serving data');
  const streamAbort = new AbortController();
  const stream = await fetch(`${base}/api/events/stream`, { signal: streamAbort.signal });
  assert.match(stream.headers.get('content-type') ?? '', /text\/event-stream/);
  const first = await stream.body!.getReader().read();
  assert.match(new TextDecoder().decode(first.value), /data:/);
  streamAbort.abort();

  const response = await fetch(`${base}/api/dumps`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'A synthetic studio uses local coding models for routine refactors.', from: 'web' }) });
  assert.equal(response.status, 201);
  const { id } = await response.json();
  let dump: any;
  for (let i = 0; i < 150; i++) {
    dump = await (await fetch(`${base}/api/dumps/${id}`)).json();
    if (dump.status === 'done' || dump.status === 'failed') break;
    await pause(100);
  }
  assert.equal(dump.status, 'done', dump.error);
  assert(dump.signals.length > 0, 'The built worker must process captures');

  const bytes = await readFile(resolve(appDir, 'e2e/fixtures/voice-note.m4a'));
  const form = new FormData(); form.append('from', 'shortcut');
  form.append('file', new File([bytes], 'voice.m4a', { type: 'audio/mp4' }));
  const audioCapture = await fetch(`${base}/api/dumps`, { method: 'POST', body: form });
  assert.equal(audioCapture.status, 201);
  const audioDump = await (await fetch(`${base}/api/dumps/${(await audioCapture.json()).id}`)).json();
  const audio = await fetch(`${base}/media/${audioDump.attachments[0].mediaId}`, { headers: { Range: 'bytes=0-15' } });
  assert.equal(audio.status, 206);
  assert.equal((await audio.arrayBuffer()).byteLength, 16);
  console.log('Production smoke passed: bundled UI/assets, migrations, seed, API, SSE, worker processing and media ranges.');
} finally {
  child.kill('SIGTERM');
  const force = setTimeout(() => child.kill('SIGKILL'), 5000); force.unref();
  await exited; clearTimeout(force);
  await rm(directory, { recursive: true, force: true });
}
