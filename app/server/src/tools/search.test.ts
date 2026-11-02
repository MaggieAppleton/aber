import { expect, it } from 'vitest';
import { createDatabase, migrate } from '../db/index.js';
import { createTools, saveTranscript } from './index.js';

it('finds all five material kinds including dump text and transcripts, without leaking owners', () => {
  const db = createDatabase(); migrate(db); const tools = createTools(db);
  const person = { kind: 'person' as const, id: 'maggie' };
  try {
    for (const id of ['maggie', 'alice']) db.prepare('INSERT OR IGNORE INTO people(id,name,created_at) VALUES(?,?,?)').run(id, id, new Date().toISOString());
    const theme = tools.call('writeTheme', { name: 'Quartz theme' }, person);
    tools.call('retireTheme', { id: theme.id, reason: 'superseded' }, person);
    const theory = tools.call('writeTheory', { claim: 'Quartz theory' }, person);
    tools.call('retireTheory', { id: theory.id, reason: 'disproven' }, person);
    const dump = tools.call('captureDump', { text: 'Quartz raw dump text' }, person);
    tools.call('writePrototype', { name: 'Quartz prototype', status: 'shelved' }, person);
    db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES('search-fixture','process_dump','fake','fixture','v1','done',?)").run(new Date().toISOString());
    tools.call('createSignal', { dumpId: dump.id, gist: 'Quartz signal' }, { kind: 'agent', job: 'process_dump', runId: 'search-fixture' });
    const voice = tools.call('captureDump', { text: 'A voice note', attachments: [{ kind: 'audio', media: { path: 'fixture.m4a', mime: 'audio/mp4', bytes: 1, sha256: 'fixture' } }] }, person);
    saveTranscript(db, { dumpId: voice.id, mediaId: voice.attachments[0].media_id, text: 'Voice-only-quartz-token', provider: 'fake', model: 'gpt-transcribe' });
    const privateDump = tools.call('captureDump', { text: 'Quartz private material' }, { kind: 'person', id: 'alice' });
    const results = tools.call('search', { text: 'quartz', limit: 100 }, person);
    expect(new Set(results.map((item: any) => item.kind))).toEqual(new Set(['theme', 'theory', 'signal', 'prototype', 'dump']));
    expect(results.some((item: any) => item.id === dump.id && item.kind === 'dump')).toBe(true);
    expect(results.some((item: any) => item.id === privateDump.id)).toBe(false);
    expect(results.find((item: any) => item.id === theory.id)).toMatchObject({ status: 'retired', retire_reason: 'disproven' });
    expect(results.find((item: any) => item.id === theme.id)).toMatchObject({ status: 'retired', retire_reason: 'superseded' });
    expect(tools.call('search', { text: 'voice-only-quartz-token', limit: 100 }, person)).toEqual([expect.objectContaining({ id: voice.id, kind: 'dump' })]);
  } finally { db.close(); }
});
