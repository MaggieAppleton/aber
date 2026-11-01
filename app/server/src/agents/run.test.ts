import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { seed } from '../seed.js';
import { createTools, definitions } from '../tools/index.js';
import { agentTools } from './tools.js';
import { assertInputLimit, runAgent } from './run.js';
import { scriptedModel, toolOutputs } from './scripted-model.js';
import { modelFor, models } from './models.js';
import { PROCESS_TOOLS, READ_TOOLS, DISPLAY_TOOLS, EVIDENCE_TOOLS, TRIPWIRE_TOOLS } from './types.js';
let db: Database;
beforeEach(() => { db = createDatabase(); migrate(db); process.env.AGENT_MODE = 'fake'; process.env.DAILY_SPEND_CAP_USD = '5'; });
afterEach(() => db.close());

it('uses provider objects for every configured job and an SDK mock in fake mode', () => {
  for (const choice of Object.values(models)) {
    expect(typeof choice.primary.model).toBe('object'); expect(typeof choice.alternative.model).toBe('object');
  }
  expect(modelFor('chat')).toMatchObject({ specificationVersion: 'v4', provider: 'aber.fixture' });
});
it('never offers person tools in any agent tool set', () => {
  const tools = createTools(db);
  for (const names of [PROCESS_TOOLS, READ_TOOLS, DISPLAY_TOOLS, EVIDENCE_TOOLS, TRIPWIRE_TOOLS]) {
    const wrapped = agentTools(tools, names, 'process_dump', 'fixture');
    for (const name of Object.keys(wrapped)) { expect(definitions[name].who).not.toBe('person'); expect(wrapped[name].inputSchema).toBe(tools.schemas[name]); }
  }
});
it('records authority errors as tool results, while leaving a held theory untouched', async () => {
  seed(db); const tools = createTools(db);
  const result = await runAgent(db, {
    job: 'process_dump', promptVersion: 'authority-v1', system: 'Fixture', maxSteps: 3, maxInputTokens: 99_000,
    model: scriptedModel([{ calls: [{ toolName: 'editDraftTheory', input: { id: 't1', claim: 'Forbidden replacement' } }] }, { text: 'I must propose that change.' }]),
    tools: runId => agentTools(tools, ['editDraftTheory'], 'process_dump', runId),
  }, { prompt: 'Fixture' });
  expect(JSON.stringify(result.trace)).toContain('AuthorityError');
  expect(tools.call('getTheory', { id: 't1' }, { kind: 'person', id: 'maggie' }).claim).toBe('Tokens become nearly free for routine work');
  expect(db.prepare('SELECT status,input_tokens,output_tokens,prompt_version FROM agent_runs WHERE id=?').get(result.runId)).toMatchObject({ status: 'done', input_tokens: 240, output_tokens: 70, prompt_version: 'authority-v1' });
});
it('projects rich seeded reads before the next model request and prevents recursive run traces', async () => {
  seed(db); const tools = createTools(db);
  const dump = tools.call('captureDump', { text: 'A rich seeded context fixture.' }, { kind: 'person', id: 'maggie' });
  const job = db.prepare("SELECT id FROM jobs WHERE kind='process_dump'").get() as { id: string };
  db.prepare("INSERT INTO agent_runs(id,job_id,job,provider,model,prompt_version,status,started_at,trace_json) VALUES('history',?,'process_dump','fake','fixture','v1','done',?,?)").run(job.id, new Date().toISOString(), JSON.stringify([{ output: 'Old audit content. '.repeat(25_000) }]));
  let receivedBytes = 0;
  const reads = [
    { toolName: 'getDump', input: { id: dump.id } },
    { toolName: 'lookupSignals', input: { urls: [] } },
    { toolName: 'similarSignals', input: { text: 'models', limit: 8 } },
    { toolName: 'similarSignals', input: { text: 'cost', limit: 8 } },
    { toolName: 'similarTheories', input: { text: 'intelligence', limit: 8 } },
    { toolName: 'listTripwires', input: { text: 'memory', limit: 10 } },
  ];
  const result = await runAgent(db, {
    job: 'process_dump', promptVersion: 'projection-v1', system: 'Fixture', maxSteps: 3, maxInputTokens: 99_000,
    model: scriptedModel([{ calls: reads }, options => { receivedBytes = Buffer.byteLength(JSON.stringify(options.prompt)); return { text: 'Read safely.' }; }]),
    tools: runId => agentTools(tools, READ_TOOLS, 'process_dump', runId, dump.id),
  }, { prompt: 'Inspect this seeded world' }, { jobId: job.id });
  expect(receivedBytes).toBeLessThan(35_000); expect(result.text).toBe('Read safely.');
  const trace = db.prepare('SELECT trace_json FROM agent_runs WHERE id=?').get(result.runId) as { trace_json: string };
  expect(trace.trace_json.length).toBeLessThan(300_000);
});
it('rejects an oversized input before a provider request', async () => {
  expect(() => assertInputLimit('Fixture', 'x'.repeat(100_000), {}, 99_000)).toThrow('safety bound');
});
it('bounds image tokens without treating encoded image bytes as text', async () => {
  const binary = Buffer.alloc(600_000);
  expect(() => assertInputLimit('Inspect the image', { messages: [{ role: 'user', content: [{ type: 'file', data: binary, mediaType: 'image/jpeg' }] }] }, {}, 99_000)).not.toThrow();
  const result = await runAgent(db, {
    job: 'process_dump', promptVersion: 'image-v1', system: 'Inspect the image', maxSteps: 1, maxInputTokens: 99_000,
    model: scriptedModel([{ text: 'Image request reached the SDK.' }]), tools: () => ({}),
  }, { messages: [{ role: 'user', content: [{ type: 'file', data: binary, mediaType: 'image/jpeg' }] }] });
  expect(result.text).toBe('Image request reached the SDK.');
});
it('semantically ranks model-invoked reads and bounds their candidate counts', async () => {
  seed(db); const tools = createTools(db);
  for (let index = 0; index < 12; index++) tools.call('writeTheory', { claim: `Synthetic memory hypothesis ${index}`, tripwire: `memory result ${index} is withdrawn` }, { kind: 'person', id: 'maggie' });
  let theoryCount = 0, tripwireCount = 0;
  await runAgent(db, {
    job: 'chat', promptVersion: 'semantic-v1', system: 'Fixture', maxSteps: 3, maxInputTokens: 99_000,
    model: scriptedModel([{ calls: [{ toolName: 'similarTheories', input: { text: 'memory recall', limit: 100 } }, { toolName: 'listTripwires', input: { text: 'memory withdrawn', limit: 100 } }] }, options => {
      theoryCount = (toolOutputs(options, 'similarTheories')[0] as unknown[]).length;
      tripwireCount = (toolOutputs(options, 'listTripwires')[0] as unknown[]).length;
      return { text: 'Retrieved candidates.' };
    }]),
    tools: runId => agentTools(tools, ['similarTheories', 'listTripwires', 'setConfidence'], 'chat', runId, undefined, { db }),
  }, { prompt: 'Fixture' });
  expect(theoryCount).toBe(8); expect(tripwireCount).toBe(10);
  expect((db.prepare("SELECT COUNT(*) n FROM agent_runs WHERE job='embedding'").get() as { n: number }).n).toBeGreaterThan(20);
  expect(Object.keys(agentTools(tools, ['setConfidence'], 'chat', 'any'))).toEqual([]);
});
