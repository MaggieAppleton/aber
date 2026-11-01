import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';

type MediaKind = 'image' | 'audio';
export interface MediaProcessOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxOutputBytes?: number;
  beforeInput?: string[];
  logLevel?: 'error' | 'info';
}

const MAX_INPUT_BYTES = 512 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 8_000_000;
const MAX_TIMEOUT_MS = 120_000;

/** Recognize only self-contained raster/audio containers; never ask FFmpeg to sniff text. */
function inputFormat(header: Buffer, kind: MediaKind): string {
  const starts = (hex: string) => header.subarray(0, hex.length / 2).equals(Buffer.from(hex, 'hex'));
  const text = (start: number, length: number) => header.toString('ascii', start, start + length);
  if (kind === 'image') {
    if (starts('89504e470d0a1a0a')) return 'png_pipe';
    if (starts('ffd8ff')) return 'jpeg_pipe';
    if (text(0, 6) === 'GIF87a' || text(0, 6) === 'GIF89a') return 'gif';
    if (text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') return 'webp_pipe';
  } else {
    if (text(0, 4) === 'fLaC') return 'flac';
    if (text(0, 4) === 'OggS') return 'ogg';
    if ((text(0, 4) === 'RIFF' || text(0, 4) === 'RF64') && text(8, 4) === 'WAVE') return 'wav';
    if (starts('1a45dfa3')) return 'matroska';
    if (text(0, 3) === 'ID3' || (header[0] === 0xff && (header[1]! & 0xe6) === 0xe2)) return 'mp3';
  }
  if (header.length >= 16 && text(4, 4) === 'ftyp') {
    const boxSize = header.readUInt32BE(0);
    const brands = [text(8, 4)];
    for (let offset = 16; offset + 4 <= Math.min(boxSize, header.length); offset += 4) brands.push(text(offset, 4));
    const image = brands.some(brand => ['avif', 'avis', 'heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand));
    if (kind === 'image' && image) return 'mov';
    if (kind === 'audio' && !image && brands.some(brand => ['M4A ', 'M4B ', 'isom', 'iso2', 'iso5', 'iso6', 'mp41', 'mp42', 'dash'].includes(brand))) return 'mov';
  }
  throw new Error(`Unsupported ${kind} format. Use ${kind === 'image' ? 'JPEG, PNG, WebP, GIF, HEIC, or AVIF' : 'M4A, MP3, WAV, WebM, OGG, or FLAC'}; playlists and manifests are not supported.`);
}

function boundedOption(value: number | undefined, fallback: number, maximum: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value <= 0 || value > maximum) throw new Error('Invalid media process limit');
  return value;
}

/**
 * Probe and decode use the same opened-file policy. Only fd: is allowed on input,
 * so no nested file, network, playlist, or sequence URL can read another resource.
 * fd: remains seekable for M4A/HEIC files whose metadata is at the end.
 */
export async function runMediaProcess(tool: 'ffmpeg' | 'ffprobe', path: string, kind: MediaKind, outputArgs: string[], options: MediaProcessOptions = {}): Promise<{ stdout: Buffer; stderr: Buffer }> {
  const timeoutMs = boundedOption(options.timeoutMs, 30_000, MAX_TIMEOUT_MS);
  const outputLimit = boundedOption(options.maxOutputBytes, MAX_OUTPUT_BYTES, MAX_OUTPUT_BYTES);
  options.signal?.throwIfAborted();
  // Nonblocking open prevents a named pipe from hanging before the regular-file check.
  const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size <= 0 || info.size > MAX_INPUT_BYTES) throw new Error('Media input must be a nonempty regular file no larger than 512 MiB');
    const header = Buffer.alloc(4096);
    const { bytesRead } = await file.read(header, 0, header.length, 0);
    const format = inputFormat(header.subarray(0, bytesRead), kind);
    options.signal?.throwIfAborted();
    const globalArgs = ['-hide_banner', '-loglevel', options.logLevel ?? 'error', '-max_alloc', '268435456', '-cpucount', '2'];
    if (tool === 'ffmpeg') globalArgs.push('-nostdin', '-timelimit', String(Math.ceil(timeoutMs / 1000)), '-filter_threads', '2', '-filter_complex_threads', '2');
    // Allow ordinary 48 MP phone photos while bounding decoded frames at 64 MP.
    const inputArgs = ['-threads', '2', '-max_pixels', '64000000', '-max_samples', '1000000', '-probesize', '5000000', '-analyzeduration', '5000000', '-max_streams', '16', '-max_probe_packets', '2500', '-format_whitelist', format, '-protocol_whitelist', 'fd', '-f', format];
    if (format === 'mov') inputArgs.push('-enable_drefs', '0', '-use_absolute_path', '0');
    inputArgs.push('-fd', '3', '-blocksize', '65536', '-i', 'fd:');

    return await new Promise((resolve, reject) => {
      const child = spawn(tool, [...globalArgs, ...(options.beforeInput ?? []), ...inputArgs, ...outputArgs], { stdio: ['ignore', 'pipe', 'pipe', file.fd] });
      const stdout: Buffer[] = []; const stderr: Buffer[] = [];
      let outputBytes = 0; let failure: Error | undefined;
      const stop = (error: Error) => {
        failure ??= error;
        child.kill('SIGKILL');
      };
      const abort = () => stop(new Error('Media operation aborted'));
      const timer = setTimeout(() => stop(new Error(`Media ${tool} timed out`)), timeoutMs);
      options.signal?.addEventListener('abort', abort, { once: true });
      if (options.signal?.aborted) abort();
      const collect = (chunks: Buffer[]) => (chunk: Buffer) => {
        outputBytes += chunk.length;
        if (outputBytes > outputLimit) stop(new Error(`Media ${tool} exceeded its output limit`));
        else if (!failure) chunks.push(chunk);
      };
      child.stdout!.on('data', collect(stdout));
      child.stderr!.on('data', collect(stderr));
      child.on('error', () => { failure ??= new Error(`Could not start ${tool}; install FFmpeg locally with the fd protocol enabled`); });
      child.on('close', code => {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', abort);
        if (failure) reject(failure);
        else if (code !== 0) reject(new Error(`Could not decode ${kind}; the file is invalid or its encoding is unsupported by local FFmpeg`));
        else resolve({ stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) });
      });
    });
  } finally { await file.close(); }
}
