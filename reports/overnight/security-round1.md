# Security review, round 1

Reviewed `a6c5dca7d11113c53a540fea4841c2d4081963d5` on 1 November 2026. Scope: the local-only application, including a hostile website visited while Aber is running and hostile material deliberately captured into Aber. Accounts, deployment and remote access remain out of scope, as specified in `docs/build-spec.md`.

Two actionable findings: one P1 confidentiality boundary and one P2 availability boundary. No application files changed during this pass.

## P1 — Reject untrusted Host values before serving the local API

**Location:** `app/server/src/http/app.ts:20–29`; the sensitive route at `:53`.

The middleware checks `Origin` on writes, but never validates the request hostname. A request addressed to `http://attacker.example:3000/api/world` is accepted and returns the full world, including captures and their processing details. It also accepts a foreign Origin on GET. Binding to `127.0.0.1` prevents direct remote connections; it does not establish that a browser's hostname belongs to the local app.

**Threat/preconditions:** Maggie visits an attacker-controlled page using the API's port while Aber is running. In a browser/network configuration that permits DNS rebinding to loopback, the attacker changes that hostname's address to `127.0.0.1`. The browser continues to see the attacker's origin, while the local server accepts its Host. The attacker can read captures through the same-origin request and send the data to their server. This review verified the missing server boundary, not a browser-specific DNS-rebinding chain. Browser local-network permission and DNS protections can obstruct this attack; ordinary cross-origin fetches alone cannot read the response through the same-origin policy.

**Isolated reproduction:** create an in-memory database and a synthetic capture, then:

```ts
const response = await app.request('http://attacker.example:3000/api/world', {
  headers: { Host: 'attacker.example:3000', Origin: 'http://attacker.example:3000' },
});
// Actual: 200; response includes the synthetic private capture.
// Expected: 403 before the route runs.
```

The test also accepted the same foreign Host without Origin. A POST from `Origin: https://attacker.example` correctly returned 403.

**Narrow fix:** validate the effective request hostname against exact loopback names (`127.0.0.1`, `localhost`, `[::1]`) for every route, before API, media and static handling. Do not accept arbitrary hostnames just because DNS currently resolves locally, and do not trust forwarded-host headers in this direct local server. Keep the existing write Origin checks. Test both foreign Host variants, legitimate direct requests and Vite's proxy path. This requires no authentication system or deployment work.

## P2 — Give article fetching an absolute deadline

**Location:** `app/server/src/agents/fetch-article.ts:55–75`, especially `timeout: 8000` at `:62`; `app/server/src/agents/jobs/process-dump.ts:28` waits for all fetches before processing.

The current timeout measures socket inactivity. A server that sends small chunks more frequently than every eight seconds can hold the request open indefinitely while remaining far below the 2 MB body cap. The default two worker slots can both be occupied by two captures of such pages. Worker heartbeats keep those jobs fresh, so stale-job recovery does not release them. Link preview calls can retain the same kind of connection.

**Threat/preconditions:** an article server controls the response to a URL Maggie captures or previews. No ability to call the API from another origin is required.

**Bounded reproduction:** a temporary loopback HTTP server returned an HTML header, then 23 bytes every 1.5 seconds, without ending the response. `fetchArticle` used its actual `requestArticle` transport; only the URL resolver was explicitly replaced to point to this isolated test server. After 9.2 seconds the promise was still pending, despite the configured 8-second timeout. The test then closed the connection and cleaned up. It did not bypass or test the production public-address policy against a real service.

**Narrow fix:** enforce one finite wall-clock deadline across URL resolution, redirects and body receipt; cancel/destroy an active request when it expires, clear the timer on completion and return the existing `null` fallback. Preserve the DNS pinning, redirect validation and byte cap. Add a deterministic trickle-response regression test, preferably with injected timers or transport. An optional capture-job cancellation signal should also propagate to fetches.

## Verified protections and limits of this pass

- The server binds to `127.0.0.1`; ordinary cross-site writes are rejected. The HTTP tool route fixes the actor to `person:maggie`, and agent-only tools cannot be called as a person.
- All registered person-only tools reject agent actors before input parsing. Untouched-draft and confidence authority tests passed, including append-only stance enforcement. Agent tool availability is allowlisted; chat exposes only read/display tools.
- Article fetching rejects tested loopback/private IPv4 and IPv6, local names, credentials and non-HTTP schemes. Each redirect is revalidated and the validated DNS address is pinned for the connection. The existing private-redirect test passed.
- A synthetic traversal path could be registered through the internal `storeMedia` tool, but `/media/:id` rejected it with 400. Job transcription, purge and image processing independently contain resolved paths within the media directory. No path escape was demonstrated. Restricting internal path metadata at public ingress would improve validation, but is not reported as a proven arbitrary-file-access defect.
- Uploaded names do not become filesystem paths or shell commands. Media response headers include `nosniff`; active document types are served as attachments. Application text uses React escaping; no `dangerouslySetInnerHTML` or dynamic JavaScript execution was found.
- Actual installed FFmpeg rejected synthetic HLS HTTP and SDP RTP dependencies with its `file,crypto,data` protocol whitelist. A playlist disguised as PNG also failed without a network request. These are bounded negative cases, not proof of every decoder's safety.
- Chat file-part validation plus the installed AI SDK refused a synthetic `127.0.0.1` file download before contacting the local stub; the response was an error stream. No provider was called. Raw chat message envelopes, media formats and subprocess execution limits deserve further focused testing if those inputs expand.
- Model trace storage records tool content and errors, not provider request headers. No credential exposure was found in the reviewed routes or trace construction. Credentials themselves were not printed or inspected. A dependency advisory lookup was not performed.
- The media GET implementation reads an entire file before applying Range. This is a resource-efficiency concern for large recordings, but this pass did not run a memory-exhaustion test or establish a separate exploit.

## Verification

```sh
cd /Users/maggieappleton/Projects/aber/app
npm test -- --run server/src/http/app.test.ts server/src/agents/fetch-article.test.ts server/src/tools/authority.test.ts server/src/agents/chat.test.ts
```

Result: **4 files, 17 tests passed**. The separate bounded reproduction harness is `/private/tmp/aber-security-round1.mjs`; run it with `node --import tsx /private/tmp/aber-security-round1.mjs` from `app/`. It creates its own in-memory database, temporary directory and loopback server and uses fake model responses. No requests were sent to the running app or a paid model. No production records or files were modified. The only repository change from this review is this report.

## Fix verification — 1 November, approximately 01:07 PDT

Both findings are now fixed in source, following the root agent's implementation assignment. The running app's old bundle was not rebuilt or restarted by this worker.

- **P1 closed:** `http/local-request.ts` validates exact loopback authorities and valid ports, checks the request URL and Host for consistency, and does not trust forwarded hosts. `http/app.ts` applies it before every route and method. The original synthetic foreign-Host reproductions now return **403**, without the capture sentinel. A foreign Origin on an ordinary local GET remains allowed at the HTTP layer; browser same-origin policy still prevents cross-origin JavaScript from reading it. The existing cross-site write returns **403**.
- **P2 closed:** `agents/article-deadline.ts` supplies one 8-second monotonic budget and AbortSignal. `fetch-article.ts` shares them across DNS resolution, redirects, headers and body receipt. It cancels active HTTP work on expiry and checks after each await so late DNS or redirect completions cannot issue another request. Native DNS lookup itself is not cancellable; its late result is ignored. The original loopback trickle reproduction now completes with the fallback instead of remaining pending. Fake-clock tests assert completion at exactly 8,000 ms and zero remaining timers.
- New regression tests cover all HTTP route classes, methods, malformed Host values, allowed development authorities, slow DNS, missing response headers, a body chunk every 500 ms, shared redirect budget, late completions and timer cleanup. The foreign-Host and stalled-DNS tests were observed failing before implementation, then passing after it. The actual trickle reproduction was also rerun before and after the fix.

Fresh validation:

```sh
npm run typecheck
npm test -- --run server/src/http server/src/agents/fetch-article.test.ts server/src/agents/fetch-article-deadline.test.ts server/src/agents/process.test.ts
git diff --check
```

TypeScript and whitespace checks passed. The targeted suite passed **6 files, 30 tests**. The isolated reproduction retained its negative results for traversal serving, private chat-file fetching and FFmpeg network dependencies. No production data or paid providers were used.

Implementation ownership, now frozen: `app/server/src/http/app.ts`, `app/server/src/http/local-request.ts`, `app/server/src/http/local-request.test.ts`, `app/server/src/agents/fetch-article.ts`, `app/server/src/agents/article-deadline.ts`, `app/server/src/agents/fetch-article-deadline.test.ts`, plus this report. Other workers' changes were preserved.
