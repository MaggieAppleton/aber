# Aber

A personal tool for collecting signals about where technology is heading, growing them into themes and theories of the future, and turning those theories into things to prototype.

Aber runs locally with React, a Node server and SQLite. The interface and agents use the same typed tools.

## What it does

- Capture notes, links, images and voice recordings; organise observations into signals and themes.
- Write theories with supporting and challenging evidence, confidence history, and conditions that would change your mind.
- Connect theories to prototypes and track what you are building.
- Review agent drafts and suggestions through a briefing, theme sections, columns, an atlas or a timeline. You decide which claims to accept and how confident to be.

## Run locally

Requires **Node 22.13+** and npm. Install **ffmpeg** for voice notes and image conversion.

From the repository root:

```sh
cp .env.example .env
```

Edit `.env` before starting:

- **Live agents:** keep `AGENT_MODE=live`. Set `OPENAI_API_KEY` for the default agents, transcription and embeddings; `ANTHROPIC_API_KEY` enables Claude alternatives and comparison evaluations. Provider calls incur charges; `DAILY_SPEND_CAP_USD` defaults to `5`.
- **Synthetic mode:** set `AGENT_MODE=fake`. This uses deterministic scripted responses without API keys or paid model calls.

```sh
cd app
npm ci
npm run seed
npm run build
npm start
```

Open [Aber at 127.0.0.1:3000](http://127.0.0.1:3000). Seeding adds fictional example material and can be repeated without replacing existing captures. Your database and media stay in `app/data/`; set `ABER_DATA_DIR` to choose another location. Keep `.env` and local data out of version control.

## Verify

Run from `app/`:

```sh
npm run typecheck
npm test
npm run build
npm run eval -- --fake
```

See the [app guide](app/README.md) for development mode, browser tests, the capture API and backups; the [evaluation guide](app/evals/README.md) covers synthetic and live-provider checks.

The [design model](docs/design-model.md) explains signals, themes, theories, prototypes and agent permissions. The [build specification](docs/build-spec.md) describes the application architecture.

## License

[MIT](LICENSE) © 2026 Maggie Appleton.
