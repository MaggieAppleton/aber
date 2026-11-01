import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { fetchArticle, resolvePublicUrl } from './fetch-article.js';

const target = (value: string) => ({ url: new URL(value), address: '93.184.216.34', family: 4 });
const response = { status: 200, type: 'text/html', body: '<html><body><p>A short article.</p></body></html>' };
beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

it('expires during DNS resolution and never starts a request when DNS resolves late', async () => {
  let finishLookup!: (value: Awaited<ReturnType<typeof resolvePublicUrl>>) => void;
  const resolve = vi.fn(() => new Promise<Awaited<ReturnType<typeof resolvePublicUrl>>>(done => { finishLookup = done; }));
  const transport = vi.fn(async () => response);
  let completed = false;
  const pending = fetchArticle('https://example.org/article', { resolve, transport }).then(value => { completed = true; return value; });
  await vi.advanceTimersByTimeAsync(7999);
  expect(completed).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(completed).toBe(true);
  expect(await pending).toBeNull();
  finishLookup(target('https://example.org/article'));
  await vi.advanceTimersByTimeAsync(1);
  expect(transport).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it.each([false, true])('aborts the HTTP request at the deadline, with response headers sent: %s', async headersSent => {
  const body = Object.assign(new PassThrough(), { statusCode: 200, headers: { 'content-type': 'text/html' } });
  const request = new EventEmitter() as http.ClientRequest;
  let connectedSignal: AbortSignal | undefined;
  let chunks = 0;
  let interval: ReturnType<typeof setInterval> | undefined;
  request.destroy = vi.fn((error?: Error) => {
    clearInterval(interval);
    if (headersSent) body.destroy(error);
    request.emit('error', error);
    return request;
  });
  // Model Node's AbortSignal contract while keeping this test entirely offline.
  vi.spyOn(http, 'get').mockImplementation(((_url: URL, options: http.RequestOptions, receive: (response: http.IncomingMessage) => void) => {
    connectedSignal = options.signal;
    connectedSignal?.addEventListener('abort', () => request.destroy(connectedSignal?.reason), { once: true });
    if (headersSent) queueMicrotask(() => {
      receive(body as unknown as http.IncomingMessage);
      interval = setInterval(() => { chunks++; body.write('A small trickle. '); }, 500);
    });
    return request;
  }) as typeof http.get);
  let completed = false;
  const pending = fetchArticle('http://example.org/article', { resolve: async value => target(value) }).then(value => { completed = true; return value; });
  await vi.advanceTimersByTimeAsync(7999);
  expect(completed).toBe(false);
  if (headersSent) expect(chunks).toBe(15);
  await vi.advanceTimersByTimeAsync(1);
  expect(completed).toBe(true);
  expect(await pending).toBeNull();
  expect(connectedSignal?.aborted).toBe(true);
  expect(request.destroy).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it('shares the original deadline across redirects and ignores a late redirect response', async () => {
  let finishSecond!: (value: typeof response & { location: string }) => void;
  const signals: AbortSignal[] = [];
  const transport = vi.fn(async (_target, signal: AbortSignal) => {
    signals.push(signal);
    if (signals.length === 1) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return { ...response, status: 302, location: '/second' };
    }
    return new Promise<typeof response & { location: string }>(resolve => { finishSecond = resolve; });
  });
  let completed = false;
  const pending = fetchArticle('https://example.org/article', { resolve: async value => target(value), transport }).then(value => { completed = true; return value; });
  await vi.advanceTimersByTimeAsync(7999);
  expect(completed).toBe(false);
  expect(transport).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  expect(completed).toBe(true);
  expect(await pending).toBeNull();
  expect(signals[0]).toBe(signals[1]);
  expect(signals[1]?.aborted).toBe(true);
  finishSecond({ ...response, status: 302, location: '/third' });
  await vi.advanceTimersByTimeAsync(1);
  expect(transport).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});

it('clears the deadline after success and ordinary failure', async () => {
  expect(await fetchArticle('https://example.org/article', { resolve: async value => target(value), transport: async () => response })).not.toBeNull();
  expect(vi.getTimerCount()).toBe(0);
  expect(await fetchArticle('https://example.org/article', { resolve: async () => { throw new Error('DNS failure'); } })).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});
