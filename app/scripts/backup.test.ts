import { it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createDatabase, migrate } from '../server/src/db/index.js';
import { createTools } from '../server/src/tools/index.js';
import { backup } from './backup.js';

it('backs up the latest committed dump and media into an independent database', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'aber-backup-'));
  const data = resolve(directory, 'source');
  await mkdir(resolve(data, 'media'), { recursive: true });
  const db = createDatabase(resolve(data, 'aber.db')); migrate(db);
  db.prepare('INSERT OR IGNORE INTO people(id,name,created_at) VALUES(?,?,?)').run('maggie', 'Maggie', new Date().toISOString());
  const dump = createTools(db).call('captureDump', { text: 'The latest observation' }, { kind: 'person', id: 'maggie' }) as { id: string };
  await writeFile(resolve(data, 'media', 'sample.txt'), 'test media');
  try {
    const destination = await backup(data, resolve(directory, 'backup'));
    const restored = createDatabase(resolve(destination, 'aber.db'));
    try { expect(restored.prepare('SELECT text FROM dumps WHERE id=?').get(dump.id)).toEqual({ text: 'The latest observation' }); }
    finally { restored.close(); }
    expect(await readFile(resolve(destination, 'media', 'sample.txt'), 'utf8')).toBe('test media');
  } finally { db.close(); await rm(directory, { recursive: true, force: true }); }
});
