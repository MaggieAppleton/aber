import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { imageForModel } from './image-input.js';
import { runMediaProcess } from './media-process.js';
import { transcribeFile } from './transcribe.js';
import { createDatabase, migrate } from '../db/index.js';

const exec = promisify(execFile);

const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7mQAAAAASUVORK5CYII=', 'base64');

async function withImage(work: (path: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'aber-media-process-test-'));
  try {
    const path = join(directory, 'ordinary.png');
    await writeFile(path, tinyPng);
    await work(path);
  } finally { await rm(directory, { recursive: true, force: true }); }
}

it('rejects unsupported manifests before image decoding, including when named as an image', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aber-media-policy-test-'));
  try {
    // An empty, harmless manifest with no paths, URLs, or media references.
    const input = join(directory, 'unsupported.png');
    await writeFile(input, 'ffconcat version 1.0\n');
    await expect(imageForModel(input)).rejects.toThrow(/Unsupported image format/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it('honors an already-aborted image operation', async () => {
  await withImage(async path => {
    const controller = new AbortController(); controller.abort();
    await expect(imageForModel(path, { signal: controller.signal })).rejects.toThrow(/abort/i);
  });
});

it('kills an image decoder when its finite deadline expires', async () => {
  await withImage(async path => {
    await expect(imageForModel(path, { timeoutMs: 1 })).rejects.toThrow(/timed out/i);
    // A subsequent decode succeeds after the timed-out child is reaped.
    expect((await imageForModel(path)).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  });
});

it('kills image decoding when the output exceeds its byte cap', async () => {
  await withImage(async path => {
    await expect(imageForModel(path, { maxOutputBytes: 1 })).rejects.toThrow(/output limit/i);
  });
});

it('rejects audio manifests before transcription without making a provider call', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aber-audio-policy-test-'));
  const previousMode = process.env.AGENT_MODE;
  const db = createDatabase(); migrate(db);
  try {
    const path = join(directory, 'unsupported.m4a');
    await writeFile(path, '#EXTM3U\n');
    process.env.AGENT_MODE = 'live';
    await expect(transcribeFile(db, path)).rejects.toThrow(/Unsupported audio format/);
    expect(db.prepare('SELECT status FROM agent_runs').get()).toEqual({ status: 'failed' });
  } finally {
    process.env.AGENT_MODE = previousMode;
    db.close(); await rm(directory, { recursive: true, force: true });
  }
});

it.each([
  ['m4a', 'aac'], ['mp3', 'libmp3lame'], ['wav', 'pcm_s16le'],
  ['webm', 'libopus'], ['ogg', 'libopus'], ['flac', 'flac'],
])('probes and decodes ordinary %s audio with the same restricted input policy', async (extension, codec) => {
  const directory = await mkdtemp(join(tmpdir(), 'aber-audio-format-test-'));
  try {
    const path = join(directory, `ordinary.${extension}`);
    await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.25', '-c:a', codec, path], { timeout: 10_000, maxBuffer: 100_000 });
    const probe = await runMediaProcess('ffprobe', path, 'audio', ['-show_entries', 'format=duration', '-of', 'json']);
    expect(Number(JSON.parse(probe.stdout.toString()).format.duration)).toBeGreaterThan(0);
    const decoded = await runMediaProcess('ffmpeg', path, 'audio', ['-map', '0:a:0', '-f', 's16le', '-ar', '16000', '-ac', '1', 'pipe:1']);
    expect(decoded.stdout.length).toBeGreaterThan(1000);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it.each([['jpg', 'mjpeg'], ['png', 'png'], ['gif', 'gif'], ['avif', 'libsvtav1']])('decodes an ordinary %s image through the restricted input policy', async (extension, codec) => {
  const directory = await mkdtemp(join(tmpdir(), 'aber-image-format-test-'));
  try {
    const path = join(directory, `ordinary.${extension}`);
    await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=32x32', '-frames:v', '1', '-c:v', codec, '-threads', '2', path], { timeout: 10_000, maxBuffer: 100_000 });
    expect((await imageForModel(path)).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it('decodes a self-contained WebP image', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aber-webp-format-test-'));
  try {
    const path = join(directory, 'ordinary.webp');
    // A one-pixel synthetic raster, with no metadata or references.
    await writeFile(path, Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64'));
    expect((await imageForModel(path)).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it('accepts an ordinary 48-megapixel camera image before resizing it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aber-camera-image-test-'));
  try {
    const path = join(directory, 'ordinary.jpg');
    await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=8000x6000', '-frames:v', '1', '-c:v', 'mjpeg', '-threads', '2', path], { timeout: 10_000, maxBuffer: 100_000 });
    expect((await imageForModel(path)).length).toBeGreaterThan(1000);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it.runIf(process.platform === 'darwin')('decodes a locally generated HEIC image when the installed decoder supports it', async () => {
  await withImage(async path => {
    const heic = join(path, '..', 'ordinary.heic');
    await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=64x64', '-frames:v', '1', '-y', path], { timeout: 10_000, maxBuffer: 100_000 });
    await exec('sips', ['-s', 'format', 'heic', path, '--out', heic], { timeout: 10_000, maxBuffer: 100_000 });
    expect((await imageForModel(heic)).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  });
});

it('bounds audio probing and cancels an in-flight audio decoder', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'aber-audio-process-test-'));
  try {
    const path = join(directory, 'ordinary.wav');
    await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', path], { timeout: 10_000, maxBuffer: 100_000 });
    await expect(runMediaProcess('ffprobe', path, 'audio', ['-show_entries', 'format=duration'], { timeoutMs: 1 })).rejects.toThrow(/timed out/);
    const controller = new AbortController();
    const operation = runMediaProcess('ffmpeg', path, 'audio', ['-map', '0:a:0', '-f', 'null', '-'], { signal: controller.signal, beforeInput: ['-re'] });
    const timer = setTimeout(() => controller.abort(), 100);
    try { await expect(operation).rejects.toThrow(/aborted/); }
    finally { clearTimeout(timer); }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
