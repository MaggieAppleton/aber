import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools } from '../tools/index.js';
import { createApp } from './app.js';

let db: Database;
let app: ReturnType<typeof createApp>;
beforeEach(() => {
  db = createDatabase(); migrate(db);
  db.prepare('INSERT OR IGNORE INTO people(id,name,created_at) VALUES(?,?,?)').run('maggie', 'Synthetic reviewer', new Date().toISOString());
  const tools = createTools(db);
  tools.call('captureDump', { text: 'Private capture sentinel' }, { kind: 'person', id: 'maggie' });
  app = createApp(db, tools);
});
afterEach(() => db.close());

it('rejects a foreign hostname before serving private data or any other route', async () => {
  for (const path of ['/api/world', '/api/dumps', '/api/events/stream', '/media/synthetic', '/healthz', '/']) {
    const response = await app.request(`http://attacker.example:3000${path}`, {
      headers: { Host: 'attacker.example:3000', Origin: 'http://attacker.example:3000' },
    });
    expect(response.status, path).toBe(403);
    expect(await response.text()).not.toContain('Private capture sentinel');
  }
  expect((await app.request('http://attacker.example:3000/api/world')).status).toBe(403);
});

it('allows loopback authorities, development ports and the ordinary proxy Host', async () => {
  for (const authority of ['127.0.0.1:3000', 'localhost:5174', '[::1]:5199', 'localhost', 'LOCALHOST:5174']) {
    const response = await app.request(`http://${authority}/healthz`, { headers: { Host: authority } });
    expect(response.status, authority).toBe(200);
  }
  expect((await app.request('http://localhost/healthz', { headers: { Host: 'localhost:80' } })).status).toBe(200);
  expect((await app.request('/healthz')).status).toBe(200);
});

it('rejects malformed or inconsistent Host headers without trusting forwarded hosts', async () => {
  for (const host of ['', 'attacker.example', 'localhost.attacker.example', 'localhost,attacker.example', 'localhost@attacker.example', 'localhost/path', 'localhost#fragment', 'localhost:', 'localhost:0', 'localhost:65536', 'localhost:80:90', '[::1', '127.1', '127.0.0.1:3000']) {
    const response = await app.request('http://localhost/healthz', { headers: { Host: host, 'X-Forwarded-Host': 'localhost' } });
    expect(response.status, host).toBe(403);
  }
  expect((await app.request('http://attacker.example/healthz', { headers: { Host: 'localhost' } })).status).toBe(403);
  expect((await app.request('http://localhost/healthz', { headers: { Host: 'localhost', 'X-Forwarded-Host': 'attacker.example' } })).status).toBe(200);
});

it('applies the Host guard to every method and preserves the write Origin guard', async () => {
  for (const method of ['HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    const response = await app.request('http://attacker.example/api/dumps', { method });
    expect(response.status, method).toBe(403);
  }
  const capture = { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' }, body: JSON.stringify({ text: 'Blocked' }) };
  expect((await app.request('http://localhost/api/dumps', capture)).status).toBe(403);
  capture.headers.Origin = 'http://127.0.0.1:5174';
  expect((await app.request('http://localhost/api/dumps', capture)).status).toBe(201);
});
