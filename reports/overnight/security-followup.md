# Security follow-up

1 November 2026. The additional pass checked the fixes from [round one](security-round1.md) and hardened local media decoding. This is scoped evidence for the local v1 app, not a claim of exhaustive security testing.

- **Local HTTP authority:** an independent reviewer exercised a temporary Hono/Node server with raw HTTP. Foreign and malformed Host values were rejected across route classes and methods; valid loopback requests remained usable. The production smoke now repeats a foreign-Host request against its own synthetic database. Node's `fetch` silently substitutes its destination Host, so the smoke uses `node:http` to test the intended header.
- **Article deadline:** independent follow-up observed the real temporary trickle response ending after about eight seconds; late DNS results issued no request. Deterministic tests cover redirects, headers, body receipt and timer cleanup. Native DNS lookup itself cannot be cancelled; its late result is ignored.
- **Media:** probe and decode now share an opened-file, format-allowlisted policy, finite work/output limits and cancellation. Ordinary formats, a 48 MP photo, deadlines and cleanup passed synthetic tests. See [media validation](media-validation.md) for the precise bounds and limitations. This is a decoder policy, not a general process sandbox.
- **Dependencies:** the retained [npm advisory audit](dependency-audit.json) reports zero known vulnerabilities in the installed tree. No package upgrades were needed.
- **Configured keys:** an exact-match scan checked both configured provider keys against 616 tracked/staged files and found no matches. Values were never printed; `.env` and the local database remain ignored. [Scan record](secret-scan.json).
- **Preservation:** tests use isolated databases and generated media. No personal data, credentials or screenshots were exported; no new paid security probes ran.

The first review's Host and article-deadline findings are closed. The media restrictions address the additional decoder boundary. The existing local-only binding, mutation Origin checks, typed actor permissions and escaped rendering remain in place. Future remote hosting and authentication still require their own review.
