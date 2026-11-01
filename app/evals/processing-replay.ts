import { outputId, scriptedModel, toolOutputs, type ScriptStep, type StepFactory } from '../server/src/agents/scripted-model.js';
import type { ProcessingFixture } from './fixtures/processing-v2.js';
type Step = ScriptStep | StepFactory;
const call = (toolName: string, input: unknown): ScriptStep => ({ calls: [{ toolName, input }] });
const lastId = (options: Parameters<StepFactory>[0], name: string) => outputId(toolOutputs(options, name).at(-1));

/** Hand-authored SDK replay, NOT inference. Green fake results verify plumbing and the rubric only. */
export function processingReplay(fixture: ProcessingFixture, dumpId: string, setupSignalId?: string) {
  const steps: Step[] = [];
  const observation = (gist: string, themes: string[], urls: string[] = []) => {
    steps.push(call('createSignal', { dumpId, gist, note: '', sources: urls.length ? urls.map(url => ({ url })) : [{ ownObservation: true }] }));
    for (const themeId of themes) steps.push(options => call('fileSignal', { signalId: lastId(options, 'createSignal'), themeId }));
  };
  switch (fixture.id) {
    case 'p-social-commentary-v2':
      observation('Cedar Notes restored saved decisions in 36 of 40 tests after a twelve-week pause', ['memory'], [fixture.urls[0]]);
      observation('Harbour deployment agents receive separate revocable service identities', ['identity'], [fixture.urls[1]]);
      break;
    case 'p-full-article-v2':
      observation('Harbour human review time rose from 45 to 110 minutes per change after agent adoption', ['review'], fixture.urls);
      observation('Vela Compute signed a five-year electricity contract with a minimum annual payment of 18 million dollars', ['cost', 'funding'], fixture.urls);
      break;
    case 'p-voice-ramble-v2':
      observation('Harbour maintainers cut writing time from 90 to 30 minutes while review time rose from 40 to 100 minutes', ['review']);
      observation('Eight Cedar Workshop designers retrieved an old design decision after eleven weeks without pasting the old chat', ['memory']);
      observation('Four Rowan House adults used their household pantry app for sixteen weeks', ['personal']);
      steps.push(call('createDraftTheory', { dumpId, claim: 'Local decision timelines become the main interface for review', body: 'A speculative direction to test, not an observed event.', themes: ['review', 'interfaces'], horizon: 2028 }));
      break;
    case 'p-build-robotics-v2':
      steps.push(call('createDraftTheme', { dumpId, name: 'Robotics' }));
      steps.push(call('createSignal', { dumpId, gist: 'Alder Warehouse picking robot stopped 17 times in one week on transparent packages and required a human reset each time', sources: [{ ownObservation: true }] }));
      steps.push(options => call('fileSignal', { signalId: lastId(options, 'createSignal'), themeId: lastId(options, 'createDraftTheme') }));
      steps.push(options => call('createDraftTheory', { dumpId, claim: 'Warehouse picking robots still need human recovery at least weekly in 2028', body: 'Test weekly supervised recovery frequency in physical deployments.', themes: [lastId(options, 'createDraftTheme')], horizon: 2028 }));
      steps.push(options => call('createDraftPrototype', { dumpId, name: 'Recovery rehearsal', body: 'Tabletop gripper test using transparent packages; measure human interventions.', theories: [lastId(options, 'createDraftTheory')] }));
      break;
    case 'p-revise-dedup-v2':
      observation(fixture.setup!.gist, ['memory'], [fixture.urls[0]]);
      steps.push(call('createSignal', { dumpId, gist: fixture.setup!.gist, sources: [{ url: fixture.urls[1] }] }));
      steps.push(options => call('mergeNearDuplicateSignals', { survivorId: setupSignalId!, absorbedId: lastId(options, 'createSignal'), dumpId, reasoning: 'The same Cedar Atlas trial reported by an independent source.' }));
      observation('Cedar Atlas memory lookup latency improved by 45% in a separate speed benchmark', ['memory'], [fixture.urls[2]]);
      steps.push(call('proposeRevision', { dumpId, theoryId: 't3', claim: 'Agents keep context across months while a project vault stays enabled with consent', reasoning: 'The trial makes memory retention conditional on the enabled vault.' }));
      break;
    default: throw new Error(`No explicit replay for ${fixture.id}`);
  }
  steps.push(call('reply', { dumpId, parts: [{ type: 'text', text: 'Synthetic scripted replay completed; see persisted filings and drafts.' }] }));
  steps.push({ text: 'Synthetic replay completed. This is a plumbing check, not model accuracy.' });
  return scriptedModel(steps);
}
