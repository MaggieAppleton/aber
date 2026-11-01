/** Only the app's exact loopback authorities may reach this unauthenticated server. */
function localAuthority(value: string, protocol: string): string | null {
  const match = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::([1-9]\d{0,4}))?$/i.exec(value);
  if (!match || (match[1] && Number(match[1]) > 65535)) return null;
  return new URL(`${protocol}//${value}`).host.toLowerCase();
}

export function isLocalRequest(request: Request): boolean {
  try {
    const url = new URL(request.url);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return false;
    const authority = localAuthority(url.host, url.protocol);
    if (!authority) return false;
    // Node derives the URL from Host. Check both for other Request adapters too;
    // forwarded headers are deliberately not trusted by this direct local server.
    const host = request.headers.get('host');
    return host === null || localAuthority(host, url.protocol) === authority;
  } catch {
    return false;
  }
}
