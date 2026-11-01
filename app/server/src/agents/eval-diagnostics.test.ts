import { expect, it } from 'vitest';
import { generateText } from 'ai';
import { traceDiagnostics, observeContext, type ModelContext } from '../../../evals/diagnostics.js';
import { selectCases } from '../../../evals/selection.js';
import { choiceFor } from './models.js';
import { scriptedModel } from './scripted-model.js';
import { cases } from '../../../evals/cases.js';
import { promptFor } from './prompts.js';

it('retains actual authority tool inputs, messages and the last assistant text', () => {
  const input = { theoryId: 'held', signalId: 'signal', stance: 'supports' };
  const result = traceDiagnostics([{ id: 'run', job: 'link_evidence', finished_at: '2026-11-01T00:00:00Z', trace_json: JSON.stringify([
    { toolCalls: [{ toolCallId: 'call', toolName: 'linkEvidence', input }], toolResults: [{ toolCallId: 'call', toolName: 'linkEvidence', output: { error: { name: 'AuthorityError', message: 'Held theories require proposals.' } } }] },
    { text: 'I should propose that evidence.' },
  ]) }], 'link_evidence');
  expect(result.authorityErrors).toEqual([{ runId: 'run', job: 'link_evidence', toolName: 'linkEvidence', input, message: 'Held theories require proposals.' }]);
  expect(result.lastAssistantText).toBe('I should propose that evidence.');
});
it('captures provider-visible candidates without changing parameters or adding requests', async () => {
  const choice = choiceFor('link_evidence', 'openai'); const original = choice.model;
  const mock = scriptedModel([{ text: 'No relationship established.' }]); choice.model = mock;
  const context: ModelContext = {}; const restore = observeContext('link_evidence', 'openai', context);
  const input = { signal: { id: 's', gist: 'A household tool.' }, theories: [{ id: 't5', claim: 'Most software is made for an audience of one', status: 'held' }] };
  try {
    await generateText({ model: choice.model, prompt: JSON.stringify(input), maxRetries: 0 });
    expect(context.candidateTheoryIds).toEqual(['t5']); expect(context.signal).toEqual(input.signal);
    expect(mock.doGenerateCalls).toHaveLength(1);
    expect(JSON.stringify(mock.doGenerateCalls[0].prompt)).toContain(input.theories[0].claim);
  } finally { restore(); choice.model = original; }
});
it('selects named cases and rejects unknown or empty requests', () => {
  const fixtures = [{ id: 'e4' }, { id: 'e7' }, { id: 'e8' }];
  expect(selectCases(fixtures, ['--case', 'e7,e8,e7'])).toEqual([{ id: 'e7' }, { id: 'e8' }]);
  expect(() => selectCases(fixtures, ['--case', 'missing'])).toThrow('Unknown eval case');
  expect(() => selectCases(fixtures, ['--case'])).toThrow('comma-separated');
});
it('records evidence outcomes against the labelled held theory', async () => {
  process.env.AGENT_MODE = 'fake'; process.env.DAILY_SPEND_CAP_USD = '5';
  const result = await cases().find(fixture => fixture.id === 'e7')!.run('fake');
  expect(result.pass).toBe(true);
  expect(result.diagnostics.expected).toMatchObject({ theoryId: 't5', status: 'held', stance: 'supports' });
  expect(result.diagnostics.actualProposals).toEqual(expect.arrayContaining([expect.objectContaining({ theoryId: 't5', payload: expect.objectContaining({ stance: 'supports' }) })]));
});
it('separates draft relationship permission from strict current-run prose edits', () => {
  const prompt = promptFor('link-evidence');
  expect(prompt.promptVersion).toBe('link-evidence-v2');
  expect(prompt.system).toContain('earlier processing run');
  expect(prompt.system).toContain('Prose edits still require a draft created by the current run');
});
