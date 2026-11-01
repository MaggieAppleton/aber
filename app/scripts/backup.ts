import { resolve } from 'node:path';
import { mkdir, cp, access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import { config, appDir } from '../server/src/config.js';

export async function backup(dataDir = config.dataDir, destination = resolve(appDir, 'backups', new Date().toISOString().replace(/[:.]/g, '-'))) {
  await mkdir(destination, { recursive: true, mode: 0o700 });
  const db = new Database(resolve(dataDir, 'aber.db'), { readonly: true });
  try {
    await db.backup(resolve(destination, 'aber.db'));
    await cp(resolve(dataDir, 'media'), resolve(destination, 'media'), { recursive: true });
    const snapshot = new Database(resolve(destination, 'aber.db'), { readonly: true });
    try {
      const media = snapshot.prepare('SELECT path FROM media').all() as { path: string }[];
      for (const item of media) await access(resolve(destination, 'media', item.path));
    } finally { snapshot.close(); }
    return destination;
  } finally { db.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(await backup());
}
