import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { withinArticleDeadline } from './article-deadline.js';

export interface FetchedArticle {
  url: string;
  title: string;
  text: string;
  byline: string | null;
  siteName: string | null;
  fetchedAt: string;
}

export function isPublicAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (ip.startsWith('::ffff:')) {
    const mapped = ip.slice(7);
    if (mapped.includes('.')) return isPublicAddress(mapped);
    const chunks = mapped.split(':');
    if (chunks.length !== 2) return false;
    const n = Number.parseInt(chunks[0]!, 16) * 65536 + Number.parseInt(chunks[1]!, 16);
    return isPublicAddress([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'));
  }
  if (isIP(ip) === 4) {
    const [a, b, c] = ip.split('.').map(Number) as [number, number, number];
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 168 || b === 0 || (b === 0 && c === 2)))
      || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  if (isIP(ip) === 6) {
    // Global unicast only. This excludes loopback, link-local, multicast, ULA,
    // IPv4-compatible addresses and metadata endpoints.
    return /^[23][0-9a-f]{3}:/.test(ip) && !ip.startsWith('2001:db8:');
  }
  return false;
}

export async function resolvePublicUrl(value: string): Promise<{ url: URL; address: string; family: number }> {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw new Error('Only public HTTP articles are fetched');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('Local addresses are not fetched');
  const resolved = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true });
  if (!resolved.length || resolved.some(item => !isPublicAddress(item.address))) throw new Error('Private addresses are not fetched');
  return { url, ...resolved[0]! };
}

type ArticleResponse = { status: number; location?: string; type: string; body: string };
type Transport = (target: Awaited<ReturnType<typeof resolvePublicUrl>>, signal: AbortSignal) => Promise<ArticleResponse>;

const requestArticle: Transport = (target, signal) => new Promise((resolve, reject) => {
  const client = target.url.protocol === 'https:' ? https : http;
  // Pin the validated DNS answer. A second DNS resolution could otherwise turn
  // a public URL into a private request between validation and connection.
  const request = client.get(target.url, {
    headers: { 'user-agent': 'Aber/1.0 (local research reader)', accept: 'text/html,application/xhtml+xml' },
    lookup: (_host, _opts, callback) => callback(null, target.address, target.family),
    signal,
  }, response => {
    const chunks: Buffer[] = [];
    let bytes = 0;
    response.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 2_000_000) request.destroy(new Error('Article is larger than 2 MB'));
      else chunks.push(chunk);
    });
    response.on('error', reject);
    response.on('end', () => resolve({ status: response.statusCode ?? 0, location: response.headers.location, type: response.headers['content-type'] ?? '', body: Buffer.concat(chunks).toString('utf8') }));
  });
  request.on('error', reject);
});

/** A fetch failure never prevents capture or signal creation. */
export async function fetchArticle(value: string, options: { transport?: Transport; resolve?: typeof resolvePublicUrl } = {}): Promise<FetchedArticle | null> {
  try {
    return await withinArticleDeadline(async (signal, check) => {
      let next = value;
      for (let redirects = 0; redirects <= 4; redirects++) {
        check();
        const target = await (options.resolve ?? resolvePublicUrl)(next);
        // DNS lookup itself cannot be cancelled; a late result must not open a socket.
        check();
        const response = await (options.transport ?? requestArticle)(target, signal);
        check();
        if (response.status >= 300 && response.status < 400 && response.location) {
          next = new URL(response.location, target.url).href;
          continue;
        }
        if (response.status !== 200 || !/text\/html|application\/xhtml\+xml/i.test(response.type)) return null;
        const { document } = parseHTML(response.body);
        // Readability's DOM contract is implemented by linkedom at runtime.
        const article = new Readability(document as unknown as Document).parse();
        check();
        if (!article?.textContent?.trim()) return null;
        return { url: target.url.href, title: article.title ?? '', text: article.textContent.trim(), byline: article.byline ?? null, siteName: article.siteName ?? null, fetchedAt: new Date().toISOString() };
      }
      return null;
    });
  } catch {
    return null;
  }
}
