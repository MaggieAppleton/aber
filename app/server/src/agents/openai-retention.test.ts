import { expect, test } from 'vitest';
import { createOpenAI } from '@ai-sdk/openai';
import { tool } from 'ai';
import { z } from 'zod';
import { createDatabase, migrate } from '../db/index.js';
import { runAgent, streamAgent } from './run.js';
import { scriptedModel } from './scripted-model.js';

test('multi-step OpenAI runs replay encrypted reasoning without stored response references', async () => {
  const requests: any[] = [];
  const provider = createOpenAI({ apiKey: 'offline-test', fetch: async (_url, init) => {
    const body = JSON.parse(String(init?.body)); requests.push(body);
    const output = requests.length === 1 ? [
      { type: 'reasoning', id: 'rs_fixture', summary: [], encrypted_content: 'opaque-fixture' },
      { type: 'function_call', id: 'fc_fixture', call_id: 'call_fixture', name: 'read', arguments: '{}', status: 'completed' },
    ] : [{ type: 'message', id: 'msg_fixture', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'Done.', annotations: [] }] }];
    return Response.json({ id: `resp_${requests.length}`, object: 'response', created_at: 0, model: 'gpt-6-luna', status: 'completed', output,
      usage: { input_tokens: 10, output_tokens: 10, total_tokens: 20, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } } });
  } });
  const db = createDatabase(':memory:'); migrate(db);
  try {
    await runAgent(db, { job: 'process_dump', provider: 'openai', model: provider.responses('gpt-6-luna'), system: 'Offline test', promptVersion: 'test', maxSteps: 3, maxInputTokens: 99000,
      tools: () => ({ read: tool({ inputSchema: z.object({}), execute: () => ({ found: true }) }) }),
    }, { prompt: 'Read, then finish.' });
    expect(requests).toHaveLength(2);
    expect(requests.every(request => request.store === false)).toBe(true);
    expect(requests[0].include).toContain('reasoning.encrypted_content');
    expect(requests[1].input.some((item: any) => item.type === 'item_reference')).toBe(false);
    expect(requests[1].input).toContainEqual(expect.objectContaining({ type: 'reasoning', encrypted_content: 'opaque-fixture' }));
  } finally { db.close(); }
});

test('streaming agents also disable provider response storage', async () => {
  let options: any;
  const model = scriptedModel([request => { options = request; return { text: 'Done.' }; }]);
  const db = createDatabase(':memory:'); migrate(db);
  try {
    const response = await streamAgent(db, { job: 'chat', provider: 'openai', model, system: 'Offline test', promptVersion: 'test', maxSteps: 1, maxInputTokens: 99000, tools: () => ({}) },
      { messages: [{ id: 'user', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }] }, { onReply: () => {} });
    await response.text();
    expect(options.providerOptions.openai.store).toBe(false);
  } finally { db.close(); }
});
