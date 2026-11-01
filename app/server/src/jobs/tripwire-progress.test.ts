import { expect, it } from 'vitest';
import { processJobs } from './runner.js';
import { executeJob } from './handlers.js';
import { nextUtcDay } from './queue.js';
import { tripwireFixture } from './tripwire-fixture.js';
import { checkTripwire } from '../agents/jobs/tripwire.js';
import { scriptedModel } from '../agents/scripted-model.js';

it('preserves completed lookback items across a daily cap and an individual retry', async () => {
  const state = tripwireFixture();
  try {
    const signals = Array.from({ length: 3 }, () => state.addSignal(new Date(state.now.getTime() - 60_000)));
    const { theory, producer } = state.startLookback(); let now = new Date(state.now.getTime() + 1000);
    await processJobs(state.db, state.tools, { now: () => now, maxJobs: 1 });
    let completedId = '';
    await processJobs(state.db, state.tools, { now: () => now, maxJobs: 1, handler: async job => {
      completedId = job.id; await executeJob(state.db, state.tools, job, { now: () => now });
      state.db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at,cost_usd) VALUES('cap-fixture','chat','openai','terra','v1','done',?,5)").run(now.toISOString());
    } });
    expect(state.hits()).toHaveLength(1);
    expect(await processJobs(state.db, state.tools, { now: () => now })).toBe(0);
    const waiting = state.jobs().filter(job => job.status === 'queued');
    expect(waiting).toHaveLength(2); expect(waiting.every(job => job.error?.includes('spend cap') && job.attempts === 0)).toBe(true);
    now = new Date(nextUtcDay(now).getTime() + 1000); let failedId = '';
    await processJobs(state.db, state.tools, { now: () => now, maxJobs: 1, handler: async job => {
      failedId = job.id; const payload = JSON.parse(job.payload_json);
      await checkTripwire(state.db, state.tools, payload.signalId, { jobId: job.id, attempt: job.attempts, now: () => now, theoryId: payload.theoryId, tripwireVersion: payload.tripwireVersion, model: scriptedModel([
        { calls: [{ toolName: 'proposeChallenge', input: { signalId: payload.signalId, theoryId: payload.theoryId, tripwireVersion: payload.tripwireVersion, why: 'A planted lookback hit.' } }] },
        () => { throw new Error('Planted failure for one lookback item'); },
      ]) });
    } });
    expect(state.jobs().find(job => job.id === failedId)).toMatchObject({ status: 'queued', attempts: 1 });
    now = new Date(now.getTime() + 30_001); await processJobs(state.db, state.tools, { now: () => now, maxJobs: 100 });
    expect(state.jobs().find(job => job.id === completedId)).toMatchObject({ status: 'done', attempts: 1 });
    expect(state.jobs().find(job => job.id === failedId)).toMatchObject({ status: 'done', attempts: 2 });
    expect(state.jobs().find(job => job.id === producer.id)).toMatchObject({ status: 'done', attempts: 1 });
    expect(state.hits().map(hit => hit.signal_id).sort()).toEqual(signals.sort());
    expect(state.hits().every(hit => hit.tripwire_version === theory.tripwire_version)).toBe(true);
    expect((state.db.prepare("SELECT COUNT(*) n FROM agent_runs WHERE job_id=? AND status='cleared'").get(failedId) as { n: number }).n).toBeGreaterThan(0);
  } finally { state.db.close(); }
});
