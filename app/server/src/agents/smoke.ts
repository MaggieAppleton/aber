import '../config.js';
import { createDatabase, migrate } from '../db/index.js';
import { runAgent } from './run.js';
import { choiceFor } from './models.js';
import type { ProviderName } from './types.js';

process.env.AGENT_MODE = 'live';
const db = createDatabase(); migrate(db);
let failures = 0;
try {
  for (const provider of ['openai', 'anthropic'] as const satisfies ProviderName[]) {
    if (!process.env[provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY']) {
      console.log(`${provider}: skipped (key absent)`); continue;
    }
    const choice = choiceFor('chat', provider);
    try {
      const result = await runAgent(db, {
        job: 'chat', provider, model: choice.model, promptVersion: 'provider-smoke-v1',
        system: 'Provider connectivity check. Reply with OK only.', tools: () => ({}),
        maxSteps: 1, maxInputTokens: 20_000, maxOutputTokens: 64,
      }, { prompt: 'Reply OK.' });
      if (!result.text.trim()) throw new Error('Provider returned no text');
      console.log(`${provider}: passed (${result.inputTokens} input / ${result.outputTokens} output tokens, $${result.costUsd.toFixed(6)})`);
    } catch (error) { failures++; console.error(`${provider}: failed: ${error instanceof Error ? error.message : error}`); }
  }
} finally { db.close(); }
process.exitCode = failures ? 1 : 0;
