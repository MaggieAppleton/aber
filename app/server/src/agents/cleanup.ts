import type { AgentDatabase } from './types.js';

export class CleanupBlockedError extends Error {
  constructor(message: string) { super(message); this.name = 'CleanupBlockedError'; }
}

type RunRow = { id: string; job: string; started_at: string; status: string };
type Column = { name: string };

/** Recovery is infrastructure, never an agent tool. It is all-or-nothing. */
export function clearRun(db: AgentDatabase, runId: string, options: { restoreMerge?: (db: AgentDatabase, id: string) => void; now?: Date } = {}): void {
  const run = db.prepare('SELECT * FROM agent_runs WHERE id=?').get(runId) as RunRow | undefined;
  if (!run || run.status === 'cleared') return;
  const actor = `agent:${run.job}:${run.id}`;
  const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[])
    .filter(row => /^[a-z_]+$/.test(row.name))
    .map(row => ({ name: row.name, columns: db.prepare(`PRAGMA table_info(${row.name})`).all() as Column[] }))
    .filter(table => table.columns.some(column => column.name === 'run_id'));

  const perform = db.transaction(() => {
    // First prove that no later person action or another run depends on an object
    // we would erase. If it does, leave the entire failed attempt for inspection.
    const laterAction = db.prepare("SELECT 1 FROM events later WHERE later.actor<>? AND EXISTS (SELECT 1 FROM events original WHERE original.run_id=? AND original.object_kind<>'dump' AND original.object_id=later.object_id AND original.object_kind=later.object_kind AND later.rowid>original.rowid) LIMIT 1").get(actor, runId);
    if (laterAction) throw new CleanupBlockedError('Recovery kept this attempt: a person or another run acted on one of its objects');
    for (const table of tables.filter(table => !['events', 'merges'].includes(table.name))) {
      const names = table.columns.map(column => column.name);
      if (names.includes('updated_by')) {
        const edited = db.prepare(`SELECT 1 FROM ${table.name} WHERE run_id=? AND updated_by IS NOT NULL AND updated_by<>? LIMIT 1`).get(runId, actor);
        if (edited) throw new CleanupBlockedError(`Recovery kept ${table.name}: a person or another run edited it after ${runId}`);
      }
      if (names.includes('id')) {
        const eventColumns = (db.prepare('PRAGMA table_info(events)').all() as Column[]).map(column => column.name);
        if (eventColumns.includes('object_id')) {
          const later = db.prepare(`SELECT 1 FROM events e WHERE e.object_id IN (SELECT id FROM ${table.name} WHERE run_id=?) AND e.actor<>? AND EXISTS (SELECT 1 FROM events original WHERE original.run_id=? AND original.object_id=e.object_id AND original.rowid<e.rowid) LIMIT 1`).get(runId, actor, runId);
          if (later) throw new CleanupBlockedError(`Recovery kept ${table.name}: a later action refers to its object`);
        }
      }
    }

    if (tables.some(table => table.name === 'merges')) {
      const touchedMerge = db.prepare("SELECT 1 FROM merges m JOIN events later ON later.object_id IN (m.survivor_id,m.absorbed_id) AND later.object_kind='signal' WHERE m.run_id=? AND m.undone_at IS NULL AND later.actor<>? AND later.rowid>COALESCE((SELECT MAX(original.rowid) FROM events original WHERE original.run_id=m.run_id AND original.object_id=m.id),0) LIMIT 1").get(runId, actor);
      if (touchedMerge) throw new CleanupBlockedError('Recovery kept a merge: a person or another run edited one of its signals');
      const merges = db.prepare('SELECT id FROM merges WHERE run_id=? AND undone_at IS NULL ORDER BY created_at DESC').all(runId) as { id: string }[];
      for (const merge of merges) {
        if (!options.restoreMerge) throw new CleanupBlockedError('Recovery needs the merge snapshot restorer');
        options.restoreMerge(db, merge.id);
      }
    }

    // Chained work cannot start until its parent run succeeds. Remove the queued
    // children along with the signal they would have read on the failed attempt.
    db.prepare("DELETE FROM jobs WHERE created_by=? AND status IN ('queued','failed')").run(actor);

    // Foreign keys, rather than a duplicated domain dependency graph, determine
    // deletion order. Every unsuccessful pass is still inside this transaction.
    let pending = tables.map(table => table.name);
    while (pending.length) {
      const blocked: string[] = [];
      let progress = false;
      for (const name of pending) {
        try {
          db.prepare(`DELETE FROM ${name} WHERE run_id=?`).run(runId);
          progress = true;
        } catch (error) {
          if (!(error instanceof Error) || !/FOREIGN KEY constraint failed/.test(error.message)) throw error;
          blocked.push(name);
        }
      }
      if (!blocked.length) break;
      if (!progress) throw new CleanupBlockedError(`Recovery kept ${blocked.join(', ')}: other data still refers to this run`);
      pending = blocked;
    }
    db.prepare("UPDATE agent_runs SET status='cleared',finished_at=? WHERE id=?").run((options.now ?? new Date()).toISOString(), runId);
  });

  try {
    perform();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    db.prepare("UPDATE agent_runs SET status='failed',error=?,finished_at=? WHERE id=?").run(`Clean-up blocked: ${message}`, (options.now ?? new Date()).toISOString(), runId);
    throw error instanceof CleanupBlockedError ? error : new CleanupBlockedError(message);
  }
}

export function clearFailedJobRuns(db: AgentDatabase, jobId: string, options: Parameters<typeof clearRun>[2] = {}): void {
  const runs = db.prepare("SELECT id FROM agent_runs WHERE job_id=? AND status<>'cleared' ORDER BY started_at DESC,id DESC").all(jobId) as { id: string }[];
  for (const run of runs) clearRun(db, run.id, options);
}
