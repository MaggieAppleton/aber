import { expect, it } from 'vitest';
import { tripwireFixture } from '../jobs/tripwire-fixture.js';
import { checkTripwire } from './jobs/tripwire.js';
import { scriptedModel } from './scripted-model.js';

it('limits a lookback model to its one signal, theory and captured version', async () => {
  const state = tripwireFixture();
  try {
    const signalId = state.addSignal(new Date(state.now.getTime() - 60_000));
    const { theory } = state.startLookback();
    const other = state.tools.call('writeTheory', { claim: 'Another memory theory', tripwire: 'memory withdrawn' }, state.person);
    const result = await checkTripwire(state.db, state.tools, signalId, { theoryId: theory.id, tripwireVersion: theory.tripwire_version, model: scriptedModel([
      { calls: [
        { toolName: 'proposeChallenge', input: { theoryId: other.id, signalId, tripwireVersion: theory.tripwire_version, why: 'Wrong target' } },
        { toolName: 'proposeChallenge', input: { theoryId: theory.id, signalId, tripwireVersion: theory.tripwire_version + 1, why: 'Wrong version' } },
      ] }, { text: 'These requests are outside this job.' },
    ]) });
    expect(JSON.stringify(result?.trace)).toContain('TripwireScopeError'); expect(state.hits()).toHaveLength(0);
    await checkTripwire(state.db, state.tools, signalId, { theoryId: theory.id, tripwireVersion: theory.tripwire_version });
    expect(state.hits()).toEqual([expect.objectContaining({ signal_id: signalId, tripwire_version: theory.tripwire_version })]);
    expect(state.db.prepare('SELECT target_id FROM suggestions').all()).toEqual([{ target_id: theory.id }]);
  } finally { state.db.close(); }
});
it('rejects a challenge if the person changes the tripwire during the model call', async () => {
  const state = tripwireFixture();
  try {
    const signalId = state.addSignal(new Date(state.now.getTime() - 60_000));
    const { theory } = state.startLookback();
    const result = await checkTripwire(state.db, state.tools, signalId, { theoryId: theory.id, tripwireVersion: theory.tripwire_version, model: scriptedModel([
      () => {
        state.tools.call('setTripwire', { id: theory.id, tripwire: 'a replacement condition' }, state.person);
        return { calls: [{ toolName: 'proposeChallenge', input: { theoryId: theory.id, signalId, why: 'From the old condition' } }] };
      }, { text: 'The watched condition changed.' },
    ]) });
    expect(JSON.stringify(result?.trace)).toContain('Tripwire version changed'); expect(state.hits()).toHaveLength(0);
  } finally { state.db.close(); }
});
