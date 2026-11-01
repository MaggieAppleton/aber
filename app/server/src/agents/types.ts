import type Database from 'better-sqlite3';
import type { LanguageModel, ModelMessage, Tool, UIMessage } from 'ai';
import type { z } from 'zod';

export type AgentJob = 'transcribe' | 'process_dump' | 'link_evidence' | 'tripwire' | 'near_dup' | 'chat';
export type ProviderName = 'openai' | 'anthropic' | 'fake';
export type AgentActor = { kind: 'agent'; job: string; runId: string; dumpId?: string };
export type AgentDatabase = Database.Database;

/** The only application-data boundary available to an agent. */
export interface ToolLayer {
  call(name: string, input: unknown, actor: AgentActor | { kind: 'person'; id: string }): unknown | Promise<unknown>;
  schemas: Record<string, z.ZodType>;
  names: readonly string[];
  definitions?: Record<string, { who: string; description: string }>;
}

export interface AgentSpec {
  job: AgentJob;
  promptVersion: string;
  system: string;
  tools: (runId: string) => Record<string, Tool>;
  maxSteps: number;
  maxInputTokens: number;
  maxOutputTokens?: number;
  model?: LanguageModel;
  provider?: ProviderName;
}

export interface RunContext {
  jobId?: string;
  attempt?: number;
  dumpId?: string;
  now?: () => Date;
  signal?: AbortSignal;
}

export interface RunResult {
  runId: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  trace: unknown[];
}

export type AgentInput = { prompt: string } | { messages: ModelMessage[] };
export type ChatInput = { messages: UIMessage[] };

export const READ_TOOLS = ['getDump', 'lookupSignals', 'similarSignals', 'listThemes', 'listTheories', 'getTheory', 'getSignal', 'similarTheories', 'listTripwires', 'search'] as const;
export const PROCESS_TOOLS = [...READ_TOOLS, 'createSignal', 'attachOrigin', 'fileSignal', 'recordMention', 'createDraftTheme', 'createDraftTheory', 'editDraftTheory', 'createDraftPrototype', 'linkEvidence', 'linkTheoryTheme', 'linkFollows', 'proposeRevision', 'reply'] as const;
export const EVIDENCE_TOOLS = ['getSignal', 'similarTheories', 'getTheory', 'proposeEvidence', 'linkEvidence'] as const;
export const TRIPWIRE_TOOLS = ['getSignal', 'listTripwires', 'getTheory', 'proposeChallenge'] as const;
export const DISPLAY_TOOLS = ['showTheory', 'showEvidenceSplit', 'showSignalList', 'showThemeActivity'] as const;
