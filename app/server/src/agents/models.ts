import type { LanguageModel } from 'ai';
import { openai, anthropic } from './providers.js';
import { scriptedModel } from './scripted-model.js';
import type { AgentJob, ProviderName } from './types.js';

export type ModelChoice = { provider: 'openai' | 'anthropic'; model: LanguageModel; inputPerMillion: number; outputPerMillion: number };

const terra: ModelChoice = { provider: 'openai', model: openai.responses('gpt-6.1-terra'), inputPerMillion: 1, outputPerMillion: 5 };
const luna: ModelChoice = { provider: 'openai', model: openai.responses('gpt-6-luna'), inputPerMillion: 0.1, outputPerMillion: 0.5 };
const sonnet: ModelChoice = { provider: 'anthropic', model: anthropic('claude-sonnet-5-5'), inputPerMillion: 2, outputPerMillion: 10 };
const haiku: ModelChoice = { provider: 'anthropic', model: anthropic('claude-haiku-5-5'), inputPerMillion: 0.1, outputPerMillion: 0.5 };

export const models = {
  process_dump: { primary: terra, alternative: sonnet },
  link_evidence: { primary: luna, alternative: haiku },
  tripwire: { primary: luna, alternative: haiku },
  near_dup: { primary: luna, alternative: haiku },
  chat: { primary: terra, alternative: sonnet },
} satisfies Record<Exclude<AgentJob, 'transcribe'>, { primary: ModelChoice; alternative: ModelChoice }>;

export const transcriptionModel = openai.transcription('gpt-transcribe');
export const embeddingModel = openai.embedding('text-embedding-3-small');

export function choiceFor(job: AgentJob, provider: ProviderName = 'openai'): ModelChoice {
  const config = models[job === 'transcribe' ? 'process_dump' : job];
  return provider === 'anthropic' ? config.alternative : config.primary;
}

export function modelFor(job: AgentJob, provider: ProviderName = 'openai'): LanguageModel {
  if (process.env.AGENT_MODE === 'fake') return scriptedModel([{ text: 'Synthetic fixture completed.' }]);
  return choiceFor(job, provider).model;
}

export function tokenCost(job: AgentJob, input: number, output: number, provider: ProviderName = 'openai'): number {
  if (provider === 'fake') return 0;
  const price = choiceFor(job, provider);
  return (input * price.inputPerMillion + output * price.outputPerMillion) / 1_000_000;
}
