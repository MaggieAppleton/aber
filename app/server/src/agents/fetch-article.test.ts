import { expect, it } from 'vitest';
import { fetchArticle, isPublicAddress, resolvePublicUrl } from './fetch-article.js';

it('refuses private IPv4, IPv6, local names, credentials and non-HTTP URLs', async () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '::1', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:c0a8:1']) expect(isPublicAddress(address)).toBe(false);
  expect(isPublicAddress('93.184.216.34')).toBe(true);
  for (const url of ['http://127.0.0.1', 'http://localhost', 'http://device.local', 'http://user:pass@example.org', 'file:///etc/passwd']) await expect(resolvePublicUrl(url)).rejects.toThrow();
});
it('extracts complete readable article text', async () => {
  const paragraph = 'This study reports a measured result with enough detail to be useful to a reader. '.repeat(10);
  const article = await fetchArticle('https://example.org/article', {
    resolve: async value => ({ url: new URL(value), address: '93.184.216.34', family: 4 }),
    transport: async () => ({ status: 200, type: 'text/html', body: `<html><head><title>A measured result</title></head><body><article><h1>A measured result</h1><p>${paragraph}</p></article></body></html>` }),
  });
  expect(article?.title).toBe('A measured result'); expect(article?.text).toContain(paragraph.trim());
});
it('validates redirect targets before making the next request', async () => {
  let requests = 0;
  const article = await fetchArticle('https://example.org/redirect', {
    resolve: async value => new URL(value).hostname === 'example.org' ? { url: new URL(value), address: '93.184.216.34', family: 4 } : resolvePublicUrl(value),
    transport: async () => { requests++; return { status: 302, location: 'http://169.254.169.254/latest/meta-data', type: 'text/html', body: '' }; },
  });
  expect(article).toBeNull(); expect(requests).toBe(1);
});
