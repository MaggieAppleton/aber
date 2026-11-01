import { rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { config } from '../config.js';
import { updateDumpStatus, saveTranscript, purgeBin } from '../tools/dumps.js';
import { restoreSignalMerge } from '../tools/merges.js';
import type { AgentDatabase, ToolLayer, RunContext } from '../agents/types.js';
import { processDump } from '../agents/jobs/process-dump.js';
import { linkEvidence } from '../agents/jobs/link-evidence.js';
import { checkTripwire } from '../agents/jobs/tripwire.js';
import { readTool, type Row } from '../agents/jobs/context.js';
import { transcribeFile } from '../agents/transcribe.js';
import { enqueue, type Job } from './queue.js';
import { fanoutTripwireLookback, type TripwirePayload } from './tripwire-lookback.js';

export function setJobDumpStatus(db: AgentDatabase, id: string, status: string, error?: string): void {
  updateDumpStatus(db, { id, status, error: error ?? null });
}
export function restoreMergeForRecovery(db: AgentDatabase, id: string): void { restoreSignalMerge(db, id); }

function mediaPath(path: string): string {
  const directory = resolve(config.dataDir, 'media');
  const full = resolve(directory, path);
  if (!full.startsWith(`${directory}${sep}`)) throw new Error('Media path leaves the media directory');
  return full;
}

export async function executeJob(db: AgentDatabase, tools: ToolLayer, job: Job, options: { now?: () => Date } = {}): Promise<void> {
  const payload = JSON.parse(job.payload_json) as TripwirePayload;
  const ctx: RunContext = { jobId: job.id, attempt: job.attempts, dumpId: payload.dumpId, now: options.now };
  if (job.kind === 'purge_bin') {
    const removed = purgeBin(db, (options.now?.() ?? new Date()).toISOString());
    for (const path of removed.paths) await rm(mediaPath(path), { force: true });
    return;
  }
  if (job.kind === 'transcribe') {
    if (!payload.dumpId) throw new Error('Transcription job has no dumpId');
    const dump = await readTool<Row>(tools, 'getDump', { id: payload.dumpId }, 'transcribe');
    if (!dump || dump.deleted_at) return;
    setJobDumpStatus(db, payload.dumpId, 'transcribing');
    for (const attachment of (dump.attachments ?? []).filter((item: Row) => item.kind === 'audio')) {
      if ((dump.transcripts ?? []).some((transcript: Row) => transcript.media_id === attachment.media_id)) continue;
      const text = await transcribeFile(db, mediaPath(attachment.path), ctx);
      const run = db.prepare("SELECT id FROM agent_runs WHERE job_id=? AND job='transcribe' ORDER BY started_at DESC,id DESC LIMIT 1").get(job.id) as { id: string };
      saveTranscript(db, { dumpId: payload.dumpId, mediaId: attachment.mediaId ?? attachment.media_id, text, provider: process.env.AGENT_MODE === 'fake' ? 'fake' : 'openai', model: 'gpt-transcribe', runId: run.id });
    }
    enqueue(db, 'process_dump', { dumpId: payload.dumpId }, { dedupeKey: `process_dump:${payload.dumpId}`, now: options.now?.() });
    return;
  }
  if (job.kind === 'process_dump') {
    if (!payload.dumpId) throw new Error('Processing job has no dumpId');
    setJobDumpStatus(db, payload.dumpId, 'processing');
    await processDump(db, tools, payload.dumpId, ctx);
    setJobDumpStatus(db, payload.dumpId, 'done');
    return;
  }
  if (job.kind === 'link_evidence') {
    if (!payload.signalId) throw new Error('Evidence job has no signalId');
    await linkEvidence(db, tools, payload.signalId, ctx);
    return;
  }
  if (job.kind === 'tripwire') {
    if (payload.signalId) await checkTripwire(db, tools, payload.signalId, { ...ctx, theoryId: payload.theoryId, tripwireVersion: payload.tripwireVersion });
    else if (payload.theoryId) await fanoutTripwireLookback(db, tools, job, payload, options.now?.());
    else throw new Error('Tripwire job needs a signal or theory');
    return;
  }
  throw new Error(`Job ${job.kind} is reserved for a later version`);
}
