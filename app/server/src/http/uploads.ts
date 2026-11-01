import { createHash } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { ulid } from 'ulid';
import type { Context } from 'hono';
import type { ToolRegistry } from './capture.js';

const extensions: Record<string, string> = {
  'audio/mp4': '.m4a', 'audio/x-m4a': '.m4a', 'audio/mpeg': '.mp3', 'audio/webm': '.webm',
  'audio/wav': '.wav', 'audio/ogg': '.ogg', 'image/png': '.png', 'image/jpeg': '.jpg',
  'image/webp': '.webp', 'image/gif': '.gif', 'image/heic': '.heic', 'application/pdf': '.pdf',
};
export async function storeUpload(file: File, dataDir: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type || 'application/octet-stream';
  const id = ulid();
  const extension = extensions[mime] || (/^\.[a-zA-Z0-9]{1,8}$/.test(extname(file.name)) ? extname(file.name).toLowerCase() : '.bin');
  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const path = `${folder}/${id}${extension}`;
  await mkdir(resolve(dataDir, 'media', folder), { recursive: true });
  await writeFile(resolve(dataDir, 'media', path), bytes, { flag: 'wx', mode: 0o600 });
  return { id, kind: mime.startsWith('audio/') ? 'audio' : mime.startsWith('image/') ? 'image' : 'file', path, mime,
    bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex'), title: file.name };
}

export function mediaUploadHandler(tools: ToolRegistry, dataDir: string) {
  return async (c: Context) => {
    if (!(c.req.header('content-type') || '').startsWith('multipart/form-data')) return c.json({ error: 'Use multipart form data' }, 415);
    const file = (await c.req.formData()).get('file');
    if (!file || typeof file === 'string' || !file.size) return c.json({ error: 'A file is required' }, 400);
    const upload = await storeUpload(file, dataDir);
    try {
      const media = await tools.call('storeMedia', upload, { kind: 'person', id: 'maggie' });
      return c.json(media, 201);
    } catch (error) {
      await unlink(resolve(dataDir, 'media', upload.path)).catch(() => {});
      throw error;
    }
  };
}
