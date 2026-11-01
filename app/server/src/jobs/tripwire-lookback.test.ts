import { expect, it } from 'vitest';
import { processJobs } from './runner.js';
import { executeJob } from './handlers.js';
import { tripwireFixture } from './tripwire-fixture.js';

it('finds a recent hit even when 100 older signals match the tripwire more exactly', async () => {
  const state = tripwireFixture();
  try {
    for (let n = 0; n < 100; n++) state.addSignal(new Date(state.now.getTime() - 365 * 86_400_000), 'a memory feature is withdrawn after privacy complaints');
    const recent = state.addSignal(new Date(state.now.getTime() - 60_000));
    state.startLookback(); await processJobs(state.db, state.tools, { now: () => new Date(state.now.getTime() + 1000), maxJobs: 500 });
    expect(state.hits().map(hit => hit.signal_id)).toEqual([recent]);
  } finally { state.db.close(); }
});
it('pages through all recent active signals and makes fanout idempotent', async () => {
  const state = tripwireFixture();
  try {
    const signals = Array.from({ length: 205 }, (_, n) => state.addSignal(new Date(state.now.getTime() - 60_000 - n)));
    const { producer, theory } = state.startLookback(); const seen: string[] = [];
    await processJobs(state.db, state.tools, { now: () => new Date(state.now.getTime() + 1000), maxJobs: 1000, handler: async job => {
      const payload = JSON.parse(job.payload_json);
      if (payload.signalId) { seen.push(payload.signalId); expect(payload).toMatchObject({ theoryId: theory.id, tripwireVersion: theory.tripwire_version }); }
      await executeJob(state.db, state.tools, job, { now: () => state.now });
    } });
    expect(new Set(seen)).toEqual(new Set(signals)); expect(seen).toHaveLength(205);
    expect(state.hits()).toHaveLength(205);
    expect(state.jobs().every(job => job.status === 'done')).toBe(true);
    const before = state.jobs().length;
    await executeJob(state.db, state.tools, producer, { now: () => new Date(state.now.getTime() + 86_400_000) });
    expect(state.jobs()).toHaveLength(before);
    expect(state.jobs().filter(job => !JSON.parse(job.payload_json).signalId)).toHaveLength(3);
  } finally { state.db.close(); }
});
it('ignores stale producer and child versions rather than checking another condition', async () => {
  const state = tripwireFixture();
  try {
    const signalId = state.addSignal(new Date(state.now.getTime() - 60_000));
    const { producer, theory } = state.startLookback();
    state.tools.call('setTripwire', { id: theory.id, tripwire: 'a different current condition' }, state.person);
    const child = { ...producer, payload_json: JSON.stringify({ signalId, theoryId: theory.id, tripwireVersion: theory.tripwire_version }) };
    await executeJob(state.db, state.tools, producer); await executeJob(state.db, state.tools, child);
    expect(state.hits()).toHaveLength(0);
    expect(state.db.prepare("SELECT COUNT(*) n FROM agent_runs WHERE job='tripwire'").get()).toEqual({ n: 0 });
  } finally { state.db.close(); }
});
