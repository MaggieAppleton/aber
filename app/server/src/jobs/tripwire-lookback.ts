import type { AgentDatabase, ToolLayer } from '../agents/types.js';
import { readTool, type Row } from '../agents/jobs/context.js';
import { enqueue, type Job } from './queue.js';

export interface TripwirePayload {
  dumpId?: string;
  signalId?: string;
  theoryId?: string;
  tripwireVersion?: number;
  lookbackSince?: string;
  lookbackUntil?: string;
  cursor?: string;
}

/** Each producer handles one bounded page; durable children own model retries/cost. */
export async function fanoutTripwireLookback(db: AgentDatabase, tools: ToolLayer, job: Job, payload: TripwirePayload, now = new Date()): Promise<void> {
  if (!payload.theoryId) throw new Error('Tripwire lookback needs a theory');
  const theory = await readTool<Row | null>(tools, 'getTheory', { id: payload.theoryId }, 'tripwire');
  const version = theory?.tripwireVersion ?? theory?.tripwire_version;
  if (!theory || theory.status !== 'held' || !theory.tripwire || theory.discardedAt || theory.discarded_at || theory.mergedIntoId || theory.merged_into_id || (payload.tripwireVersion !== undefined && payload.tripwireVersion !== version)) return;
  // Anchor retries to the original setTripwire event rather than shifting the
  // 90-day window each time a page waits for tomorrow's spend allowance.
  const until = payload.lookbackUntil ?? job.created_at;
  const since = payload.lookbackSince ?? new Date(new Date(until).getTime() - 90 * 86_400_000).toISOString();
  const page = await readTool<{ signals: { id: string }[]; signalPage: { nextCursor: string | null } }>(tools, 'listRecentSignals', { since, until, cursor: payload.cursor, limit: 100 }, 'tripwire');
  db.transaction(() => {
    for (const signal of page.signals) enqueue(db, 'tripwire', { signalId: signal.id, theoryId: theory.id, tripwireVersion: version }, { dedupeKey: `tripwire:theory:${theory.id}:${version}:signal:${signal.id}`, now });
    if (page.signalPage.nextCursor) enqueue(db, 'tripwire', { theoryId: theory.id, tripwireVersion: version, lookbackSince: since, lookbackUntil: until, cursor: page.signalPage.nextCursor }, { dedupeKey: `tripwire:theory:${theory.id}:${version}:page:${page.signalPage.nextCursor}`, now });
  })();
}
