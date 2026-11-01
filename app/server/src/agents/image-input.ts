import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);

/** Bound vision dimensions as well as bytes, including HEIC uploads. */
export async function imageForModel(path: string): Promise<Buffer> {
  try {
    const result = await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', path, '-vf', 'scale=w=min(1600\\,iw):h=min(1600\\,ih):force_original_aspect_ratio=decrease', '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1'], { encoding: 'buffer', maxBuffer: 8_000_000 });
    return result.stdout;
  } catch (error) { throw new Error(`Could not prepare image for the model: ${error instanceof Error ? error.message : error}`); }
}
