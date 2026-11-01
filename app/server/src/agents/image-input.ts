import { runMediaProcess, type MediaProcessOptions } from './media-process.js';

/** Bound vision dimensions as well as bytes, including HEIC uploads. */
export async function imageForModel(path: string, options: Pick<MediaProcessOptions, 'signal' | 'timeoutMs' | 'maxOutputBytes'> = {}): Promise<Buffer> {
  try {
    const result = await runMediaProcess('ffmpeg', path, 'image', ['-map', '0:v:0', '-vf', 'scale=w=min(1600\\,iw):h=min(1600\\,ih):force_original_aspect_ratio=decrease', '-frames:v', '1', '-threads', '2', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1'], options);
    return result.stdout;
  } catch (error) { throw new Error(`Could not prepare image for the model: ${error instanceof Error ? error.message : error}`); }
}
