import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { seed } from '../seed.js';
import { createTools } from '../tools/index.js';
import { createChatResponse } from './chat.js';
let db: Database;
let tools: ReturnType<typeof createTools>;
beforeEach(() => { process.env.AGENT_MODE = 'fake'; db = createDatabase(); migrate(db); seed(db); tools = createTools(db); });
afterEach(() => db.close());

it('captures a question before streaming a theory card and evidence split, then persists UI parts', async () => {
  const response = await createChatResponse(db, tools, { messages: [{ id: 'user-1', role: 'user', parts: [{ type: 'text', text: 'What supports this theory?' }] }], context: [{ kind: 'theory', id: 't1', label: 'Tokens become nearly free' }] });
  const dumpId = response.headers.get('X-Aber-Dump-Id')!;
  const dump = db.prepare('SELECT is_ask FROM dumps WHERE id=?').get(dumpId);
  expect(dump).toEqual({ is_ask: 1 });
  const stream = await response.text(); expect(stream).toContain('showTheory'); expect(stream).toContain('showEvidenceSplit');
  const reply = db.prepare('SELECT parts_json FROM replies WHERE dump_id=?').get(dumpId) as { parts_json: string };
  expect(JSON.parse(reply.parts_json).map((part: any) => part.type)).toEqual(expect.arrayContaining(['tool-showTheory', 'tool-showEvidenceSplit', 'text']));
  expect(db.prepare("SELECT status FROM agent_runs WHERE job='chat'").get()).toEqual({ status: 'done' });
});
it('reuses an existing voice dump', async () => {
  const dump = tools.call('captureDump', { text: 'Voice material already captured.' }, { kind: 'person', id: 'maggie' });
  const count = (db.prepare('SELECT COUNT(*) n FROM dumps').get() as { n: number }).n;
  const response = await createChatResponse(db, tools, { dumpId: dump.id, messages: [{ id: 'voice', role: 'user', parts: [{ type: 'text', text: 'Show me recent signals' }] }] });
  expect(await response.text()).toContain('showSignalList');
  expect((db.prepare('SELECT COUNT(*) n FROM dumps').get() as { n: number }).n).toBe(count);
});
it('streams theme activity for an open theme', async () => {
  const response = await createChatResponse(db, tools, { messages: [{ id: 'theme', role: 'user', parts: [{ type: 'text', text: 'What is new?' }] }], context: [{ kind: 'theme', id: 'cost', label: 'Cost of intelligence' }] });
  expect(await response.text()).toContain('showThemeActivity');
});
