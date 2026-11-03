import { afterEach, describe, expect, it, vi } from 'vitest';
import { TypeSafeClient, choice } from '@typesafe-ai/sdk';
import { createDatabase } from '../server/src/db/index.js';
import { fakeChoice, type JevRequest } from '../server/src/agents/jev.js';
import { withSpendBudget, reserveSpend, spendBudgetSnapshot } from '../server/src/agents/spend-budget.js';
import { models } from '../server/src/agents/models.js';
import { jevCases } from './jev-cases.js';
import { comparisonCases, compareArms, type ComparisonResult } from './jev-compare.js';
import { withJevEvaluation, reverseChoiceCriteria } from './jev-adapter.js';
import { reviewedBudget, withJevModes } from './jev-options.js';
import { withEvaluationObservation } from './jev-observation.js';
import { actualActions, policyDecisions, scoreActual } from './jev-metrics.js';
import { jevFixtures } from './fixtures/jev-v1.js';

afterEach(() => vi.restoreAllMocks());
describe('comparison safety and selection', () => {
  it('requires explicit finite acknowledged live spending, independent of environment caps', () => {
    expect(() => reviewedBudget([], false)).toThrow('disabled');
    expect(() => reviewedBudget(['--budget', '2'], false)).toThrow('disabled');
    expect(() => reviewedBudget(['--acknowledge-paid-budget'], false)).toThrow('disabled');
    for (const invalid of ['Infinity', 'NaN', '-1', '0']) expect(() => reviewedBudget(['--budget', invalid, '--acknowledge-paid-budget'], false)).toThrow();
    expect(reviewedBudget(['--budget', '2', '--acknowledge-paid-budget'], false)).toBe(2);
    expect(reviewedBudget([], true)).toBe(1);
  });
  it('selects a balanced dev/held-out smoke set covering all five real workflows', () => {
    const selected = comparisonCases(['--jev-suite', 'smoke']);
    expect(selected).toHaveLength(10);
    for (const job of ['link_evidence', 'tripwire', 'near_dup', 'process_dump', 'chat']) {
      expect(selected.filter(fixture => fixture.job === job).map(fixture => fixture.fixture?.split).sort()).toEqual(['dev', 'held-out']);
    }
    expect(comparisonCases(['--jev-suite', 'new', '--split', 'held-out', '--limit', '2'])).toHaveLength(2);
  });
  it('shares reservations across otherwise isolated databases and arms', async () => {
    const first = createDatabase(); const second = createDatabase();
    try {
      await withSpendBudget(0.1, async () => {
        const reservation = reserveSpend(0.08);
        expect(() => reserveSpend(0.03)).toThrow();
        reservation.settle(0.06);
        const nextArm = reserveSpend(0.04); nextArm.unknown();
        expect(spendBudgetSnapshot()).toMatchObject({ spentUsd: 0.1, unknownCostUsd: 0.04, reservedUsd: 0 });
        expect(() => reserveSpend(0.001)).toThrow();
      });
    } finally { first.close(); second.close(); }
  });
  it('restores per-job environment overrides after failure', async () => {
    const prior = process.env.JEV_CHAT_MODE;
    process.env.JEV_CHAT_MODE = 'shadow';
    await expect(withJevModes('on', async () => { expect(process.env.JEV_CHAT_MODE).toBe('on'); throw new Error('test'); })).rejects.toThrow('test');
    expect(process.env.JEV_CHAT_MODE).toBe('shadow');
    if (prior === undefined) delete process.env.JEV_CHAT_MODE; else process.env.JEV_CHAT_MODE = prior;
  });
});

describe('option order exercises provider-bound Choice questions', () => {
  const request: JevRequest = { model: 'jev-1.14.0', state: { text: 'fixed evidence' }, questions: { route: choice('Choose the exact target', { yes: 'matches', no: 'does not match', ambiguous: 'cannot resolve' }) } };
  it('does not mutate original state, criteria meanings, or response distributions', () => {
    const reversed = reverseChoiceCriteria(request);
    expect(Object.keys(reversed.questions.route.type === 'choice' ? reversed.questions.route.criteria : {})).toEqual(['ambiguous', 'no', 'yes']);
    expect(Object.keys(request.questions.route.type === 'choice' ? request.questions.route.criteria : {})).toEqual(['yes', 'no', 'ambiguous']);
    expect(reversed.state).toBe(request.state);
  });
  it('passes reversed criteria to the real SDK boundary, with no network in this test', async () => {
    const seen: string[][] = [];
    const client = new TypeSafeClient({
      apiKey: 'offline-test-only', logLevel: 'off', compression: false,
      fetch: async (_url, init) => {
        const input = JSON.parse(String(init?.body)) as JevRequest;
        const question = input.questions.route;
        if (question.type !== 'choice') throw new Error('Expected Choice');
        seen.push(Object.keys(question.criteria));
        return Response.json({ model: input.model, answers: { route: fakeChoice(question.criteria, 'yes') }, usage: { input_tokens: 100, output_tokens: 0 } });
      },
    });
    const original = TypeSafeClient.prototype.systemOne;
    const primary = models.chat.primary;
    const observed = await withJevEvaluation({ fake: false, reverse: true, provider: 'anthropic' }, async () => {
      expect(models.chat.primary.provider).toBe('anthropic');
      return client.systemOne(request);
    });
    expect(seen).toEqual([['ambiguous', 'no', 'yes']]);
    expect(observed.requests[0].reversedChoiceCount).toBe(1);
    expect(TypeSafeClient.prototype.systemOne).toBe(original);
    expect(models.chat.primary).toBe(primary);
  });
});

describe('real workflows retain final outputs in isolated arms', () => {
  for (const id of ['j-dev-evidence-clear', 'j-dev-tripwire-simple', 'j-dev-multi-theme', 'j-dev-chat']) it(`high-confidence Jev on reaches final writes: ${id}`, async () => {
    process.env.AGENT_MODE = 'fake';
    const fixture = jevCases().find(item => item.id === id)!;
    const observed = await withJevModes('on', () => withJevEvaluation({
      fake: true, reverse: false, provider: 'fake',
      script: request => {
        const state = request.state as Record<string, any>;
        const selection = (questionId: string): string => {
          if (questionId === 'relation') return /context across months/i.test(state.theory.claim) ? 'supports' : 'no_directional_evidence';
          if (questionId === 'supported') return 'qualitative';
          if (questionId === 'support') return 'supported';
          if (questionId === 'route') return 'theoryEvidence';
          if (questionId === 'target' || questionId === 'theoryEvidenceTarget') return state.candidates.find((candidate: Record<string, any>) => candidate.id === 't3').key;
          if (questionId === 'signalsTarget' || questionId === 'themeActivityTarget') return 'no_match';
          throw new Error(`Missing explicit high-confidence fixture choice: ${questionId}`);
        };
        return {
          model: request.model,
          answers: Object.fromEntries(Object.entries(request.questions).map(([questionId, question]) => {
            if (question.type === 'choice') return [questionId, fakeChoice(question.criteria, selection(questionId), 0.999)];
            let yes = questionId !== 'combinesDistinctFindings';
            if (questionId.startsWith('theme_')) yes = ['memory', 'review'].includes(state.candidateThemes[Number(questionId.slice(6))].id);
            return [questionId, { type: 'noul', noul: yes ? 0.999 : 0.001 }];
          })),
          usage: { input_tokens: 100, output_tokens: 0 },
        };
      },
    }, () => withEvaluationObservation(() => fixture.run('fake'))));
    const { value: result, snapshot } = observed.value;
    expect(result.error).toBeUndefined();
    expect(snapshot.runs.every(run => run.status === 'done')).toBe(true);
    const actions = actualActions(snapshot);
    expect(scoreActual(jevFixtures.find(item => item.id === id), actions)?.pass, JSON.stringify(actions)).toBe(true);
    expect(policyDecisions(snapshot.runs).some(policy => policy.fallback === false)).toBe(true);
    if (fixture.job !== 'process_dump' && fixture.job !== 'chat') expect(snapshot.runs.some(run => run.model?.includes('scripted'))).toBe(false);
    if (fixture.job === 'chat') expect(snapshot.runs.some(run => run.model === 'chat-shortcut-v1')).toBe(true);
  });
  for (const fixture of jevCases()) it(`offline final DB retained: ${fixture.id}`, async () => {
    process.env.AGENT_MODE = 'fake';
    const observed = await withJevModes('off', () => withEvaluationObservation(() => fixture.run('fake')));
    expect(observed.value.error).toBeUndefined();
    expect(observed.snapshot.runs.length).toBeGreaterThan(0);
    expect(observed.snapshot.runs.every(run => run.status === 'done')).toBe(true);
    expect(observed.value.costUsd).toBe(0);
    if (fixture.job === 'near_dup') {
      const expected = jevFixtures.find(item => item.id === fixture.id)!;
      expect(scoreActual(expected, actualActions(observed.snapshot))?.pass).toBe(true);
    }
    if (fixture.job === 'chat') expect(actualActions(observed.snapshot).displays).toEqual(expect.arrayContaining(['showTheory:t3', 'showEvidenceSplit:t3']));
  });
  it('compares predicted shadow policy with baseline actual writes without applying predicted merges', async () => {
    process.env.AGENT_MODE = 'fake';
    const fixture = jevCases().find(item => item.id === 'j-dev-nonduplicate')!;
    const responses: ComparisonResult[] = [];
    for (const arm of ['off', 'shadow', 'on'] as const) {
      const observed = await withJevModes(arm, () => withJevEvaluation({
        fake: true, reverse: false, provider: 'fake',
        script: request => ({
          model: request.model, answers: Object.fromEntries(Object.keys(request.questions).map(id => [id, { type: 'noul', noul: id === 'sameSpecificFinding' ? 0.999 : 0.001 }])),
          usage: { input_tokens: 100, output_tokens: 0 },
        }),
      }, () => withEvaluationObservation(() => fixture.run('fake'))));
      const { value: result, snapshot } = observed.value;
      responses.push({ id: fixture.id, provider: 'fake', arm, durationMs: 1, database: 'not-written', result, snapshot, requests: observed.requests, actual: actualActions(snapshot), score: scoreActual(jevFixtures.find(item => item.id === fixture.id), actualActions(snapshot)) });
    }
    expect(responses[0].snapshot.tables.merges).toHaveLength(0);
    expect(responses[1].snapshot.tables.merges).toHaveLength(0);
    expect(responses[2].snapshot.tables.merges).toHaveLength(1);
    expect(responses[2].score).toMatchObject({ pass: false, falseMerges: 1 });
    expect(compareArms(responses)[0]).toMatchObject({ shadowDomainParity: true, shadowPredictedPoliciesAgainstBaselineActual: [expect.objectContaining({ observedAction: 'merge' })] });
  });
});
