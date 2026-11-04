# Guide 3: Deploy to the team Coolify server

**For:** a coding agent on Maggie's MacBook, working **with Maggie**. **Read first:** [handoff rules](README.md#rules-for-every-agent) and the whole [hosting guide](../hosting-guide.md).

## Before you start

Stop and tell Maggie what's missing if any of these isn't true:

- [ ] Guide 2's PR is merged into `main` (Dockerfile, `compose.yaml`, token auth, backup sidecars, restore-drill script).
- [ ] Maggie has the server owner's answers to [hosting guide Step 1](../hosting-guide.md#step-1-questions-for-the-servers-owner). Ask her to paste the answers (not any secrets) into the chat, and keep them in front of you. **Several steps below depend on them.**
- [ ] Maggie has a password manager entry ready called "Aber", for the values below.

## Who does what

| You (the agent) | Maggie |
| --- | --- |
| Explain each step, generate commands, check results, keep the checklist | Every click in Coolify, every Tailscale admin change, creating every API key and account |
| Run commands on her Mac, and on the server **only** if she gives you Tailscale SSH access and the owner allows it | Pasting secrets into her password manager and Coolify |
| Write the deployment report and update the docs | Deciding anything the owner's answers leave open |

You never see a secret. When one is needed, say which variable it is and where it goes.

## Steps

### 1. Tailscale on Maggie's devices

Follow [hosting guide Step 2](../hosting-guide.md#step-2-tailscale-on-your-devices), using the owner's answer about which tailnet. Check: `tailscale status` on the Mac lists the server. If the owner shared the server into Maggie's personal tailnet, it shows as shared.

If her Mac is company-managed, check with her that Tailscale is allowed on it before installing.

### 2. Create the secrets

Maggie creates these and saves each one to her password manager **first**. Give her this list and the commands; don't run the generators yourself in a way that prints values into your context.

| Variable | How Maggie makes it |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI console: new project "Aber", key for that project only, monthly budget set |
| `ANTHROPIC_API_KEY` | Anthropic console: new workspace "Aber" if available, key for it, spend limit set |
| `TYPESAFE_API_KEY` | TypeSafe console: a key only for Aber (Jev decisions) |
| `ABER_SESSION_SECRET` | `openssl rand -base64 48 \| pbcopy`, then paste into the password manager |
| `ABER_LOGIN_TOKEN` | `openssl rand -base64 32 \| pbcopy` |
| `ABER_CAPTURE_TOKEN` | `openssl rand -base64 32 \| pbcopy` |
| `LITESTREAM_ACCESS_KEY_ID`, `LITESTREAM_SECRET_ACCESS_KEY` | Backblaze: private bucket `aber-backups-<random>`, application key restricted to that bucket ([hosting guide Step 7](../hosting-guide.md#step-7-backups)) |
| `RESTIC_PASSWORD` | `openssl rand -base64 32 \| pbcopy`. Losing it makes media backups unreadable |

Ask whether work provides OpenAI, Anthropic or TypeSafe access to use instead of personal keys (hosting guide, [Who can see what](../hosting-guide.md#who-can-see-what)).

`pbcopy` puts the value on the clipboard without showing it. Remind Maggie to copy something harmless afterwards to clear the clipboard.

### 3. Create the app in Coolify

Walk Maggie through [hosting guide Step 5](../hosting-guide.md#step-5-create-the-app-in-coolify). Coolify's labels change between versions, so ask her what she sees and adapt. The non-negotiables:

- Resource type **Docker Compose**, from `maggieappleton/aber`, branch `main`, file `compose.yaml`.
- **No domain.** If Coolify fills one in automatically, remove it.
- Every secret from step 2 added as an environment variable, **locked**, and **not** a build variable.
- Non-secret settings: `HOST=0.0.0.0`, `AGENT_MODE=live`, `DAILY_SPEND_CAP_USD=5` (or Maggie's choice), the `JEV_*` values from `.env.example`, the Litestream bucket and endpoint. Leave `ABER_ALLOWED_HOSTS` for step 4.
- `./data` on a persistent volume.
- **Don't deploy yet** if `ABER_ALLOWED_HOSTS` is required at start-up; it's set in step 4.

### 4. Private HTTPS address

Follow [hosting guide Step 6](../hosting-guide.md#step-6-private-https-address-with-tailscale-serve), the variant the owner agreed to:

- **Host access:** on the server, `tailscale serve --bg 3000` (or `--https=<port>` if 443 is taken). Note the `https://…ts.net` address it prints.
- **Sidecar:** if the owner prefers a Tailscale container with its own machine name, stop and agree the details with Maggie and the owner before writing it. That changes `compose.yaml`, so it's a small PR of its own.

Then Maggie sets `ABER_ALLOWED_HOSTS` to the address's hostname (no `https://`, no path) in Coolify, and deploys.

### 5. Verify: nothing public

Run these and show Maggie the results. Every one must pass before any real use.

| Check | How | Pass |
| --- | --- | --- |
| Healthy | On the server: `curl -s http://127.0.0.1:3000/healthz` | `{"ok":true}` |
| Not on the public address | From the Mac **with Tailscale off**: `curl -m 5 http://<server public IP>:3000/healthz` | Times out or refused |
| No Coolify route | In Coolify, the app's proxy or domain settings | Nothing listed |
| Port binding | On the server: `docker ps --format '{{.Ports}}'` for the Aber container | `127.0.0.1:3000->3000/tcp`, never `0.0.0.0:3000` |
| Auth on | From the Mac with Tailscale on: `curl -s -o /dev/null -w '%{http_code}' https://<address>/api/world` | `401` |
| Tailnet only | Same URL from the iPhone with Tailscale **off** | Doesn't load |
| No secrets in the image | On the server: `docker run --rm <aber image> sh -c 'ls -a /app'` | No `.env` |
| Starts empty | Sign in (step 6), open Briefing | No themes, theories or signals |

If any check fails, stop and fix it with Maggie before continuing.

### 6. Sign in on each device

Maggie opens `https://<address>/login#<ABER_LOGIN_TOKEN>` on the Mac, then on the iPhone (Safari), pasting the token from her password manager. Check that the address bar no longer shows the token afterwards. On the iPhone: **Share → Add to Home Screen**.

### 7. Backups and the restore drill

- First, Maggie makes one test capture in the web app ("Restore drill test"), so there's something to look for.
- Check that Litestream is replicating: its container logs show recent syncs, and the B2 bucket has objects under the database prefix.
- Run the restore drill script from Guide 2 **on the Mac**, using the B2 credentials from Maggie's password manager in her shell. They go into her environment, not into your context, a file or the chat. Restore into a new temporary folder, start Aber on it with `AGENT_MODE=fake`, and check the "Restore drill test" capture is there. Then delete the temporary folder.
- Add a quarterly reminder for Maggie (ask where she keeps reminders).

### 8. iPhone capture

Follow [hosting guide Step 8](../hosting-guide.md#step-8-capture-from-the-iphone): VPN On Demand for `*.ts.net`, then the Dump Shortcut with `Authorization: Bearer <ABER_CAPTURE_TOKEN>`. Maggie builds the Shortcut; you check the result. Test with:

1. a shared Safari link;
2. a short typed note;
3. a Voice Memo;
4. Tailscale switched off, to check the "Not saved" path keeps the input on the clipboard.

Each successful test should appear in the Dump log within a minute or two.

### 9. Final checklist and docs

- Walk through the [hosting guide's security checklist](../hosting-guide.md#step-9-security-checklist) with Maggie and tick each item.
- Update the docs in a small PR: the actual address shape (without the tailnet name if Maggie prefers), which Step 6 variant was used, the owner's answers that affect operations, and the date. Update `docs/HANDOFF.md` "Next steps" to say Aber is deployed.

## Report

Each check from step 5 with its result, the restore-drill result, the Shortcut tests, anything that differed from the hosting guide and why, and the docs PR link.
