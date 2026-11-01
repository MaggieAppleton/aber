import { afterEach, beforeEach, expect, it } from 'vitest';
import { MockLanguageModelV4 } from 'ai/test';
import type { LanguageModel, UIMessage } from 'ai';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools } from '../tools/index.js';
import { streamAgent } from './run.js';
import { scriptedModel } from './scripted-model.js';

let db: Database;
let tools: ReturnType<typeof createTools>;
let dumpId: string;
const messages: UIMessage[] = [{ id: 'stream-user', role: 'user', parts: [{ type: 'text', text: 'Synthetic stream question?' }] }];
beforeEach(() => {
  process.env.AGENT_MODE = 'fake'; process.env.DAILY_SPEND_CAP_USD = '5';
  db = createDatabase(); migrate(db); tools = createTools(db);
  dumpId = tools.call('captureDump', { text: 'Synthetic stream question?' }, { kind: 'person', id: 'maggie' }).id;
});
afterEach(() => db.close());
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }
const run = () => db.prepare("SELECT status,error,input_tokens,output_tokens,cost_usd FROM agent_runs WHERE job='chat'").get();
const replyCount = () => (db.prepare('SELECT COUNT(*) n FROM replies WHERE dump_id=?').get(dumpId) as { n: number }).n;
function reply(parts: UIMessage['parts'], runId: string) {
  tools.call('reply', { dumpId, parts }, { kind: 'agent', job: 'chat', runId, dumpId });
}
function response(model: LanguageModel, onReply = reply, signal?: AbortSignal) {
  return streamAgent(db, {
    job: 'chat', provider: 'openai', promptVersion: 'stream-regression', system: 'Synthetic fixture',
    maxSteps: 1, maxInputTokens: 99_000, model, tools: () => ({}),
  }, { messages }, { dumpId, signal, onReply });
}

it('keeps the run running until its asynchronous reply is saved', async () => {
  const saving = deferred(), release = deferred();
  const result = await response(scriptedModel([{ text: 'A complete saved answer.' }]), async (parts, runId) => {
    saving.resolve(); await release.promise; reply(parts, runId);
  });
  const consumed = result.text();
  await saving.promise;
  const beforeSave = run();
  release.resolve(); await consumed;
  expect(beforeSave).toMatchObject({ status: 'running', error: null });
  expect(run()).toMatchObject({ status: 'done', error: null });
  expect(replyCount()).toBe(1);
});

it('records an asynchronous reply failure without losing completed provider usage', async () => {
  const result = await response(scriptedModel([{ text: 'An answer whose persistence fails.' }]), async () => {
    await Promise.resolve(); throw new Error('Synthetic reply persistence failure');
  });
  await expect(result.text()).rejects.toThrow('Synthetic reply persistence failure');
  expect(run()).toMatchObject({ status: 'failed', error: 'Error: Synthetic reply persistence failure', input_tokens: 120, output_tokens: 35, cost_usd: 0.000295 });
  expect(replyCount()).toBe(0);
});

it('records failure if the terminal run update is rejected after saving the reply', async () => {
  db.exec("CREATE TRIGGER reject_success BEFORE UPDATE OF status ON agent_runs WHEN NEW.status='done' BEGIN SELECT RAISE(ABORT,'Synthetic terminal persistence failure'); END");
  const result = await response(scriptedModel([{ text: 'A complete saved answer.' }]));
  await expect(result.text()).rejects.toThrow('Synthetic terminal persistence failure');
  expect(run()).toMatchObject({ status: 'failed', error: expect.stringContaining('Synthetic terminal persistence failure'), input_tokens: 120, output_tokens: 35 });
  expect(replyCount()).toBe(1);
});

it('cannot become successful when aborted while waiting for reply acknowledgement', async () => {
  const stop = new AbortController(), saving = deferred(), release = deferred();
  const result = await response(scriptedModel([{ text: 'A complete answer.' }]), async (parts, runId) => {
    saving.resolve(); await release.promise; reply(parts, runId);
  }, stop.signal);
  const consumed = result.text();
  await saving.promise;
  stop.abort(new Error('Synthetic user stop')); release.resolve(); await consumed;
  expect(run()).toMatchObject({ status: 'failed', error: expect.stringContaining('aborted') });
});

it('keeps provider failure terminal and never saves its partial answer', async () => {
  const model = new MockLanguageModelV4({ doStream: async () => ({ stream: new ReadableStream({ start(controller) {
    controller.enqueue({ type: 'stream-start', warnings: [] });
    controller.enqueue({ type: 'text-start', id: 'text' });
    controller.enqueue({ type: 'text-delta', id: 'text', delta: 'Partial answer' });
    controller.enqueue({ type: 'error', error: new Error('Synthetic provider failure') });
    controller.enqueue({ type: 'text-end', id: 'text' });
    controller.enqueue({ type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage: { inputTokens: { total: 120, noCache: 120, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 35, text: 35, reasoning: 0 } } });
    controller.close();
  } }) }) });
  const result = await response(model);
  expect(await result.text()).toContain('Synthetic provider failure');
  expect(run()).toMatchObject({ status: 'failed', error: 'Error: Synthetic provider failure', input_tokens: 120, output_tokens: 35 });
  expect(replyCount()).toBe(0);
});

it('does not save a partial reply after the request is aborted', async () => {
  const stop = new AbortController();
  const model = new MockLanguageModelV4({ doStream: async () => ({ stream: new ReadableStream({ start(controller) {
    controller.enqueue({ type: 'stream-start', warnings: [] });
    controller.enqueue({ type: 'text-start', id: 'text' });
    controller.enqueue({ type: 'text-delta', id: 'text', delta: 'Partial answer' });
  } }) }) });
  const result = await response(model, reply, stop.signal);
  const reader = result.body!.getReader(), decoder = new TextDecoder();
  let body = '';
  while (!body.includes('Partial answer')) {
    const chunk = await reader.read();
    if (chunk.done) throw new Error('Synthetic stream ended before its partial answer');
    body += decoder.decode(chunk.value);
  }
  stop.abort(new Error('Synthetic user stop'));
  while (!(await reader.read()).done) { /* Consume the terminal abort event. */ }
  expect(run()).toMatchObject({ status: 'failed', error: expect.stringContaining('aborted') });
  expect(replyCount()).toBe(0);
});
