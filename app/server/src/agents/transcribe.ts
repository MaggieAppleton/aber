import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { transcribe } from 'ai';
import { MockTranscriptionModelV4 } from 'ai/test';
import { transcriptionModel } from './models.js';
import { recordedAdapter } from './adapters.js';
import type { AgentDatabase, RunContext } from './types.js';
import { runMediaProcess } from './media-process.js';

// Conservative below the provider's 25 MB upload boundary, including multipart framing.
export const MAX_TRANSCRIBE_BYTES = 24_000_000;

async function duration(path: string, signal?: AbortSignal): Promise<number> {
  const { stdout } = await runMediaProcess('ffprobe', path, 'audio', ['-select_streams', 'a:0', '-show_entries', 'stream=codec_type:format=duration', '-of', 'json'], { signal, maxOutputBytes: 100_000 });
  const metadata = JSON.parse(stdout.toString());
  const seconds = Number(metadata.format?.duration);
  if (metadata.streams?.[0]?.codec_type !== 'audio' || !Number.isFinite(seconds) || seconds <= 0 || seconds > 86_400) throw new Error('Audio must contain an audio stream with a duration of at most 24 hours');
  return seconds;
}

/** Prefer a nearby silence; an eight-minute fallback still bounds each upload. */
export function audioBoundaries(seconds: number, silences: number[], chunkSeconds = 480): number[] {
  const result = [0];
  while (result[result.length - 1]! + chunkSeconds < seconds) {
    const target = result[result.length - 1]! + chunkSeconds;
    const nearby = silences.filter(value => value >= target - 60 && value <= target);
    result.push(nearby[nearby.length - 1] ?? target);
  }
  result.push(seconds);
  return result;
}

export async function transcribeFile(db: AgentDatabase, path: string, ctx: RunContext = {}, fakeText = 'Synthetic voice fixture: Small models keep getting cheaper.'): Promise<string> {
  return recordedAdapter(db, 'transcribe', 'gpt-transcribe', ctx, async report => {
    ctx.signal?.throwIfAborted();
    if (process.env.AGENT_MODE === 'fake') {
      const result = await transcribe({
        model: new MockTranscriptionModelV4({ doGenerate: async () => ({ text: fakeText, segments: [], language: 'en', durationInSeconds: 60, warnings: [], response: { timestamp: new Date(), modelId: 'gpt-transcribe' } }) }),
        audio: new Uint8Array([0]), maxRetries: 0,
      });
      return { value: result.text, trace: [{ type: 'transcribe', synthetic: true }] };
    }
    const size = (await stat(path)).size;
    let seconds: number;
    try { seconds = await duration(path, ctx.signal); }
    catch (error) { throw new Error(`Could not prepare audio: ${error instanceof Error ? error.message : error}`); }
    let directory: string | undefined;
    const files: string[] = [];
    try {
      if (size <= MAX_TRANSCRIBE_BYTES) files.push(path);
      else {
        directory = await mkdtemp(join(tmpdir(), 'aber-audio-'));
        const { stderr } = await runMediaProcess('ffmpeg', path, 'audio', ['-map', '0:a:0', '-t', String(seconds), '-af', 'silencedetect=noise=-30dB:d=0.6', '-f', 'null', '-'], { signal: ctx.signal, timeoutMs: 120_000, logLevel: 'info' });
        const silences = [...stderr.toString().matchAll(/silence_end: ([\d.]+)/g)].map(match => Number(match[1]));
        const boundaries = audioBoundaries(seconds, silences);
        for (let index = 1; index < boundaries.length; index++) {
          const output = join(directory, `chunk-${index}.mp3`);
          await runMediaProcess('ffmpeg', path, 'audio', ['-map', '0:a:0', '-t', String(boundaries[index]! - boundaries[index - 1]!), '-vn', '-ar', '16000', '-ac', '1', '-b:a', '64k', '-threads', '2', '-fs', String(MAX_TRANSCRIBE_BYTES), '-y', output], { signal: ctx.signal, timeoutMs: 60_000, beforeInput: ['-ss', String(boundaries[index - 1])] });
          if ((await stat(output)).size > MAX_TRANSCRIBE_BYTES) throw new Error('Audio chunk still exceeds the transcription limit');
          files.push(output);
        }
      }
      const texts: string[] = [];
      for (const file of files) {
        const result = await transcribe({ model: transcriptionModel, audio: await readFile(file), maxRetries: 0, abortSignal: ctx.signal });
        texts.push(result.text);
        report({ costUsd: seconds / 60 * 0.0045 * texts.length / files.length, trace: [{ type: 'transcribe', seconds, completedChunks: texts.length, totalChunks: files.length }] });
      }
      return { value: texts.join('\n\n'), costUsd: seconds / 60 * 0.0045, trace: [{ type: 'transcribe', seconds, chunks: files.length }] };
    } finally { if (directory) await rm(directory, { recursive: true, force: true }); }
  });
}
