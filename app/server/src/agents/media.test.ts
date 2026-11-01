import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createDatabase, migrate } from '../db/index.js';
import { imageForModel } from './image-input.js';
import { audioBoundaries, transcribeFile } from './transcribe.js';
import { recordedAdapter } from './adapters.js';
const exec = promisify(execFile);

it('resizes a real large image to a bounded vision input', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aber-image-test-'));
  try {
    const input = join(directory, 'large.png'); const output = join(directory, 'bounded.jpg');
    await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=4096x2048', '-frames:v', '1', input]);
    const image = await imageForModel(input); await writeFile(output, image);
    const result = await exec('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'json', output]);
    expect(JSON.parse(result.stdout).streams[0]).toMatchObject({ width: 1600, height: 800 });
    expect(image.length).toBeLessThan(2_000_000);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
it('splits long audio near silence and bounds silent-free chunks', () => {
  expect(audioBoundaries(1200, [450, 900, 920])).toEqual([0, 450, 920, 1200]);
  expect(audioBoundaries(1200, [])).toEqual([0, 480, 960, 1200]);
});
it('uses an SDK mock transcription model and records the adapter run', async () => {
  process.env.AGENT_MODE = 'fake'; const db = createDatabase(); migrate(db);
  try {
    const text = await transcribeFile(db, '/not-read-in-fake-mode.m4a', {}, 'Synthetic fixture transcript.');
    expect(text).toBe('Synthetic fixture transcript.');
    expect(db.prepare("SELECT model,status,cost_usd FROM agent_runs WHERE job='transcribe'").get()).toEqual({ model: 'gpt-transcribe', status: 'done', cost_usd: 0 });
  } finally { db.close(); }
});
it('retains already-incurred adapter cost if a later chunk fails', async () => {
  const old = process.env.AGENT_MODE; process.env.AGENT_MODE = 'live'; const db = createDatabase(); migrate(db);
  try {
    await expect(recordedAdapter(db, 'transcribe', 'gpt-transcribe', {}, async report => {
      report({ costUsd: 0.01, trace: [{ completedChunks: 1 }] }); throw new Error('Second chunk failed');
    })).rejects.toThrow('Second chunk failed');
    expect(db.prepare('SELECT status,cost_usd,trace_json FROM agent_runs').get()).toMatchObject({ status: 'failed', cost_usd: 0.01, trace_json: '[{"completedChunks":1}]' });
  } finally { process.env.AGENT_MODE = old; db.close(); }
});
