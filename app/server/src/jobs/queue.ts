import { ulid } from 'ulid';
import type { AgentDatabase } from '../agents/types.js';

export type JobKind = 'transcribe' | 'process_dump' | 'link_evidence' | 'tripwire' | 'purge_bin' | 'cluster' | 'red_team' | 'extrapolate' | 'diagnosticity' | 'dedupe';
export interface Job {
  id: string; kind: JobKind; payload_json: string; status: 'queued' | 'running' | 'done' | 'failed';
  attempts: number; run_after: string; locked_at: string | null; error: string | null; dedupe_key: string | null; created_at: string;
}
export const RETRY_BACKOFF_MS = [30_000, 300_000, 1_800_000] as const;
export const MAX_ATTEMPTS = 3;

export function enqueue(db: AgentDatabase, kind: JobKind, payload: unknown, options: { dedupeKey?: string; runAfter?: Date; now?: Date } = {}): Job {
  const now = options.now ?? new Date();
  const id = ulid();
  db.prepare('INSERT INTO jobs (id,kind,payload_json,status,attempts,run_after,dedupe_key,created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(dedupe_key) DO NOTHING')
    .run(id, kind, JSON.stringify(payload), 'queued', 0, (options.runAfter ?? now).toISOString(), options.dedupeKey ?? null, now.toISOString());
  return db.prepare(options.dedupeKey ? 'SELECT * FROM jobs WHERE dedupe_key=?' : 'SELECT * FROM jobs WHERE id=?').get(options.dedupeKey ?? id) as Job;
}

export function claimJob(db: AgentDatabase, now = new Date()): Job | undefined {
  return db.prepare("UPDATE jobs SET status='running',locked_at=?,attempts=attempts+1 WHERE id=(SELECT j.id FROM jobs j WHERE j.status='queued' AND j.run_after<=? AND NOT EXISTS (SELECT 1 FROM agent_runs r WHERE j.created_by='agent:'||r.job||':'||r.id AND r.status<>'done') ORDER BY j.created_at,j.id LIMIT 1) RETURNING *")
    .get(now.toISOString(), now.toISOString()) as Job | undefined;
}

export function completeJob(db: AgentDatabase, id: string): void {
  db.prepare("UPDATE jobs SET status='done',locked_at=NULL,error=NULL WHERE id=? AND status='running'").run(id);
}

export function failJob(db: AgentDatabase, job: Job, error: unknown, now = new Date(), permanent = false): void {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const failed = permanent || job.attempts >= MAX_ATTEMPTS;
  const retryAt = new Date(now.getTime() + RETRY_BACKOFF_MS[Math.min(job.attempts - 1, 2)]!);
  db.prepare('UPDATE jobs SET status=?,locked_at=NULL,error=?,run_after=? WHERE id=?')
    .run(failed ? 'failed' : 'queued', message, retryAt.toISOString(), job.id);
}

export function nextUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

export function scheduleDailyPurge(db: AgentDatabase, now = new Date()): void {
  enqueue(db, 'purge_bin', {}, { now, dedupeKey: `purge_bin:${now.toISOString().slice(0, 10)}` });
}
