import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools } from '../tools/index.js';
import { agentTools } from '../agents/tools.js';
import { runAgent } from '../agents/run.js';
import { scriptedModel, outputId, toolOutputs } from '../agents/scripted-model.js';
import { enqueue } from './queue.js';
import { processJobs, recoverStaleJobs } from './runner.js';
import { clearRun, CleanupBlockedError } from '../agents/cleanup.js';
import { restoreSignalMerge, snapshotSignal } from '../tools/merges.js';

let db: Database;
let tools: ReturnType<typeof createTools>;
let now: Date;
beforeEach(() => {
  process.env.AGENT_MODE = 'fake'; process.env.DAILY_SPEND_CAP_USD = '5';
  db = createDatabase(); migrate(db); tools = createTools(db); now = new Date();
  db.prepare('INSERT OR IGNORE INTO people(id,name,created_at) VALUES(?,?,?)').run('maggie', 'Maggie', now.toISOString());
});
afterEach(() => db.close());
const person = { kind: 'person' as const, id: 'maggie' };

function setup() {
  const theme = tools.call('writeTheme', { name: 'Cost of intelligence' }, person);
  const theory = tools.call('writeTheory', { claim: 'Routine intelligence gets cheaper', themes: [theme.id] }, person);
  const dump = tools.call('captureDump', { text: 'Recovery fixture observation.' }, person);
  db.prepare("UPDATE jobs SET status='done'").run();
  return { theme, theory, dump };
}

describe('durable failure recovery', () => {
  it('clears the failed signal, draft, suggestion, joins and queued children before retrying', async () => {
    const { dump, theory } = setup();
    const job = enqueue(db, 'process_dump', { dumpId: dump.id }, { now });
    const attempts: string[] = [];
    const handler = async (queued: { id: string; attempts: number }) => {
      await runAgent(db, {
        job: 'process_dump', promptVersion: 'recovery-test-v1', system: 'Recovery fixture', maxSteps: 8, maxInputTokens: 99_000,
        model: scriptedModel([
          { calls: [{ toolName: 'createSignal', input: { dumpId: dump.id, gist: 'A new price cut', sources: [{ ownObservation: true }] } }] },
          { calls: [{ toolName: 'createDraftTheory', input: { claim: 'A recoverable draft', dumpId: dump.id } }] },
          options => ({ calls: [{ toolName: 'proposeEvidence', input: { theoryId: theory.id, signalId: outputId(toolOutputs(options, 'createSignal')[0]), stance: 'supports', reasoning: 'Synthetic labelled evidence.' } }] }),
          () => { if (queued.attempts === 1) throw new Error('Planted provider failure after writes'); return { text: 'Recovered' }; },
        ]),
        tools: runId => { attempts.push(runId); return agentTools(tools, ['createSignal', 'createDraftTheory', 'proposeEvidence'], 'process_dump', runId, dump.id); },
      }, { prompt: 'Create fixture material' }, { jobId: queued.id, attempt: queued.attempts, now: () => now });
    };
    await processJobs(db, tools, { now: () => now, maxJobs: 1, handler });
    expect(db.prepare('SELECT status,attempts FROM jobs WHERE id=?').get(job.id)).toMatchObject({ status: 'queued', attempts: 1 });
    expect(db.prepare('SELECT COUNT(*) n FROM signals').get()).toEqual({ n: 1 });
    now = new Date(now.getTime() + 30_001);
    await processJobs(db, tools, { now: () => now, maxJobs: 1, handler });
    const finalJob = db.prepare('SELECT status,error FROM jobs WHERE id=?').get(job.id);
    expect(finalJob).toEqual({ status: 'done', error: null });
    expect(db.prepare('SELECT status FROM agent_runs WHERE id=?').get(attempts[0])).toEqual({ status: 'cleared' });
    for (const table of ['signals', 'theories', 'suggestions', 'events', 'signal_origins', 'tool_calls']) {
      expect(db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE run_id=?`).get(attempts[0])).toEqual({ n: 0 });
    }
    expect(db.prepare('SELECT COUNT(*) n FROM signals').get()).toEqual({ n: 1 });
    expect(db.prepare('SELECT COUNT(*) n FROM suggestions').get()).toEqual({ n: 1 });
    expect(db.prepare('SELECT COUNT(*) n FROM jobs WHERE created_by=?').get(`agent:process_dump:${attempts[0]}`)).toEqual({ n: 0 });
  });

  it('keeps a person edit and its event, and marks recovery blocked', async () => {
    const { dump } = setup(); let runId = '';
    await expect(runAgent(db, {
      job: 'process_dump', promptVersion: 'edit-guard-v1', system: 'Fixture', maxSteps: 4, maxInputTokens: 99_000,
      model: scriptedModel([{ calls: [{ toolName: 'createSignal', input: { dumpId: dump.id, gist: 'Keep this observation' } }] }, () => { throw new Error('Planted failure'); }]),
      tools: id => { runId = id; return agentTools(tools, ['createSignal'], 'process_dump', id, dump.id); },
    }, { prompt: 'Fixture' })).rejects.toThrow('Planted failure');
    const signal = db.prepare('SELECT id FROM signals').get() as { id: string };
    tools.call('editSignal', { id: signal.id, note: 'Maggie added this interpretation.' }, person);
    expect(() => clearRun(db, runId)).toThrow(CleanupBlockedError);
    expect(db.prepare('SELECT note FROM signals WHERE id=?').get(signal.id)).toEqual({ note: 'Maggie added this interpretation.' });
    expect(db.prepare("SELECT COUNT(*) n FROM events WHERE actor='person:maggie' AND tool='editSignal'").get()).toEqual({ n: 1 });
    expect(db.prepare('SELECT status,error FROM agent_runs WHERE id=?').get(runId)).toMatchObject({ status: 'failed', error: expect.stringContaining('Clean-up blocked') });
  });

  it('clears a crashed attempt and requeues its stale lock on startup', () => {
    const job = enqueue(db, 'process_dump', { dumpId: 'unused' }, { now });
    db.prepare("UPDATE jobs SET status='running',attempts=1,locked_at=? WHERE id=?").run(new Date(now.getTime() - 601_000).toISOString(), job.id);
    db.prepare("INSERT INTO agent_runs(id,job_id,job,provider,model,prompt_version,status,started_at) VALUES('crashed',?,'process_dump','fake','fixture','v1','running',?)").run(job.id, now.toISOString());
    expect(recoverStaleJobs(db, { now: () => now })).toBe(1);
    expect(db.prepare('SELECT status FROM jobs WHERE id=?').get(job.id)).toEqual({ status: 'queued' });
    expect(db.prepare("SELECT status FROM agent_runs WHERE id='crashed'").get()).toEqual({ status: 'cleared' });
  });

  async function failedMerge(editAfter: boolean) {
    const { dump, theme } = setup();
    const otherDump = tools.call('captureDump', { text: 'Second source of the same finding.' }, person);
    db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES('originals','process_dump','fake','fixture','v1','done',?)").run(now.toISOString());
    const originalActor = { kind: 'agent' as const, job: 'process_dump', runId: 'originals' };
    const first = tools.call('createSignal', { dumpId: dump.id, gist: 'A shared finding', note: 'First note', sources: [{ url: 'https://example.org/a' }], embedding: [0.5, 0.2] }, originalActor);
    const second = tools.call('createSignal', { dumpId: otherDump.id, gist: 'A shared finding', note: 'Second note', sources: [{ url: 'https://example.org/b' }], embedding: [0.5, 0.2] }, originalActor);
    tools.call('fileSignal', { signalId: second.id, themeId: theme.id }, originalActor);
    const before = [snapshotSignal(db, first.id), snapshotSignal(db, second.id)];
    let runId = '';
    await expect(runAgent(db, {
      job: 'process_dump', promptVersion: 'merge-failure-v1', system: 'Fixture', maxSteps: 3, maxInputTokens: 99_000,
      model: scriptedModel([{ calls: [{ toolName: 'mergeNearDuplicateSignals', input: { survivorId: first.id, absorbedId: second.id, reasoning: 'Same planted event.', dumpId: dump.id } }] }, () => { throw new Error('Planted failure after merge'); }]),
      tools: id => { runId = id; return agentTools(tools, ['mergeNearDuplicateSignals'], 'process_dump', id, dump.id); },
    }, { prompt: 'Merge fixture' })).rejects.toThrow('Planted failure after merge');
    if (editAfter) tools.call('editSignal', { id: first.id, note: 'A person edited the merged survivor.' }, person);
    return { first, second, before, runId };
  }

  it('restores complete merge snapshots before clearing a failed run', async () => {
    const { first, second, before, runId } = await failedMerge(false);
    clearRun(db, runId, { restoreMerge: (database, id) => { restoreSignalMerge(database, id); } });
    expect([snapshotSignal(db, first.id), snapshotSignal(db, second.id)]).toEqual(before);
    expect(db.prepare('SELECT COUNT(*) n FROM merges WHERE run_id=?').get(runId)).toEqual({ n: 0 });
  });
  it('blocks snapshot restoration after a person edits the merge survivor', async () => {
    const { first, runId } = await failedMerge(true);
    expect(() => clearRun(db, runId, { restoreMerge: (database, id) => { restoreSignalMerge(database, id); } })).toThrow(CleanupBlockedError);
    expect(db.prepare('SELECT note FROM signals WHERE id=?').get(first.id)).toEqual({ note: 'A person edited the merged survivor.' });
    expect(db.prepare('SELECT COUNT(*) n FROM merges WHERE run_id=?').get(runId)).toEqual({ n: 1 });
  });
});
