import { createHash } from 'node:crypto';
import { existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmdirSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase, type Database } from './index.js';
import { seed } from '../seed.js';
import { insert, normaliseUrl, type ToolContext, type Row } from '../tools/core.js';
import { actorString } from '../tools/authority.js';
import { mergeSignals } from '../tools/merges.js';
import { DEMO_IDS as ids, DEMO_MANIFEST, DEMO_MANIFEST_FILENAME, DEMO_VOICE, type DemoInstallation } from './demo-manifest.js';
const digest = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const defaultDataDir = fileURLToPath(new URL('../../../data', import.meta.url));
const sourceVoice = fileURLToPath(new URL('./demo-assets/voice.wav', import.meta.url));
const sourceTranscript = fileURLToPath(new URL('./demo-assets/voice.txt', import.meta.url));

/** All original rows, including history and metadata; pack rows have an explicit reserved prefix. */
export function canonicalSnapshot(db: Database): Record<string, Row[]> {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];
  return Object.fromEntries(tables.map(({ name }) => [name, (db.prepare(`SELECT * FROM "${name}" ORDER BY rowid`).all() as Row[]).filter(row => !Object.values(row).some(value => typeof value === 'string' && value.includes('demo-v1:')))]));
}
function appendPack(db: Database, transcript: string, baselineSha256: string): DemoInstallation {
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
  for (const { name } of names) for (const row of db.prepare(`SELECT * FROM "${name}"`).all() as Row[]) {
    if (Object.values(row).some(value => typeof value === 'string' && value.includes('demo-v1:'))) throw new Error(`Demo ID collision in ${name}`);
  }
  const now = new Date().toISOString();
  db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at,finished_at) VALUES(?,?,?,?,?,'done',?,?)").run(ids.run, 'process_dump', 'seed', 'authored-demo-no-inference', 'demo-v1', now, now);
  const ctx: ToolContext = { db, actor: { kind: 'agent', job: 'process_dump', runId: ids.run }, ownerId: 'maggie', now, tool: 'seedDemo' };
  const put = (table: string, value: Row) => insert(ctx, table, value);
  const event = (key: string, tool: string, kind: string, id: string, dumpId: string | null, after: Row, before?: unknown) => put('events', { id: `demo-v1:event:${key}`, at: now, actor: actorString(ctx.actor), tool, object_kind: kind, object_id: id, dump_id: dumpId, after_json: JSON.stringify(after), before_json: before ? JSON.stringify(before) : null });
  for (const [id, text] of [
    [ids.voiceDump, 'Synthetic demo voice note: Recovery rehearsal'],
    [ids.reportDump, 'Synthetic demo: Alder Warehouse incident report and a separate lookup-latency benchmark. Fictional examples only.'],
    [ids.independentDump, 'Synthetic demo: an independent account of the same Alder Warehouse incident, merged with its first observation.'],
  ]) { const dump = put('dumps', { id, text, captured_at: now, captured_from: 'web', is_ask: 0, status: 'done' }); event(`dump:${id}`, 'seedDemo', 'dump', id, id, dump); }
  put('media', { id: ids.media, path: DEMO_VOICE.filename, mime: DEMO_VOICE.mime, bytes: DEMO_VOICE.bytes, sha256: DEMO_VOICE.sha256 });
  put('dump_attachments', { id: 'demo-v1:audio-attachment', dump_id: ids.voiceDump, kind: 'audio', media_id: ids.media, position: 0 });
  put('transcripts', { dump_id: ids.voiceDump, media_id: ids.media, text: transcript, provider: 'synthetic-offline', model: 'macos-say' });
  const urls = { report: 'https://example.invalid/aber-demo-v1/recovery', independent: 'https://example.invalid/aber-demo-v1/independent', decoy: 'https://example.invalid/aber-demo-v1/latency' };
  for (const [id, dumpId, url, position] of [['report', ids.reportDump, urls.report, 0], ['independent', ids.independentDump, urls.independent, 0], ['latency', ids.reportDump, urls.decoy, 1]] as const) put('dump_attachments', { id: `demo-v1:link:${id}`, dump_id: dumpId, kind: 'link', url, url_normalised: normaliseUrl(url), position });
  const theme = put('themes', { id: ids.theme, name: 'Robotics', status: 'draft' });
  event('theme', 'createDraftTheme', 'theme', ids.theme, ids.voiceDump, theme);
  const theory = put('theories', { id: ids.theory, claim: 'Warehouse picking robots still need human recovery at least weekly in 2028', body: 'Synthetic draft to test with physical deployments. Count supervised recoveries per robot-week; this is an authored proposal, not a held belief.', status: 'draft', authorship: 'agent', horizon: 2028, tripwire: '', tripwire_version: 0 });
  put('theory_versions', { id: 'demo-v1:theory-version', theory_id: ids.theory, claim: theory.claim, body: theory.body, tripwire: '', horizon: 2028, at: now, actor: actorString(ctx.actor) });
  put('theory_themes', { theory_id: ids.theory, theme_id: ids.theme });
  event('theory', 'createDraftTheory', 'theory', ids.theory, ids.voiceDump, theory);
  const prototype = put('prototypes', { id: ids.prototype, name: 'Recovery rehearsal', body: 'Synthetic prototype idea: a tabletop gripper and transparent packages; measure how often a person must intervene.', draft: 1, status: 'idea', links_json: '[]' });
  put('prototype_theories', { prototype_id: ids.prototype, theory_id: ids.theory });
  event('prototype', 'createDraftPrototype', 'prototype', ids.prototype, ids.voiceDump, prototype);
  const gist = 'Fictional Alder Warehouse picking robot needed 17 human resets in one week when transparent packaging defeated its gripper';
  for (const [id, text, dumpId, url] of [[ids.signal, gist, ids.reportDump, urls.report], [ids.copy, gist, ids.independentDump, urls.independent], [ids.decoy, 'Fictional Alder Warehouse improves robot task-lookup latency by 45%; this is a separate benchmark, not a recovery incident', ids.reportDump, urls.decoy]]) {
    const signal = put('signals', { id, gist: text, note: 'Authored synthetic demo; no real-world event or personal observation is claimed.' });
    put('signal_sources', { id: `${id}:source`, signal_id: id, url, url_normalised: normaliseUrl(url), title: 'Synthetic demonstration source', own_observation: 0, position: 0 });
    put('signal_origins', { signal_id: id, dump_id: dumpId });
    put('signal_themes', { signal_id: id, theme_id: ids.theme });
    event(`signal:${id}`, 'createSignal', 'signal', id, dumpId, signal);
  }
  put('signal_origins', { signal_id: ids.signal, dump_id: ids.voiceDump });
  put('evidence', { id: 'demo-v1:evidence', signal_id: ids.signal, theory_id: ids.theory, stance: 'supports', note: 'A synthetic weekly recovery example motivating the draft.' });
  const revision = put('suggestions', { id: ids.revision, kind: 'revision', target_kind: 'theory', target_id: 't3', payload_json: JSON.stringify({ claim: 'Agents keep context across months while a project vault stays enabled with consent' }), reasoning: 'Synthetic proposal demonstrating review before application; the canonical held theory remains unchanged.', status: 'pending', dump_id: ids.voiceDump });
  event('revision', 'proposeRevision', 'suggestion', ids.revision, ids.voiceDump, revision);
  const mergeCtx = { ...ctx, tool: 'mergeNearDuplicateSignals', dumpId: ids.independentDump };
  const merge = mergeSignals(mergeCtx, ids.signal, ids.copy, 'Synthetic independent source reports the very same fictional incident; the latency benchmark stays separate.');
  // Stabilise only this newly inserted fixture row before publishing the fresh database.
  db.prepare('UPDATE merges SET id=? WHERE id=? AND run_id=?').run(ids.merge, merge.id, ids.run);
  event('merge', 'mergeNearDuplicateSignals', 'merge', ids.merge, ids.independentDump, { ...merge, id: ids.merge }, mergeCtx.before);
  put('replies', { id: 'demo-v1:reply', dump_id: ids.voiceDump, parts_json: JSON.stringify([
    { type: 'text', text: 'Synthetic demo: one incident filed, three drafts to explore, one pending revision and one reversible merge. No model calls ran.' },
    { type: 'data-filed', data: { themeId: ids.theme, themeName: 'Robotics', count: 1, signals: [{ id: ids.signal, gist }] } },
    ...[[theme, 'theme'], [theory, 'theory'], [prototype, 'prototype']].map(([object, kind]) => ({ type: 'data-draft', data: { ...(object as Row), kind } })),
  ]) });
  const manifest: DemoInstallation = { pack: DEMO_MANIFEST, baselineSha256, createdAt: now };
  put('events', { id: ids.manifest, at: now, actor: actorString(ctx.actor), tool: 'seedDemo', object_kind: 'world', object_id: 'demo-v1', after_json: JSON.stringify(manifest) });
  return manifest;
}
function canonicalPath(path: string): string {
  let existing = resolve(path); const suffix: string[] = [];
  while (!existsSync(existing)) { suffix.unshift(basename(existing)); existing = dirname(existing); }
  return resolve(realpathSync(existing), ...suffix);
}
export interface DemoResult { status: 'created' | 'unchanged'; directory: string; dbPath: string; manifest: DemoInstallation }

/** Requires an explicitly named NEW directory. Existing unmarked data is never opened or modified. */
export function createDemoDirectory(directory: string, protectedDirectories: string[] = [], assets: { voicePath?: string; transcriptPath?: string } = {}): DemoResult {
  if (!directory?.trim()) throw new Error('An explicit new demo directory is required');
  const target = canonicalPath(directory);
  for (const path of [defaultDataDir, ...protectedDirectories]) {
    const protectedPath = canonicalPath(path);
    if (target === protectedPath || target.startsWith(protectedPath + sep)) throw new Error('Refusing protected main/default data directory');
  }
  const dbPath = join(target, 'aber.db'); const manifestPath = join(target, DEMO_MANIFEST_FILENAME);
  if (existsSync(target)) {
    if (!lstatSync(target).isDirectory() || !existsSync(manifestPath) || !existsSync(dbPath)) throw new Error('Refusing existing directory without a matching demo manifest');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as DemoInstallation;
    if (JSON.stringify(manifest.pack) !== JSON.stringify(DEMO_MANIFEST)) throw new Error('Existing demo manifest does not match this fixture version');
    return { status: 'unchanged', directory: target, dbPath, manifest }; // No DB connection, migration or file writes.
  }
  const voice = readFileSync(assets.voicePath ?? sourceVoice); const transcript = readFileSync(assets.transcriptPath ?? sourceTranscript);
  if (voice.length !== DEMO_VOICE.bytes || digest(voice) !== DEMO_VOICE.sha256 || digest(transcript) !== DEMO_VOICE.transcriptSha256) throw new Error('Demo media or transcript hash mismatch');
  const stage = mkdtempSync(join(dirname(target), '.aber-demo-v1-')); let db: Database | undefined; let published = false;
  const copied: { path: string; ino: number; dev: number }[] = [];
  try {
    mkdirSync(join(stage, 'media')); writeFileSync(join(stage, 'media', DEMO_VOICE.filename), voice, { flag: 'wx' });
    db = createDatabase(join(stage, 'aber.db'));
    let manifest!: DemoInstallation;
    db.transaction(() => {
      seed(db!);
      const baseline = JSON.stringify(canonicalSnapshot(db!));
      manifest = appendPack(db!, transcript.toString('utf8'), digest(baseline));
      if (JSON.stringify(canonicalSnapshot(db!)) !== baseline) throw new Error('Demo changed a canonical row');
      if ((db!.pragma('foreign_key_check') as Row[]).length || (db!.pragma('integrity_check') as Row[])[0]?.integrity_check !== 'ok') throw new Error('Demo database integrity check failed');
    })();
    db.close(); db = undefined;
    writeFileSync(join(stage, DEMO_MANIFEST_FILENAME), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
    // Exclusive directory reservation and atomic exclusive links prevent a racing target from being overwritten.
    mkdirSync(target); published = true; mkdirSync(join(target, 'media'));
    for (const relative of ['aber.db', join('media', DEMO_VOICE.filename), DEMO_MANIFEST_FILENAME]) {
      const destination = join(target, relative); const source = join(stage, relative);
      const { ino, dev } = statSync(source); linkSync(source, destination); copied.push({ path: destination, ino, dev });
    }
    return { status: 'created', directory: target, dbPath, manifest };
  } catch (error) {
    db?.close();
    // Remove only files this invocation copied; unknown files keep the directory from being removed.
    for (const file of copied.reverse()) {
      try { const actual = lstatSync(file.path); if (actual.ino === file.ino && actual.dev === file.dev) unlinkSync(file.path); } catch { /* A later removal or replacement is preserved. */ }
    }
    if (published) { try { rmdirSync(join(target, 'media')); } catch {} try { rmdirSync(target); } catch {} }
    throw error;
  } finally { rmSync(stage, { recursive: true, force: true }); }
}
