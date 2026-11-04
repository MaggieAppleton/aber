# Guide 1: Separate example data from real data

**For:** a coding agent on Maggie's MacBook. **Read first:** [handoff rules](README.md#rules-for-every-agent).

## Goal

The deployed Aber will start with an empty database. On the laptop, Maggie wants an **example database kept for testing**, separate from any real use. Today `app/data/` holds the example world from `npm run seed`, and possibly a few real captures made while testing.

At the end:

| Folder | Contains | Used for |
| --- | --- | --- |
| `~/aber-example/` | The example world (plus anything Maggie chooses to keep with it) | Local testing and demos: `ABER_DATA_DIR=~/aber-example` |
| `app/data/` | Empty, or removed | Nothing until deployment; the real database lives on the server |

## Background you need

- The server never seeds by itself. Migrations create the tables and the owner row (`0002_owner.sql`), nothing else.
- `npm run seed` only seeds an **empty** database. Reseeding an example database does nothing; seeding a database with real content is refused.
- `npm run seed:demo -- --dir <new dir>` creates the richer authored demo in a new directory. It refuses existing directories.
- Unit and browser tests create their own temporary databases. They don't use `app/data/`.

## Steps

1. **Get the latest code.** `git fetch && git status`. The fresh-database fix (`0002_owner.sql`) must be in your checkout; if it isn't, stop and tell Maggie which branch has it (`claude/stoic-cannon-qu6m50`, or `main` once merged).
2. **Stop any running Aber server** on ports 3000 or 5174, so the database isn't being written to.
3. **Back up.** `cd app && npm run backup`. Note the folder it prints.
4. **Inspect what's real.** List the dumps that aren't from the seed. The seed's dump IDs are the `id` fields of `DUMPS` in `app/server/src/db/seed-world.ts`; the authored demo's contain `demo-v1:`. For example:
   ```bash
   cd app && node --import tsx --input-type=module -e "
   import Database from 'better-sqlite3';
   import { DUMPS } from './server/src/db/seed-world.ts';
   const seeded = new Set(DUMPS.map(d => d.id));
   const db = new Database('data/aber.db', { readonly: true });
   const rows = db.prepare('SELECT id, captured_at, substr(text,1,80) AS text FROM dumps ORDER BY captured_at').all();
   const real = rows.filter(r => !seeded.has(r.id) && !r.id.includes('demo-v1:'));
   console.log({ total: rows.length, seeded: rows.length - real.length, real: real.length });
   console.table(real);
   "
   ```
   Also count themes, theories and prototypes created by `person:maggie` after the seed's timestamp (the `seed-jig-world` event in `events`), to catch real work that isn't a dump.
5. **If anything looks real, ask Maggie.** Show her the list (first 80 characters each is enough) and ask whether to keep it in the example database or note it down to recapture later. Don't decide for her. There's no tool in this guide for moving individual captures between databases; recapturing on the deployed app is the simple route.
6. **Move the example database.**
   ```bash
   mkdir -p ~/aber-example && cp -Rp app/data/. ~/aber-example/
   ```
   Then check the copy opens and has the same counts as step 4:
   ```bash
   cd app && AGENT_MODE=fake ABER_DATA_DIR=~/aber-example PORT=3001 npm start
   ```
   Open `http://127.0.0.1:3001`, confirm the example themes appear, then stop it.
7. **Empty `app/data/`** only after step 6 is verified **and** Maggie has said yes. Move it aside rather than deleting: `mv app/data ~/aber-data-old-$(date +%Y%m%d)`. Tell her where it went and that she can delete it once deployment works.
8. **Make example mode easy to remember.** Add a short "Example data" note to `app/README.md` under *Run*, giving the two commands from step 6 (seed into an empty folder, start with `ABER_DATA_DIR`). Commit on a branch and open a PR.

## Done when

- [ ] Backup made, folder recorded
- [ ] Real captures (if any) listed and Maggie's decision recorded
- [ ] `~/aber-example` starts and shows the example world
- [ ] `app/data/` is empty or moved aside, with Maggie's agreement
- [ ] README note committed in a PR

## Report

Counts from step 4, Maggie's decision, where the backup and the moved folder are, and the PR link.
