import { MockLanguageModelV4 } from 'ai/test';
import type { LanguageModelV4CallOptions, LanguageModelV4GenerateResult, LanguageModelV4StreamPart } from '@ai-sdk/provider';

export type ScriptStep = { text?: string; calls?: { toolName: string; input: unknown }[] };
export type StepFactory = (options: LanguageModelV4CallOptions) => ScriptStep;

/** These models exercise the real AI SDK loop and real tools without networking. */
export function scriptedModel(steps: (ScriptStep | StepFactory)[]): MockLanguageModelV4 {
  let index = 0;
  const generate = (options: LanguageModelV4CallOptions): LanguageModelV4GenerateResult => {
    const number = index++;
    const entry = steps[number] ?? { text: 'Synthetic fixture completed.' };
    const step = typeof entry === 'function' ? entry(options) : entry;
    const content: LanguageModelV4GenerateResult['content'] = [];
    if (step.text) content.push({ type: 'text', text: step.text });
    for (const [callIndex, call] of (step.calls ?? []).entries()) {
      content.push({ type: 'tool-call', toolCallId: `fixture-${number}-${callIndex}`, toolName: call.toolName, input: JSON.stringify(call.input) });
    }
    return {
      content,
      finishReason: { unified: step.calls?.length ? 'tool-calls' : 'stop', raw: undefined },
      usage: { inputTokens: { total: 120, noCache: 120, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 35, text: 35, reasoning: 0 } },
      warnings: [],
    };
  };
  return new MockLanguageModelV4({
    provider: 'aber.fixture', modelId: 'synthetic-script-v1',
    doGenerate: async options => generate(options),
    doStream: async options => {
      const result = generate(options);
      const chunks: LanguageModelV4StreamPart[] = [{ type: 'stream-start', warnings: [] }];
      for (const part of result.content) {
        if (part.type === 'text') chunks.push({ type: 'text-start', id: 'text' }, { type: 'text-delta', id: 'text', delta: part.text }, { type: 'text-end', id: 'text' });
        else if (part.type === 'tool-call') chunks.push(part);
      }
      chunks.push({ type: 'finish', finishReason: result.finishReason, usage: result.usage });
      return { stream: new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); } }) };
    },
  });
}

export function toolOutputs(options: LanguageModelV4CallOptions, name?: string): unknown[] {
  const calls = new Map<string, string>();
  for (const message of options.prompt) {
    if (message.role === 'assistant') for (const part of message.content) if (part.type === 'tool-call') calls.set(part.toolCallId, part.toolName);
  }
  const results: unknown[] = [];
  for (const message of options.prompt) {
    if (message.role !== 'tool') continue;
    for (const part of message.content) {
      if (part.type !== 'tool-result' || (name && calls.get(part.toolCallId) !== name)) continue;
      const output = part.output;
      results.push('value' in output ? output.value : output);
    }
  }
  return results;
}

export function outputId(output: unknown): string {
  if (output && typeof output === 'object' && 'id' in output && typeof output.id === 'string') return output.id;
  throw new Error('Synthetic fixture expected a tool result with an id');
}
