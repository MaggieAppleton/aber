import { AsyncLocalStorage } from 'node:async_hooks';
import { writeFileSync } from 'node:fs';
import type { Database } from '../server/src/db/index.js';

export type Row = Record<string, any>;
export interface EvalSnapshot {
  tables: Record<string, Row[]>;
  runs: Row[];
}
interface Observation {
  databasePath?: string;
  snapshot?: EvalSnapshot;
}
const observations = new AsyncLocalStorage<Observation>();
const tables = ['signals', 'signal_sources', 'signal_origins', 'signal_themes', 'suggestions', 'evidence', 'merges', 'replies', 'dumps', 'themes', 'theories', 'prototypes', 'events', 'stances'];

/** Opt-in eval observation only; ordinary fixture execution remains unchanged. */
export function retainEvaluation(db: Database): void {
  const observation = observations.getStore();
  if (!observation) return;
  observation.snapshot = {
    tables: Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT * FROM ${table}`).all() as Row[]])),
    runs: db.prepare("SELECT * FROM agent_runs WHERE provider NOT IN ('seed','synthetic') ORDER BY started_at,id").all() as Row[],
  };
  if (observation.databasePath) writeFileSync(observation.databasePath, db.serialize());
}

export async function withEvaluationObservation<T>(task: () => Promise<T>, databasePath?: string) {
  const observation: Observation = { databasePath };
  const value = await observations.run(observation, task);
  if (!observation.snapshot) throw new Error('Evaluation did not retain its final database');
  return { value, snapshot: observation.snapshot };
}
