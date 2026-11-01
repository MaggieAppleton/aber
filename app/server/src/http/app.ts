import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { streamSSE } from 'hono/streaming';
import { serveStatic } from '@hono/node-server/serve-static';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { config, appDir } from '../config.js';
import { getWorld, getObject, getDump, listDumps } from '../tools/queries.js';
import { selectSignalPage } from '../tools/signals-page.js';
import { captureHandler, type ToolRegistry } from './capture.js';
import { fetchArticle } from '../agents/fetch-article.js';
import { mediaUploadHandler } from './uploads.js';
import { isLocalRequest } from './local-request.js';

type Options = { dataDir?: string; chat?: (body: unknown) => Promise<Response> | Response };
export function createApp(db: Database.Database, tools: ToolRegistry, options: Options = {}) {
  const app = new Hono();
  const dataDir = options.dataDir || config.dataDir;
  app.use('*', async (c, next) => {
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'same-origin');
    if (!isLocalRequest(c.req.raw)) return c.json({ error: 'Requests must use the local app hostname' }, 403);
    const origin = c.req.header('origin');
    if (origin && !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      let allowed = false;
      try { const url = new URL(origin); allowed = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && ['http:', 'https:'].includes(url.protocol); } catch {}
      if (!allowed) return c.json({ error: 'Requests must come from the local app' }, 403);
    }
    await next();
  });
  app.use('/api/*', bodyLimit({ maxSize: config.maxCaptureBytes, onError: c => c.json({ error: 'A dump can be up to 250 MB' }, 413) }));
  app.get('/healthz', c => c.json({ ok: true }));
  const previews = new Map<string, { title: string; at: number }>();
  app.get('/api/link-preview', async c => {
    const parsed = z.string().url().safeParse(c.req.query('url'));
    if (!parsed.success) return c.json({ error: 'A valid URL is required' }, 400);
    const cached = previews.get(parsed.data);
    if (cached && Date.now() - cached.at < 600000) return c.json({ title: cached.title });
    const article = await fetchArticle(parsed.data);
    const title = article?.title || new URL(parsed.data).hostname.replace(/^www\./, '');
    if (previews.size >= 100) previews.delete(previews.keys().next().value!);
    previews.set(parsed.data, { title, at: Date.now() });
    return c.json({ title });
  });
  app.post('/api/dumps', captureHandler(db, tools, dataDir));
  app.post('/api/media', mediaUploadHandler(tools, dataDir));
  app.get('/api/dumps', c => c.json(listDumps(db, c.req.query('bin') === '1')));
  app.get('/api/dumps/:id', c => {
    const dump = getDump(db, c.req.param('id'));
    return dump ? c.json(dump) : c.json({ error: 'Dump not found' }, 404);
  });
  const signalOptions = (query: (name: string) => string | undefined) => ({ cursor: query('cursor'), limit: query('limit') });
  app.get('/api/world', c => c.json(getWorld(db, 'maggie', { signalPage: signalOptions(name => c.req.query(name)) })));
  app.get('/api/signals', c => {
    const page = selectSignalPage(db, signalOptions(name => c.req.query(name)));
    return c.json({ signals: page.ids.map(id => getObject(db, 'signal', id)!), signalPage: page.signalPage });
  });
  app.get('/api/objects/:kind/:id', c => {
    const object = getObject(db, c.req.param('kind'), c.req.param('id'));
    return object ? c.json(object) : c.json({ error: 'Object not found' }, 404);
  });
  app.post('/api/tools/:name', async c => {
    if (!(c.req.header('content-type') || '').startsWith('application/json')) return c.json({ error: 'Use JSON' }, 415);
    const result = await tools.call(c.req.param('name'), await c.req.json(), { kind: 'person', id: 'maggie' });
    return c.json(result ?? { ok: true });
  });
  app.post('/api/chat', async c => {
    if (!options.chat) return c.json({ error: 'Chat is unavailable' }, 503);
    return options.chat(await c.req.json());
  });
  app.get('/api/events/stream', c => streamSSE(c, async stream => {
    let stopped = false;
    let changed = true;
    const unsubscribe = tools.subscribe?.(() => { changed = true; });
    stream.onAbort(() => { stopped = true; unsubscribe?.(); });
    let fingerprint = '';
    let ticks = 0;
    try {
      while (!stopped) {
        const current = JSON.stringify(db.prepare('SELECT (SELECT MAX(id) FROM events) event,(SELECT MAX(updated_at) FROM dumps) dump,(SELECT COUNT(*) FROM jobs WHERE status IN (\'queued\',\'running\')) jobs').get());
        if (changed || current !== fingerprint) {
          fingerprint = current; changed = false;
          await stream.writeSSE({ data: JSON.stringify({ type: 'changed' }), id: String(Date.now()) });
        } else if (++ticks % 15 === 0) await stream.writeSSE({ data: JSON.stringify({ type: 'heartbeat' }) });
        await stream.sleep(1000);
      }
    } finally { unsubscribe?.(); }
  }));
  app.get('/media/:id', async c => {
    const media = db.prepare('SELECT path,mime FROM media WHERE id=?').get(c.req.param('id')) as { path: string; mime: string } | undefined;
    if (!media) return c.json({ error: 'Media not found' }, 404);
    const root = resolve(dataDir, 'media');
    const path = resolve(root, media.path);
    if (!path.startsWith(root + sep)) return c.json({ error: 'Invalid media path' }, 400);
    try {
      const info = await stat(path);
      c.header('Content-Type', media.mime);
      c.header('Cache-Control', 'private, max-age=31536000, immutable');
      c.header('Accept-Ranges', 'bytes');
      c.header('Content-Length', String(info.size));
      const inline = /^image\/(png|jpeg|webp|gif|heic|avif)$/.test(media.mime) || media.mime.startsWith('audio/');
      c.header('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${c.req.param('id')}"`);
      const bytes = await readFile(path);
      const range = c.req.header('range');
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        let start = match?.[1] ? Number(match[1]) : 0;
        let end = match?.[2] ? Number(match[2]) : info.size - 1;
        if (match && !match[1] && match[2]) { start = Math.max(0, info.size - end); end = info.size - 1; }
        end = Math.min(end, info.size - 1);
        if (!match || (!match[1] && !match[2]) || start > end || start >= info.size) {
          c.header('Content-Range', `bytes */${info.size}`);
          c.header('Content-Length', '0');
          return c.body(null, 416);
        }
        c.header('Content-Range', `bytes ${start}-${end}/${info.size}`);
        c.header('Content-Length', String(end - start + 1));
        return c.body(bytes.subarray(start, end + 1), 206);
      }
      return c.body(bytes);
    } catch { return c.json({ error: 'Media file not found' }, 404); }
  });
  app.get('/api/*', c => c.json({ error: 'Route not found' }, 404));
  app.use('/*', serveStatic({ root: resolve(appDir, 'web/dist') }));
  app.get('*', serveStatic({ root: resolve(appDir, 'web/dist'), path: 'index.html' }));
  app.onError((error, c) => {
    if (error instanceof z.ZodError) return c.json({ error: error.issues.map(issue => issue.message).join('; ') }, 400);
    if (error instanceof SyntaxError) return c.json({ error: 'Invalid JSON' }, 400);
    if (error.name === 'AuthorityError') return c.json({ error: error.message }, 403);
    if (/not found|does not exist|unknown tool/i.test(error.message)) return c.json({ error: error.message }, 404);
    if (/invalid|needs |required|cannot|must |already|missing|constraint|no such|expired|refus|tombstone/i.test(error.message)) return c.json({ error: error.message }, 400);
    console.error('Request failed:', error.name, error.message);
    return c.json({ error: 'Something went wrong. Try again.' }, 500);
  });
  return app;
}
