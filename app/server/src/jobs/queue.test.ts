import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools } from '../tools/index.js';
import { claimJob, enqueue, failJob, RETRY_BACKOFF_MS } from './queue.js';
import { processJobs } from './runner.js';
let db: Database;
beforeEach(() => { db = createDatabase(); migrate(db); process.env.DAILY_SPEND_CAP_USD = '5'; });
afterEach(() => db.close());

it('claims each job once and deduplicates enqueue', () => {
  const first = enqueue(db, 'tripwire', { signalId: 'a' }, { dedupeKey: 'unique' });
  expect(enqueue(db, 'tripwire', { signalId: 'b' }, { dedupeKey: 'unique' }).id).toBe(first.id);
  expect(claimJob(db)?.id).toBe(first.id); expect(claimJob(db)).toBeUndefined();
});
it('uses the specified backoff and fails after three attempts', () => {
  expect(RETRY_BACKOFF_MS).toEqual([30_000, 300_000, 1_800_000]);
  let time = new Date(); const queued = enqueue(db, 'tripwire', {}, { now: time });
  for (const delay of [30_000, 300_000, 1_800_000]) {
    const job = claimJob(db, time)!; failJob(db, job, new Error('fixture'), time);
    const row = db.prepare('SELECT * FROM jobs WHERE id=?').get(queued.id) as { attempts: number; status: string; run_after: string };
    expect(new Date(row.run_after).getTime() - time.getTime()).toBe(delay);
    expect(row.status).toBe(row.attempts === 3 ? 'failed' : 'queued'); time = new Date(time.getTime() + delay);
  }
});
it('bounds concurrency and holds children until their parent finishes', async () => {
  const time = new Date();
  db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES('parent','process_dump','fake','fixture','v1','running',?)").run(time.toISOString());
  const child = enqueue(db, 'tripwire', { signalId: 'child' });
  db.prepare('UPDATE jobs SET created_by=? WHERE id=?').run('agent:process_dump:parent', child.id);
  expect(claimJob(db)).toBeUndefined();
  db.prepare("UPDATE agent_runs SET status='done' WHERE id='parent'").run();
  for (let n = 0; n < 7; n++) enqueue(db, 'tripwire', { signalId: String(n) });
  let active = 0, peak = 0;
  await processJobs(db, createTools(db), { concurrency: 3, handler: async () => { active++; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 5)); active--; } });
  expect(peak).toBe(3);
});
it('defers model jobs at the cap while allowing bin maintenance', async () => {
  const now = new Date();
  db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at,cost_usd) VALUES('cost','chat','openai','terra','v1','done',?,5)").run(now.toISOString());
  const job = enqueue(db, 'tripwire', {}, { now }); enqueue(db, 'purge_bin', {}, { now });
  const seen: string[] = [];
  await processJobs(db, createTools(db), { now: () => now, handler: async item => { seen.push(item.kind); } });
  expect(seen).toEqual(['purge_bin']);
  expect(db.prepare('SELECT status,attempts,error FROM jobs WHERE id=?').get(job.id)).toMatchObject({ status: 'queued', attempts: 0, error: expect.stringContaining('spend cap') });
});
