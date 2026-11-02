import { it, expect } from 'vitest';
import { createDatabase, migrate } from '../db/index.js';
import { createTools } from '../tools/index.js';
import { updateDumpStatus } from '../tools/dumps.js';
import { processJobs } from './runner.js';
import { enqueue } from './queue.js';

it('settles a retried child job to done without rerunning the completed parent', async () => {
  const db = createDatabase(); migrate(db);
  db.prepare('INSERT OR IGNORE INTO people(id,name,created_at) VALUES(?,?,?)').run('maggie', 'Maggie', new Date().toISOString());
  const tools = createTools(db);
  const dump = tools.call('captureDump', { text: 'A child-job retry fixture' }, { kind: 'person', id: 'maggie' });
  db.prepare("UPDATE jobs SET status='done' WHERE kind='process_dump'").run();
  enqueue(db, 'link_evidence', { dumpId: dump.id, signalId: 'fixture' });
  updateDumpStatus(db, { id: dump.id, status: 'received' });
  const kinds: string[] = [];
  try {
    await processJobs(db, tools, { handler: async job => { kinds.push(job.kind); } });
    expect(kinds).toEqual(['link_evidence']);
    expect(tools.call('getDump', { id: dump.id }, { kind: 'person', id: 'maggie' }).status).toBe('done');
  } finally { db.close(); }
});
