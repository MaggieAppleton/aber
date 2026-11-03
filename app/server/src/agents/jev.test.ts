import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { choice, noul } from '@typesafe-ai/sdk';
import { createDatabase, migrate } from '../db/index.js';
import { askJev, fakeChoice, jevMode, recordJevPolicy, withJevScript, JEV_MODEL } from './jev.js';
import type { AgentDatabase } from './types.js';

let db: AgentDatabase;
const questions = { direction: choice('How does the source relate to the claim?', { supports: 'Supports it', none: 'No evidence' }), grounded: noul('Is the claim supported by the source?') };
const request = { state: { source: 'Observed event', claim: 'An event happened' }, questions, questionVersion: 'test-q1', policyVersion: 'test-p1' };
const response = { model: JEV_MODEL, answers: { direction: fakeChoice(questions.direction.criteria, 'supports'), grounded: { type: 'noul', noul: 0.99 } }, usage: { input_tokens: 100, output_tokens: 2 } };
beforeEach(() => {
  db = createDatabase(); migrate(db);
  vi.stubEnv('AGENT_MODE', 'fake'); vi.stubEnv('DAILY_SPEND_CAP_USD', '5'); vi.stubEnv('JEV_MODE', 'off');
});
afterEach(() => { db.close(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('honors explicit off and validates job-specific modes and pinned models', async () => {
  expect(jevMode('link_evidence')).toBe('off');
  vi.stubEnv('JEV_LINK_EVIDENCE_MODE', 'shadow');
  expect(jevMode('link_evidence')).toBe('shadow');
  vi.stubEnv('JEV_LINK_EVIDENCE_MODE', 'enabled');
  expect(() => jevMode('link_evidence')).toThrow('Invalid Jev mode');
  vi.stubEnv('JEV_MODEL', 'jev-latest');
  await expect(askJev(db, 'tripwire', request)).rejects.toThrow('pinned version');
});

it('enables the four approved jobs by default, keeps duplicates off and preserves overrides', () => {
  vi.stubEnv('JEV_MODE', undefined);
  for (const job of ['link_evidence', 'tripwire', 'process_dump', 'chat', 'near_dup'] as const) {
    vi.stubEnv(`JEV_${job.toUpperCase()}_MODE`, undefined);
    expect(jevMode(job)).toBe(job === 'near_dup' ? 'off' : 'on');
  }
  vi.stubEnv('JEV_MODE', 'off');
  expect(jevMode('process_dump')).toBe('off');
  vi.stubEnv('JEV_PROCESS_DUMP_MODE', 'shadow');
  expect(jevMode('process_dump')).toBe('shadow');
  vi.stubEnv('JEV_PROCESS_DUMP_MODE', 'off');
  vi.stubEnv('JEV_MODE', 'on');
  expect(jevMode('process_dump')).toBe('off');
  vi.stubEnv('JEV_NEAR_DUP_MODE', 'off');
  expect(jevMode('near_dup')).toBe('off');
});

it('scripts typed judgments without network or keys and retains full versioned distributions', async () => {
  const fetch = vi.fn(() => { throw new Error('No network'); }); vi.stubGlobal('fetch', fetch);
  const result = await withJevScript(() => response, () => askJev(db, 'link_evidence', request));
  expect(result.answers.grounded.noul).toBe(0.99);
  recordJevPolicy(db, result.runId, { action: 'propose', fallback: false });
  const row = db.prepare('SELECT * FROM agent_runs').get() as Record<string, unknown>;
  expect(row).toMatchObject({ provider: 'fake', status: 'done', model: JEV_MODEL, cost_usd: 0, input_tokens: 100, prompt_version: 'test-q1' });
  const trace = JSON.parse(String(row.trace_json));
  expect(trace[0]).toMatchObject({ state: request.state, questions: JSON.parse(JSON.stringify(questions)), response, questionVersion: 'test-q1', policyVersion: 'test-p1' });
  expect(trace[1]).toMatchObject({ type: 'jev_policy', fallback: false });
  expect(fetch).not.toHaveBeenCalled();
});

it('defaults unscripted fake decisions to uncertainty, not fabricated approval', async () => {
  const result = await askJev(db, 'near_dup', request);
  expect(result.answers.grounded.noul).toBe(0.5);
  expect(result.answers.direction.confidence).toBe(0);
});

it('records live input-only cost and resolved model using the SDK', async () => {
  vi.stubEnv('AGENT_MODE', 'live'); vi.stubEnv('TYPESAFE_API_KEY', 'unit-test-not-a-key');
  const network = vi.fn(async (_input: string, _init?: RequestInit) => Response.json(response));
  vi.stubGlobal('fetch', network);
  const result = await askJev(db, 'tripwire', request);
  expect(result.model).toBe(JEV_MODEL);
  expect(network).toHaveBeenCalledTimes(1);
  expect(String(network.mock.calls[0]?.[0])).toContain('/v1/systemone');
  expect(db.prepare('SELECT provider,model,cost_usd,status FROM agent_runs').get()).toEqual({
    provider: 'typesafe', model: JEV_MODEL, cost_usd: 100 * 0.042 / 1_000_000, status: 'done',
  });
});

it('retains usage and resolved model but refuses a policy decision on an unexpected version', async () => {
  await expect(withJevScript(() => ({ ...response, model: 'jev-1.14.1' }), () => askJev(db, 'tripwire', request))).rejects.toThrow('instead of pinned');
  expect(db.prepare('SELECT model,status,input_tokens FROM agent_runs').get()).toEqual({ model: 'jev-1.14.1', status: 'failed', input_tokens: 100 });
});

it('persists billable usage even when a provider returns malformed judgments', async () => {
  vi.stubEnv('AGENT_MODE', 'live'); vi.stubEnv('TYPESAFE_API_KEY', 'unit-test-not-a-key');
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ...response, answers: {} })));
  await expect(askJev(db, 'tripwire', request)).rejects.toThrow();
  const row = db.prepare('SELECT status,cost_usd,trace_json FROM agent_runs').get() as { status: string; cost_usd: number; trace_json: string };
  expect(row.status).toBe('failed');
  expect(row.cost_usd).toBe(100 * 0.042 / 1_000_000);
});

it('does not retry HTTP failures or call the provider after budget exhaustion or input overflow', async () => {
  vi.stubEnv('AGENT_MODE', 'live'); vi.stubEnv('TYPESAFE_API_KEY', 'unit-test-not-a-key');
  const network = vi.fn(async () => new Response('unavailable', { status: 503 })); vi.stubGlobal('fetch', network);
  await expect(askJev(db, 'link_evidence', request)).rejects.toThrow();
  expect(network).toHaveBeenCalledTimes(1);
  expect(db.prepare('SELECT status FROM agent_runs').get()).toEqual({ status: 'failed' });
  vi.stubEnv('DAILY_SPEND_CAP_USD', '0');
  await expect(askJev(db, 'link_evidence', request)).rejects.toThrow('spend cap');
  await expect(askJev(db, 'link_evidence', { ...request, state: 'x'.repeat(60_000) })).rejects.toThrow('context bound');
  expect(network).toHaveBeenCalledTimes(1);
});

it('rejects invalid fake probabilities and preserves their raw response for diagnosis', async () => {
  await expect(withJevScript(() => ({ ...response, answers: { ...response.answers, grounded: { type: 'noul', noul: 2 } } }), () => askJev(db, 'tripwire', request))).rejects.toThrow('Invalid Jev Noul');
  const row = db.prepare('SELECT status,input_tokens,trace_json FROM agent_runs').get() as { status: string; input_tokens: number; trace_json: string };
  expect(row.status).toBe('failed'); expect(row.input_tokens).toBe(100);
  expect(JSON.parse(row.trace_json)[0].response.answers.grounded.noul).toBe(2);
});

it('accepts service-rounded confidence and distributions without loosening action thresholds', async () => {
  const four = { relation: choice('Relation?', { supports: '', undermines: '', none: '', indeterminate: '' }) };
  const rounded = {
    model: JEV_MODEL, answers: { relation: { type: 'choice', choice: 'none', confidence: 0.41,
      probabilities: { supports: 0.04, undermines: 0.07, none: 0.56, indeterminate: 0.33 } } },
    usage: { input_tokens: 100, output_tokens: 2 },
  };
  const result = await withJevScript(() => rounded, () => askJev(db, 'link_evidence', { ...request, questions: four }));
  expect(result.answers.relation.confidence).toBe(0.41);
  await expect(withJevScript(() => ({
    ...rounded, answers: { relation: { ...rounded.answers.relation, confidence: 0.95 } },
  }), () => askJev(db, 'link_evidence', { ...request, questions: four }))).rejects.toThrow('Inconsistent Jev confidence');
  const sumRounded = { ...rounded, answers: { relation: { ...rounded.answers.relation, confidence: 0.41,
    probabilities: { supports: 0.04, undermines: 0.07, none: 0.56, indeterminate: 0.34 } } } };
  await expect(withJevScript(() => sumRounded, () => askJev(db, 'link_evidence', { ...request, questions: four }))).resolves.toBeDefined();
});
