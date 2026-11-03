import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import { config } from '../server/src/config.js';

export interface ReviewOptions { limit: number; pool: number; seed: string }
type Capture = { id: string; text: string; captured_at: string };
type Signal = { id: string; gist: string; note: string; fetched_json: string | null };
type Run = { id: string; model: string; trace_json: string | null };

export function reviewOptions(args: string[]): ReviewOptions & { database: string } {
  const allowed = ['--db', '--limit', '--pool', '--seed'];
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!allowed.includes(key) || !value || value.startsWith('--') || values.has(key)) {
      throw new Error('Usage: npm run review:processing -- [--db path] [--limit 10] [--pool 100] [--seed YYYY-MM-DD]');
    }
    values.set(key, value);
  }
  const limit = Number(values.get('--limit') ?? 10), pool = Number(values.get('--pool') ?? 100);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100
    || !Number.isSafeInteger(pool) || pool < limit || pool > 1000) {
    throw new Error('Review requires 1 <= limit <= 100 and limit <= pool <= 1000');
  }
  return {
    database: resolve(values.get('--db') ?? resolve(config.dataDir, 'aber.db')),
    limit, pool, seed: values.get('--seed') ?? new Date().toISOString().slice(0, 10),
  };
}

export function processingQualityReport(db: Database.Database, options: ReviewOptions) {
  if (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 100
    || !Number.isSafeInteger(options.pool) || options.pool < options.limit || options.pool > 1000 || !options.seed) {
    throw new Error('Invalid processing review sample options');
  }
  return db.transaction(() => {
    const candidates = db.prepare(`SELECT id,text,captured_at FROM dumps
      WHERE status='done' AND is_ask=0 AND deleted_at IS NULL
      ORDER BY captured_at DESC,id DESC LIMIT ?`).all(options.pool) as Capture[];
    const key = (id: string) => createHash('sha256').update(JSON.stringify([options.seed, id])).digest('hex');
    const selected = candidates.sort((a, b) => key(a.id).localeCompare(key(b.id))).slice(0, options.limit);
    const captures = selected.map(capture => {
      const signals = db.prepare(`SELECT s.id,s.gist,s.note,s.fetched_json,s.created_by,s.updated_by,
        s.discarded_at,s.merged_into_id,s.deleted_by_dump_id,s.run_id
        FROM signals s JOIN signal_origins o ON o.signal_id=s.id WHERE o.dump_id=? ORDER BY s.id`)
        .all(capture.id) as Signal[];
      const runs = db.prepare(`SELECT r.* FROM agent_runs r
        WHERE r.job='process_dump' AND (
          EXISTS (SELECT 1 FROM jobs j WHERE j.id=r.job_id AND json_extract(j.payload_json,'$.dumpId')=?)
          OR EXISTS (SELECT 1 FROM events e WHERE e.run_id=r.id AND e.dump_id=?)
          OR EXISTS (SELECT 1 FROM replies p WHERE p.run_id=r.id AND p.dump_id=?)
          OR EXISTS (SELECT 1 FROM signal_origins o JOIN signals s ON s.id=o.signal_id
            WHERE o.dump_id=? AND (o.run_id=r.id OR s.run_id=r.id))
        ) ORDER BY r.started_at,r.id`).all(capture.id, capture.id, capture.id, capture.id) as Run[];
      return {
        ...capture,
        transcripts: db.prepare('SELECT text,provider,model FROM transcripts WHERE dump_id=? ORDER BY media_id').all(capture.id),
        attachments: db.prepare('SELECT kind,url,title,media_id FROM dump_attachments WHERE dump_id=? ORDER BY position').all(capture.id),
        signals: signals.map(({ fetched_json, ...signal }) => ({
          ...signal, fetched: fetched_json === null ? null : JSON.parse(fetched_json),
          sources: db.prepare('SELECT url,title,author,own_observation FROM signal_sources WHERE signal_id=? ORDER BY position').all(signal.id),
          themes: db.prepare(`SELECT t.id,t.name,t.status,t.discarded_at,t.merged_into_id,st.created_by,st.run_id
            FROM themes t JOIN signal_themes st ON st.theme_id=t.id WHERE st.signal_id=? ORDER BY t.id`).all(signal.id),
        })),
        events: db.prepare('SELECT tool,object_kind,object_id,run_id,at FROM events WHERE dump_id=? ORDER BY at,id').all(capture.id),
        runs: runs.map(({ trace_json, ...run }) => ({ ...run, trace: trace_json === null ? null : JSON.parse(trace_json) })),
        review: {
          gistSupportedBySource: null, separateFindingsPreserved: null, noMissingFindings: null,
          filingsAppropriate: null, noMissingFilings: null, draftsAppropriate: null, notes: '',
        },
        warnings: runs.length ? [] : ['No linked processing trace found; source and current outputs alone cannot establish the original decisions.'],
      };
    });
    return {
      version: 'processing-quality-v1',
      warning: 'Local review material may contain private capture/source text. Do not commit or upload it. This report is not an automated accuracy score.',
      sampling: { ...options, eligibleInPool: candidates.length, sampled: captures.length, method: 'Lowest SHA256(seed,capture ID) from most recent completed non-chat captures; includes captures with no signals.' },
      instructions: 'Compare each source with gists, check independent findings, inspect current and missing theme filings against themeCatalog, and inspect draft events and full run traces/Jev decisions. Fill review booleans/notes in a local copy. Current rows may include later human edits; inspect provenance. No database changes or provider calls are made.',
      themeCatalog: db.prepare('SELECT id,name,status,discarded_at,merged_into_id FROM themes ORDER BY name,id').all(),
      captures,
    };
  }).deferred();
}

export function readProcessingQuality(database: string, options: ReviewOptions) {
  const db = new Database(database, { readonly: true, fileMustExist: true });
  try { return processingQualityReport(db, options); }
  finally { db.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { database, ...options } = reviewOptions(process.argv.slice(2));
  console.log(JSON.stringify(readProcessingQuality(database, options), null, 2));
}
