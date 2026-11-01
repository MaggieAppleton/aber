import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Context } from 'hono';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { config } from '../config.js';
import { storeUpload } from './uploads.js';

export type ToolRegistry = {
  call: (name: string, input: unknown, actor: { kind: 'person'; id: string }) => unknown;
  subscribe?: (listener: (...args: unknown[]) => void) => (() => void);
};
const captureInput = z.object({
  text: z.string().optional(), note: z.string().optional(), urls: z.array(z.string().url()).optional(),
  from: z.enum(['shortcut', 'web', 'column']).optional(),
  context: z.array(z.object({ kind: z.string(), id: z.string().optional(), label: z.string(), region: z.string().optional() })).optional(),
}).strict();

export function captureHandler(db: Database.Database, tools: ToolRegistry, dataDir = config.dataDir) {
  return async (c: Context) => {
    const key = c.req.header('Idempotency-Key');
    if (key) {
      const old = db.prepare('SELECT id,status FROM dumps WHERE idempotency_key=?').get(key) as { id: string; status: string } | undefined;
      if (old) return c.json(old, 200);
    }
    const created: string[] = [];
    try {
      let raw: Record<string, unknown>;
      const attachments: Record<string, unknown>[] = [];
      const type = c.req.header('content-type') || '';
      if (type.startsWith('multipart/form-data')) {
        const form = await c.req.formData();
        raw = {};
        for (const name of ['text', 'note', 'from']) {
          const value = form.get(name);
          if (typeof value === 'string') raw[name] = value;
        }
        const parseField = (name: string) => {
          const value = form.get(name);
          if (typeof value !== 'string' || !value) return undefined;
          try { return JSON.parse(value); } catch { throw new Error(`Invalid ${name}`); }
        };
        raw.context = parseField('context');
        const urls = form.getAll('url').filter((value): value is string => typeof value === 'string');
        raw.urls = parseField('urls') ?? (urls.length ? urls : undefined);
        for (const [, file] of form) {
          if (typeof file === 'string') continue;
          if (!file.size) continue;
          const upload = await storeUpload(file, dataDir);
          created.push(resolve(dataDir, 'media', upload.path));
          attachments.push(upload);
        }
      } else if (type.startsWith('application/json')) raw = await c.req.json();
      else return c.json({ error: 'Use JSON or multipart form data' }, 415);
      const input = captureInput.parse(raw);
      if (!input.text?.trim() && !input.note?.trim() && !input.urls?.length && !attachments.length) {
        throw new Error('A dump needs text, a link or a file');
      }
      const dump = await tools.call('captureDump', { ...input, attachments, idempotencyKey: key }, { kind: 'person', id: 'maggie' }) as { id: string; status: string };
      // A concurrent request may already have won this idempotency key.
      for (const attachment of attachments) {
        if (!db.prepare('SELECT 1 FROM media WHERE path=?').get(attachment.path)) {
          await unlink(resolve(dataDir, 'media', String(attachment.path))).catch(() => {});
        }
      }
      return c.json({ id: dump.id, status: dump.status || 'received' }, 201);
    } catch (error) {
      await Promise.all(created.map(path => unlink(path).catch(() => {})));
      if (error instanceof z.ZodError) return c.json({ error: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') }, 400);
      if (error instanceof SyntaxError) return c.json({ error: 'Invalid JSON' }, 400);
      throw error;
    }
  };
}
