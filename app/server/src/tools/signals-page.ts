import { z } from 'zod';
import type { Database } from '../db/index.js';

export type SignalPageOptions = { cursor?: string; limit?: string | number; since?: string; until?: string };
export type SignalPage = { nextCursor: string | null; total: number; limit: number };
const cursorSchema = z.object({ createdAt: z.iso.datetime(), id: z.string().min(1).max(256) }).strict();
const active = 'owner_id=? AND discarded_at IS NULL AND merged_into_id IS NULL AND deleted_by_dump_id IS NULL';

function decodeCursor(cursor: string) {
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(cursor) || cursor.length > 1024) throw new Error();
    const bytes = Buffer.from(cursor, 'base64url');
    if (bytes.toString('base64url') !== cursor) throw new Error();
    return cursorSchema.parse(JSON.parse(bytes.toString('utf8')));
  } catch { throw new Error('Invalid signal cursor'); }
}

// The cursor carries the sort keys so discarding its boundary signal cannot move the next page.
export function selectSignalPage(db: Database, options: SignalPageOptions = {}, ownerId = 'maggie'): { ids: string[]; signalPage: SignalPage } {
  const limit = z.coerce.number().int().min(1).max(200).parse(options.limit ?? 100);
  const since = options.since === undefined ? undefined : z.iso.datetime().parse(options.since);
  const until = options.until === undefined ? undefined : z.iso.datetime().parse(options.until);
  if (since && until && since > until) throw new Error('Invalid signal date range');
  const cursor = options.cursor === undefined ? undefined : decodeCursor(options.cursor);
  const range = `${since ? ' AND created_at>=?' : ''}${until ? ' AND created_at<=?' : ''}`;
  const filteredParams = [ownerId, ...(since ? [since] : []), ...(until ? [until] : [])];
  const after = cursor ? ' AND (created_at>? OR (created_at=? AND id>?))' : '';
  const params = cursor ? [...filteredParams, cursor.createdAt, cursor.createdAt, cursor.id, limit + 1] : [...filteredParams, limit + 1];
  const rows = db.prepare(`SELECT id,created_at FROM signals WHERE ${active}${range}${after} ORDER BY created_at,id LIMIT ?`).all(...params) as { id: string; created_at: string }[];
  const visible = rows.slice(0, limit);
  const last = visible.at(-1);
  const nextCursor = rows.length > limit && last ? Buffer.from(JSON.stringify({ createdAt: last.created_at, id: last.id })).toString('base64url') : null;
  const { total } = db.prepare(`SELECT COUNT(*) total FROM signals WHERE ${active}${range}`).get(...filteredParams) as { total: number };
  return { ids: visible.map(row => row.id), signalPage: { nextCursor, total, limit } };
}
