import { ulid } from 'ulid';
import { createDatabase, migrate } from '../db/index.js';
import { createTools } from '../tools/index.js';
import type { Job } from './queue.js';

export function tripwireFixture() {
  process.env.AGENT_MODE = 'fake'; process.env.DAILY_SPEND_CAP_USD = '5';
  const db = createDatabase(); migrate(db); const tools = createTools(db); const now = new Date();
  const person = { kind: 'person' as const, id: 'maggie' };
  db.prepare('INSERT OR IGNORE INTO people(id,name,created_at) VALUES(?,?,?)').run('maggie', 'Maggie', now.toISOString());
  const theory = tools.call('writeTheory', { claim: 'Agents keep project memory across months' }, person);
  const addSignal = (date: Date, gist = 'A new assistant memory feature was withdrawn after privacy complaints.') => {
    const id = ulid(); const at = date.toISOString();
    db.prepare('INSERT INTO signals(id,owner_id,gist,note,created_at,created_by,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?)').run(id, 'maggie', gist, '', at, 'person:maggie', at, 'person:maggie');
    return id;
  };
  const jobs = () => db.prepare('SELECT * FROM jobs ORDER BY created_at,id').all() as Job[];
  const startLookback = () => {
    const updated = tools.call('setTripwire', { id: theory.id, tripwire: 'a memory feature is withdrawn after privacy complaints' }, person);
    return { theory: updated, producer: jobs().find(job => { const payload = JSON.parse(job.payload_json); return payload.theoryId === theory.id && !payload.signalId; })! };
  };
  const hits = () => (db.prepare("SELECT payload_json FROM suggestions WHERE kind='challenge'").all() as { payload_json: string }[]).map(row => JSON.parse(row.payload_json));
  return { db, tools, now, person, theory, addSignal, jobs, startLookback, hits };
}
