import { clearFailedJobRuns, CleanupBlockedError } from '../agents/cleanup.js';
import { BudgetExceededError, daySpend, spendCap } from '../agents/run.js';
import type { AgentDatabase, ToolLayer } from '../agents/types.js';
import { claimJob, completeJob, failJob, nextUtcDay, scheduleDailyPurge, type Job } from './queue.js';
import { executeJob, restoreMergeForRecovery, setJobDumpStatus } from './handlers.js';
import { settlePayloadDumpStatus } from './dump-status.js';

export interface WorkerOptions {
  concurrency?: number;
  pollMs?: number;
  now?: () => Date;
  maxJobs?: number;
  handler?: (job: Job) => Promise<void>;
  restoreMerge?: (db: AgentDatabase, id: string) => void;
}

export function recoverStaleJobs(db: AgentDatabase, options: WorkerOptions = {}): number {
  const now = (options.now ?? (() => new Date()))();
  const stale = db.prepare("SELECT * FROM jobs WHERE status='running' AND (locked_at IS NULL OR locked_at<?)")
    .all(new Date(now.getTime() - 600_000).toISOString()) as Job[];
  for (const job of stale) {
    try {
      clearFailedJobRuns(db, job.id, { now, restoreMerge: options.restoreMerge ?? restoreMergeForRecovery });
      failJob(db, job, new Error('Worker stopped during the previous attempt'), now);
      if (job.attempts < 3) db.prepare('UPDATE jobs SET run_after=? WHERE id=?').run(now.toISOString(), job.id);
    } catch (error) { failJob(db, job, error, now, true); }
    settlePayloadDumpStatus(db, job.payload_json);
  }
  return stale.length;
}

function postponeForBudget(db: AgentDatabase, now: Date): void {
  const message = new BudgetExceededError().message;
  const dumps = db.prepare("UPDATE jobs SET run_after=?,error=? WHERE status='queued' AND kind<>'purge_bin' AND run_after<=? RETURNING payload_json")
    .all(nextUtcDay(now).toISOString(), message, now.toISOString()) as { payload_json: string }[];
  for (const row of dumps) {
    try {
      const { dumpId } = JSON.parse(row.payload_json) as { dumpId?: string };
      if (dumpId) setJobDumpStatus(db, dumpId, 'processing', message);
    } catch { /* A malformed payload is handled by its job, not the scheduler. */ }
  }
}

/** Drain due jobs; fake clocks and custom handlers keep recovery tests deterministic. */
export async function processJobs(db: AgentDatabase, tools: ToolLayer, options: WorkerOptions = {}): Promise<number> {
  const concurrency = Math.max(2, Math.min(5, options.concurrency ?? 2));
  const now = options.now ?? (() => new Date());
  let processed = 0;
  const work = async () => {
    while (processed < (options.maxJobs ?? 100)) {
      if (daySpend(db, now()) >= spendCap()) postponeForBudget(db, now());
      const job = claimJob(db, now());
      if (!job) return;
      processed++;
      const heartbeat = setInterval(() => {
        db.prepare("UPDATE jobs SET locked_at=? WHERE id=? AND status='running'").run(now().toISOString(), job.id);
      }, 30_000);
      heartbeat.unref();
      try {
        clearFailedJobRuns(db, job.id, { now: now(), restoreMerge: options.restoreMerge ?? restoreMergeForRecovery });
        await (options.handler ? options.handler(job) : executeJob(db, tools, job, { now }));
        completeJob(db, job.id);
      } catch (error) {
        if (error instanceof BudgetExceededError) {
          db.prepare("UPDATE jobs SET status='queued',locked_at=NULL,attempts=MAX(0,attempts-1),run_after=?,error=? WHERE id=?")
            .run(nextUtcDay(now()).toISOString(), error.message, job.id);
          const payload = JSON.parse(job.payload_json) as { dumpId?: string };
          if (payload.dumpId) setJobDumpStatus(db, payload.dumpId, 'processing', error.message);
        } else {
          failJob(db, job, error, now(), error instanceof CleanupBlockedError);
          try {
            const payload = JSON.parse(job.payload_json) as { dumpId?: string };
            if (payload.dumpId) setJobDumpStatus(db, payload.dumpId, job.attempts >= 3 || error instanceof CleanupBlockedError ? 'failed' : 'processing', error instanceof Error ? error.message : String(error));
          } catch { /* The original failure is already durable in jobs.error. */ }
        }
      } finally {
        clearInterval(heartbeat);
        settlePayloadDumpStatus(db, job.payload_json);
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, work));
  return processed;
}

export function startWorker(db: AgentDatabase, tools: ToolLayer, options: WorkerOptions = {}): { stop: () => Promise<void>; wake: () => void } {
  let stopping = false;
  let active: Promise<unknown> | undefined;
  const now = options.now ?? (() => new Date());
  let lastRecovery = now().getTime();
  recoverStaleJobs(db, options);
  const tick = () => {
    if (stopping || active) return;
    if (now().getTime() - lastRecovery >= 60_000) { recoverStaleJobs(db, options); lastRecovery = now().getTime(); }
    scheduleDailyPurge(db, now());
    active = processJobs(db, tools, options).catch(error => console.error('Aber worker:', error)).finally(() => { active = undefined; });
  };
  const timer = setInterval(tick, options.pollMs ?? 1000);
  timer.unref();
  tick();
  return { wake: tick, stop: async () => { stopping = true; clearInterval(timer); await active; } };
}
