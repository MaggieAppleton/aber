import type { Database } from '../db/index.js';
import { getWorld } from './queries.js';
import type { Row } from './core.js';

export function searchMaterial(db: Database, ownerId: string, text: string, limit: number): Row[] {
  const world = getWorld(db, ownerId);
  const needle = text.toLowerCase();
  const material = ['themes', 'theories', 'signals', 'prototypes'].flatMap(key => world[key].map((row: Row) => ({ ...row, kind: key === 'theories' ? 'theory' : key.slice(0, -1) })));
  const dumps = world.dumps.map((dump: Row) => ({
    id: dump.id, kind: 'dump', text: dump.text, first: dump.first,
    label: dump.text || dump.transcripts[0]?.text || dump.first,
    transcripts: dump.transcripts.map((transcript: Row) => ({ text: transcript.text })),
    status: dump.status, capturedAt: dump.capturedAt, capturedFrom: dump.capturedFrom,
    deletedAt: dump.deletedAt, purgeAfter: dump.purgeAfter,
  }));
  return [...material, ...dumps].filter(row => `${row.name ?? ''} ${row.claim ?? ''} ${row.gist ?? ''} ${row.body ?? ''} ${row.text ?? ''} ${(row.transcripts ?? []).map((transcript: Row) => transcript.text).join(' ')}`.toLowerCase().includes(needle)).slice(0, limit);
}
