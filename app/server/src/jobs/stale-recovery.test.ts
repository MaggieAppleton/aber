import { it, expect, vi } from 'vitest';
import { createDatabase, migrate } from '../db/index.js';
import { createTools } from '../tools/index.js';
import { startWorker, recoverStaleJobs } from './runner.js';

it('recovers a crashed lock even when the app restarted before it became stale', async () => {
  vi.useFakeTimers();
  const db = createDatabase(); migrate(db);
  db.prepare('INSERT OR IGNORE INTO people(id,name,created_at) VALUES(?,?,?)').run('maggie', 'Maggie', new Date().toISOString());
  const tools = createTools(db);
  const dump = tools.call('captureDump', { text: 'A quick restart fixture' }, { kind: 'person', id: 'maggie' });
  let now = new Date();
  db.prepare("UPDATE jobs SET status='running',attempts=1,locked_at=?").run(now.toISOString());
  const handled: string[] = [];
  const worker = startWorker(db, tools, { now: () => now, pollMs: 100, handler: async job => { if (job.kind === 'process_dump') handled.push(job.id); } });
  try {
    await vi.advanceTimersByTimeAsync(100);
    expect(handled).toHaveLength(0);
    now = new Date(now.getTime() + 11 * 60000);
    await vi.advanceTimersByTimeAsync(100);
    expect(handled).toHaveLength(1);
    expect(tools.call('getDump', { id: dump.id }, { kind: 'person', id: 'maggie' }).status).toBe('done');
  } finally { await worker.stop(); vi.useRealTimers(); db.close(); }
});

it('shows a terminal crashed attempt as failed in the dump log', () => {
  const db = createDatabase(); migrate(db);
  db.prepare('INSERT OR IGNORE INTO people(id,name,created_at) VALUES(?,?,?)').run('maggie', 'Maggie', new Date().toISOString());
  const tools = createTools(db);
  const dump = tools.call('captureDump', { text: 'A third-attempt crash fixture' }, { kind: 'person', id: 'maggie' });
  db.prepare("UPDATE dumps SET status='processing'").run();
  db.prepare("UPDATE jobs SET status='running',attempts=3,locked_at=?").run(new Date(Date.now() - 11 * 60000).toISOString());
  try {
    expect(recoverStaleJobs(db)).toBe(1);
    expect(tools.call('getDump', { id: dump.id }, { kind: 'person', id: 'maggie' }).status).toBe('failed');
  } finally { db.close(); }
});
