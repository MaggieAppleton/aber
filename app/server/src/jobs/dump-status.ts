import type { AgentDatabase } from '../agents/types.js';
import { updateDumpStatus } from '../tools/dumps.js';

/** Retried evidence/tripwire work must settle the capture as well as its child job. */
export function settleDumpStatus(db: AgentDatabase, dumpId: string): void {
  const dump = db.prepare('SELECT owner_id,status,error,deleted_at FROM dumps WHERE id=?').get(dumpId) as
    { owner_id: string; status: string; error: string | null; deleted_at: string | null } | undefined;
  if (!dump || dump.deleted_at) return;
  const jobs = (db.prepare('SELECT kind,status,error,payload_json FROM jobs WHERE owner_id=?').all(dump.owner_id) as
    { kind: string; status: string; error: string | null; payload_json: string }[]).filter(job => {
      try { return JSON.parse(job.payload_json).dumpId === dumpId; } catch { return false; }
    });
  if (!jobs.length) return;
  const failed = jobs.find(job => job.status === 'failed');
  const pending = jobs.filter(job => job.status === 'queued' || job.status === 'running');
  const status = failed ? 'failed' : pending.length ? pending.some(job => job.kind === 'transcribe') ? 'transcribing' : 'processing' : 'done';
  const error = failed?.error ?? pending.find(job => job.error)?.error ?? null;
  if (dump.status !== status || dump.error !== error) updateDumpStatus(db, { id: dumpId, status, error });
}

export function settlePayloadDumpStatus(db: AgentDatabase, payloadJson: string): void {
  let dumpId: string | undefined;
  try { dumpId = JSON.parse(payloadJson).dumpId; } catch { return; }
  if (dumpId) settleDumpStatus(db, dumpId);
}
