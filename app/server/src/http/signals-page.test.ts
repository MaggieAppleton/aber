import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools } from '../tools/index.js';
import { getObject, getWorld } from '../tools/queries.js';
import { createApp } from './app.js';

let db: Database;
let app: ReturnType<typeof createApp>;
const time = '2026-11-01T10:00:00.000Z';
function signal(id: string, createdAt = time, owner = 'maggie') {
  db.prepare('INSERT INTO signals(id,owner_id,gist,created_at,created_by,updated_at,updated_by) VALUES(?,?,?,?,?,?,?)')
    .run(id, owner, `Observation ${id}`, createdAt, `person:${owner}`, createdAt, `person:${owner}`);
}
beforeEach(() => { db = createDatabase(); migrate(db); app = createApp(db, createTools(db)); });
afterEach(() => db.close());

describe('HTTP signal pages', () => {
  it('pages the world and assembles every active signal once with the full object projection', async () => {
    for (let index = 0; index < 205; index++) signal(`signal-${String(index).padStart(3, '0')}`);
    signal('other-owner', time, 'other');
    signal('discarded'); db.prepare('UPDATE signals SET discarded_at=? WHERE id=?').run(time, 'discarded');
    signal('merged'); db.prepare('UPDATE signals SET merged_into_id=? WHERE id=?').run('signal-000', 'merged');
    db.prepare("INSERT INTO dumps(id,owner_id,text,captured_at,captured_from,status,created_at,created_by,updated_at,updated_by) VALUES('binned-dump','maggie','Binned',?,'web','done',?,'person:maggie',?,'person:maggie')").run(time,time,time);
    signal('binned'); db.prepare('UPDATE signals SET deleted_by_dump_id=? WHERE id=?').run('binned-dump', 'binned');
    const response = await app.request('/api/world');
    expect(response.status).toBe(200);
    let page = await response.json();
    expect(page.signals).toHaveLength(100);
    expect(page.signalPage).toMatchObject({ total: 205, limit: 100, nextCursor: expect.any(String) });
    expect(page.signals[0]).toEqual(getObject(db, 'signal', 'signal-000'));
    const ids = page.signals.map((row: any) => row.id);
    while (page.signalPage.nextCursor) {
      const response = await app.request(`/api/signals?cursor=${encodeURIComponent(page.signalPage.nextCursor)}`);
      expect(response.status).toBe(200);
      page = await response.json();
      expect(page.signalPage.total).toBe(205);
      ids.push(...page.signals.map((row: any) => row.id));
    }
    expect(ids).toEqual(getWorld(db).signals.map((row: any) => row.id));
    expect(new Set(ids).size).toBe(205);
    expect(page.signalPage.nextCursor).toBeNull();
    expect(getWorld(db).signalPage).toBeUndefined();
  });

  it('uses created_at then id cursors that survive inserts and removal of the boundary row', async () => {
    signal('b'); signal('a'); signal('later', '2026-11-02T10:00:00.000Z');
    const first = await (await app.request('/api/signals?limit=1')).json();
    expect(first.signals.map((row: any) => row.id)).toEqual(['a']);
    const cursor = encodeURIComponent(first.signalPage.nextCursor);
    const path = `/api/signals?limit=2&cursor=${cursor}`;
    const repeated = await (await app.request(path)).json();
    expect(repeated.signals.map((row: any) => row.id)).toEqual(['b', 'later']);
    expect(await (await app.request(path)).json()).toEqual(repeated);
    signal('earlier', '2026-10-31T10:00:00.000Z');
    db.prepare('UPDATE signals SET discarded_at=? WHERE id=?').run(time, 'a');
    expect((await (await app.request(path)).json()).signals.map((row: any) => row.id)).toEqual(['b', 'later']);
    const max = await (await app.request('/api/signals?limit=200')).json();
    expect(max.signalPage.limit).toBe(200);
  });

  it('rejects invalid cursors and limits at both HTTP boundaries', async () => {
    const malformed = ['', 'not-base64!', Buffer.from('{}').toString('base64url'), Buffer.from(JSON.stringify({ createdAt: time, id: '' })).toString('base64url')];
    for (const endpoint of ['/api/world', '/api/signals']) {
      for (const cursor of malformed) expect((await app.request(`${endpoint}?cursor=${encodeURIComponent(cursor)}`)).status).toBe(400);
      for (const limit of ['0', '201', '1.5', 'many', '']) expect((await app.request(`${endpoint}?limit=${limit}`)).status).toBe(400);
    }
  });
});
