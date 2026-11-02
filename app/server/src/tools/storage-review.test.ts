import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, migrate, type Database } from '../db/index.js';
import { createTools, AuthorityError } from './index.js';
import { getObject, getWorld } from './queries.js';
import { purgeBin } from './dumps.js';
import { clearRun } from '../agents/cleanup.js';
const person = { kind: 'person', id: 'maggie' } as const;
const agent = { kind: 'agent', job: 'process_dump', runId: 'review-process' } as const;
let db: Database;
let tools: ReturnType<typeof createTools>;
const dump = (text: string) => tools.call('captureDump', { text }, person) as any;
const signal = (dumpId: string, gist: string, url: string) => tools.call('createSignal', { dumpId, gist, sources: [{ url }] }, agent) as any;
const read = (id: string) => getObject(db, 'signal', id)!;
beforeEach(() => {
  db = createDatabase(); migrate(db); tools = createTools(db);
  db.prepare("INSERT OR IGNORE INTO people(id,name,created_at) VALUES('maggie','Maggie',?)").run(new Date().toISOString());
  for (const [id, job] of [['review-process', 'process_dump'], ['review-evidence', 'link_evidence'], ['review-other', 'process_dump']]) {
    db.prepare('INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES(?,?,?,?,?,?,?)')
      .run(id, job, 'fake', 'fake', 'v1', 'running', new Date().toISOString());
  }
});
afterEach(() => db.close());

describe('merge undo preserves later work', () => {
  it('keeps later prose, a repeat origin, sources, filings, and evidence while splitting originals', () => {
    const d1 = dump('First'), d2 = dump('Second'), d3 = dump('Repeat');
    const a = signal(d1.id, 'Original A', 'https://a.test/first');
    const b = signal(d2.id, 'Original B', 'https://b.test/second');
    tools.call('editSignal', { id: a.id, note: 'A note' }, person);
    tools.call('editSignal', { id: b.id, note: 'B note' }, person);
    const merge = tools.call('mergeNearDuplicateSignals', { survivorId: a.id, absorbedId: b.id, reasoning: 'Same observation' }, agent) as any;
    tools.call('editSignal', { id: a.id, gist: 'Later user gist', note: 'Later user note' }, person);
    tools.call('attachOrigin', { signalId: a.id, dumpId: d3.id }, agent);
    const theme = tools.call('writeTheme', { name: 'Later filing' }, person) as any;
    const theory = tools.call('writeTheory', { claim: 'Later evidence' }, person) as any;
    tools.call('fileSignal', { signalId: a.id, themeId: theme.id }, person);
    tools.call('linkEvidence', { signalId: a.id, theoryId: theory.id, stance: 'undermines', note: 'Later decision' }, person);
    db.prepare("INSERT INTO signal_sources(id,signal_id,url,url_normalised,position,created_by,updated_by) VALUES('later-source',?,?,?,2,'person:maggie','person:maggie')")
      .run(a.id, 'https://later.test/report', 'https://later.test/report');
    tools.call('undoMerge', { id: merge.id }, person);
    expect(read(a.id)).toMatchObject({ gist: 'Later user gist', note: 'Later user note', themes: [theme.id] });
    expect(read(a.id).origins.map((o: any) => o.dump_id).sort()).toEqual([d1.id, d3.id].sort());
    expect(read(a.id).sources.map((s: any) => s.url).sort()).toEqual(['https://a.test/first', 'https://later.test/report']);
    expect(read(a.id).evidence).toEqual([expect.objectContaining({ theory: theory.id, stance: 'undermines', note: 'Later decision' })]);
    expect(read(b.id)).toMatchObject({ gist: 'Original B', note: 'B note' });
    expect(read(b.id).origins.map((o: any) => o.dump_id)).toEqual([d2.id]);
    expect(read(b.id).sources.map((s: any) => s.url)).toEqual(['https://b.test/second']);
    expect(db.pragma('foreign_key_check')).toEqual([]);
  });
  it('respects later removals and keeps a later changed absorbed evidence link on the survivor', () => {
    const d = dump('Reports'); const a = signal(d.id, 'A', 'https://a.test/a'); const b = signal(d.id, 'B', 'https://b.test/b');
    const theme = tools.call('writeTheme', { name: 'Area' }, person) as any;
    const removed = tools.call('writeTheory', { claim: 'Remove this evidence' }, person) as any;
    const changed = tools.call('writeTheory', { claim: 'Change this evidence' }, person) as any;
    tools.call('fileSignal', { signalId: b.id, themeId: theme.id }, person);
    tools.call('linkEvidence', { signalId: b.id, theoryId: removed.id, stance: 'supports' }, person);
    tools.call('linkEvidence', { signalId: b.id, theoryId: changed.id, stance: 'supports' }, person);
    const merge = tools.call('mergeNearDuplicateSignals', { survivorId: a.id, absorbedId: b.id, reasoning: 'Same finding' }, agent) as any;
    tools.call('unfileSignal', { signalId: a.id, themeId: theme.id }, person);
    tools.call('unlinkEvidence', { signalId: a.id, theoryId: removed.id }, person);
    tools.call('linkEvidence', { signalId: a.id, theoryId: changed.id, stance: 'undermines', note: 'My changed interpretation' }, person);
    tools.call('undoMerge', { id: merge.id }, person);
    for (const id of [a.id, b.id]) {
      expect(read(id).themes).not.toContain(theme.id);
      expect(read(id).evidence.some((e: any) => e.theory === removed.id)).toBe(false);
    }
    expect(read(a.id).evidence).toContainEqual(expect.objectContaining({ theory: changed.id, stance: 'undermines', note: 'My changed interpretation' }));
    expect(read(b.id).evidence).toContainEqual(expect.objectContaining({ theory: changed.id, stance: 'supports' }));
  });
  it('requires later merges to be undone first and leaves every row unchanged on conflict', () => {
    const d = dump('Three reports'); const a = signal(d.id, 'A', 'https://a.test/a'); const b = signal(d.id, 'B', 'https://b.test/b'); const c = signal(d.id, 'C', 'https://c.test/c');
    const first = tools.call('mergeNearDuplicateSignals', { survivorId: a.id, absorbedId: b.id, reasoning: 'Same event' }, agent) as any;
    const later = tools.call('mergeNearDuplicateSignals', { survivorId: a.id, absorbedId: c.id, reasoning: 'Third report' }, agent) as any;
    const before = getWorld(db);
    expect(() => tools.call('undoMerge', { id: first.id }, person)).toThrow('Undo the later merge first');
    expect(getWorld(db)).toEqual(before);
    tools.call('undoMerge', { id: later.id }, person); tools.call('undoMerge', { id: first.id }, person);
    expect(getWorld(db).signals).toHaveLength(3);
  });
  it('cannot resurrect a binned origin through merge undo', () => {
    const d1 = dump('First'), d2 = dump('Second'); const a = signal(d1.id, 'A', 'https://a.test/a'); const b = signal(d2.id, 'B', 'https://b.test/b');
    const merge = tools.call('mergeNearDuplicateSignals', { survivorId: a.id, absorbedId: b.id, reasoning: 'Same event' }, agent) as any;
    tools.call('deleteDump', { id: d2.id }, person); const before = getWorld(db);
    expect(() => tools.call('undoMerge', { id: merge.id }, person)).toThrow('Restore the binned dump');
    expect(getWorld(db)).toEqual(before);
  });
});

describe('bin restores compose across shared origins', () => {
  for (const order of [[0, 1], [1, 0]]) it(`restores shared signal immediately in order ${order.join(',')}, retaining later edits and links`, () => {
    const dumps = [dump('First origin'), dump('Second origin')];
    const s = signal(dumps[0].id, 'Shared', 'https://a.test/shared');
    tools.call('attachOrigin', { signalId: s.id, dumpId: dumps[1].id }, agent);
    const oldTheory = tools.call('writeTheory', { claim: 'Original evidence' }, person) as any;
    tools.call('linkEvidence', { signalId: s.id, theoryId: oldTheory.id, stance: 'supports' }, person);
    for (const d of dumps) tools.call('deleteDump', { id: d.id }, person);
    tools.call('restoreDump', { id: dumps[order[0]].id }, person);
    expect(getWorld(db).signals.map((r: any) => r.id)).toContain(s.id);
    expect(read(s.id).deleted_by_dump_id).toBeNull();
    expect(read(s.id).origins.map((o: any) => o.dump_id)).toEqual([dumps[order[0]].id]);
    expect(read(s.id).evidence).toContainEqual(expect.objectContaining({ theory: oldTheory.id }));
    tools.call('editSignal', { id: s.id, note: 'Written between restores' }, person);
    const newTheory = tools.call('writeTheory', { claim: 'New evidence' }, person) as any;
    tools.call('linkEvidence', { signalId: s.id, theoryId: newTheory.id, stance: 'undermines' }, person);
    tools.call('restoreDump', { id: dumps[order[1]].id }, person);
    expect(read(s.id).note).toBe('Written between restores');
    expect(read(s.id).origins.map((o: any) => o.dump_id).sort()).toEqual(dumps.map(d => d.id).sort());
    expect(read(s.id).evidence.map((e: any) => e.theory).sort()).toEqual([oldTheory.id, newTheory.id].sort());
    tools.call('deleteDump', { id: dumps[0].id }, person); tools.call('restoreDump', { id: dumps[0].id }, person);
    expect(read(s.id).origins).toHaveLength(2); expect(read(s.id).note).toBe('Written between restores');
    expect(db.pragma('foreign_key_check')).toEqual([]);
  });
});

describe('manual retry selects unfinished failed work', () => {
  it('requeues every failed child and advances backoff without replaying finished parent/siblings', () => {
    const d = dump('Processed');
    db.prepare("UPDATE jobs SET status='done' WHERE json_extract(payload_json,'$.dumpId')=?").run(d.id);
    for (const [id, kind, status, error] of [['failed-evidence', 'link_evidence', 'failed', 'Provider error'], ['queued-evidence', 'link_evidence', 'queued', 'Retry backoff'], ['failed-tripwire', 'tripwire', 'failed', 'Provider error'], ['completed-tripwire', 'tripwire', 'done', null]]) {
      db.prepare('INSERT INTO jobs(id,kind,payload_json,status,attempts,run_after,error,created_at) VALUES(?,?,?,?,?,?,?,?)')
        .run(id, kind, JSON.stringify({ dumpId: d.id, signalId: id }), status, 3, '2099-01-01T00:00:00.000Z', error, new Date().toISOString());
    }
    const beforeCount = (db.prepare('SELECT COUNT(*) n FROM jobs').get() as any).n;
    tools.call('retryDump', { id: d.id }, person);
    expect((db.prepare('SELECT COUNT(*) n FROM jobs').get() as any).n).toBe(beforeCount);
    for (const id of ['failed-evidence', 'queued-evidence', 'failed-tripwire']) expect(db.prepare('SELECT status,attempts,error,run_after FROM jobs WHERE id=?').get(id)).toMatchObject({ status: 'queued', attempts: 0, error: null, run_after: expect.stringMatching(/^20(?!99)/) });
    expect((db.prepare("SELECT COUNT(*) n FROM jobs WHERE status='done'").get() as any).n).toBe(2);
  });
});

describe('cross-job draft relationship authority', () => {
  it('allows agent relationship organisation across runs while protecting prose, held, and person-edited drafts', () => {
    const d = dump('Observation'); const s = signal(d.id, 'Observed', 'https://a.test/observation');
    const draft = tools.call('createDraftTheory', { claim: 'Processing-created draft' }, agent) as any;
    const other = { kind: 'agent', job: 'link_evidence', runId: 'review-evidence' } as const;
    tools.call('linkEvidence', { signalId: s.id, theoryId: draft.id, stance: 'supports' }, other);
    const theme = tools.call('writeTheme', { name: 'An existing theme' }, person) as any;
    const held = tools.call('writeTheory', { claim: 'A held theory' }, person) as any;
    tools.call('linkTheoryTheme', { theoryId: draft.id, themeId: theme.id }, other);
    tools.call('linkRivals', { theoryId: draft.id, rivalId: held.id }, other);
    tools.call('linkFollows', { theoryId: draft.id, fromId: held.id }, other);
    expect(() => tools.call('editDraftTheory', { id: draft.id, body: 'Cross-run prose' }, other)).toThrow(AuthorityError);
    expect(() => tools.call('linkEvidence', { signalId: s.id, theoryId: held.id, stance: 'supports' }, other)).toThrow(AuthorityError);
    tools.call('editTheory', { id: draft.id, body: 'Person-edited prose' }, person);
    expect(() => tools.call('linkEvidence', { signalId: s.id, theoryId: draft.id, stance: 'undermines' }, other)).toThrow(AuthorityError);
    expect(() => tools.call('editDraftTheory', { id: draft.id, body: 'Overwriting person' }, agent)).toThrow(AuthorityError);
  });
});
it('distinguishes a permanently deleted origin from a restorable binned dump', () => {
  const d1 = dump('First'), d2 = dump('Second'); const a = signal(d1.id, 'A', 'https://a.test/a'); const b = signal(d2.id, 'B', 'https://b.test/b');
  const merge = tools.call('mergeNearDuplicateSignals', { survivorId: a.id, absorbedId: b.id, reasoning: 'Same event' }, agent) as any;
  tools.call('deleteDump', { id: d2.id }, person);
  db.prepare('UPDATE dumps SET purge_after=? WHERE id=?').run('2000-01-01T00:00:00.000Z', d2.id);
  // A surviving shared signal keeps its merge history when the detached origin is purged.
  purgeBin(db); const before = getWorld(db);
  expect(() => tools.call('undoMerge', { id: merge.id }, person)).toThrow('permanently deleted dump');
  expect(getWorld(db)).toEqual(before);
});
it('inverts a legacy pre-merge-only snapshot while retaining later work', () => {
  const d = dump('Legacy reports'); const a = signal(d.id, 'A', 'https://a.test/legacy'); const b = signal(d.id, 'B', 'https://b.test/legacy');
  const merge = tools.call('mergeNearDuplicateSignals', { survivorId: a.id, absorbedId: b.id, reasoning: 'Same event' }, agent) as any;
  const saved = JSON.parse((db.prepare('SELECT snapshot_json FROM merges WHERE id=?').get(merge.id) as any).snapshot_json);
  delete saved.applied; db.prepare('UPDATE merges SET snapshot_json=? WHERE id=?').run(JSON.stringify(saved), merge.id);
  tools.call('editSignal', { id: a.id, note: 'Preserved legacy edit' }, person);
  tools.call('undoMerge', { id: merge.id }, person);
  expect(read(a.id).note).toBe('Preserved legacy edit');
  expect(read(a.id).sources).toHaveLength(1); expect(read(b.id).sources).toHaveLength(1);
});
it('second restore retains a third live origin and explicit relationship removals made between restores', () => {
  const d1 = dump('First'), d2 = dump('Second'), d3 = dump('Later repeat');
  const s = signal(d1.id, 'Shared', 'https://a.test/composed');
  tools.call('attachOrigin', { signalId: s.id, dumpId: d2.id }, agent);
  const theme = tools.call('writeTheme', { name: 'Removed between restores' }, person) as any;
  const theory = tools.call('writeTheory', { claim: 'Evidence removed between restores' }, person) as any;
  tools.call('fileSignal', { signalId: s.id, themeId: theme.id }, person);
  tools.call('linkEvidence', { signalId: s.id, theoryId: theory.id, stance: 'supports' }, person);
  tools.call('deleteDump', { id: d1.id }, person); tools.call('deleteDump', { id: d2.id }, person);
  tools.call('restoreDump', { id: d1.id }, person);
  tools.call('attachOrigin', { signalId: s.id, dumpId: d3.id }, agent);
  tools.call('unfileSignal', { signalId: s.id, themeId: theme.id }, person);
  tools.call('unlinkEvidence', { signalId: s.id, theoryId: theory.id }, person);
  tools.call('restoreDump', { id: d2.id }, person);
  expect(read(s.id).origins.map((o: any) => o.dump_id).sort()).toEqual([d1.id, d2.id, d3.id].sort());
  expect(read(s.id).themes).toEqual([]); expect(read(s.id).evidence).toEqual([]);
});
it('retry of already completed work makes no new job and does not replay a failed chat run', () => {
  const d = dump('Question?'); db.prepare("UPDATE jobs SET status='done' WHERE json_extract(payload_json,'$.dumpId')=?").run(d.id);
  db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,error,started_at) VALUES('failed-chat','chat','fake','fake','v1','failed','Stream interrupted',?)").run(new Date().toISOString());
  const before = db.prepare('SELECT * FROM jobs').all();
  expect(tools.call('retryDump', { id: d.id }, person)).toMatchObject({ status: 'done' });
  expect(db.prepare('SELECT * FROM jobs').all()).toEqual(before);
  expect(db.prepare("SELECT status FROM agent_runs WHERE id='failed-chat'").get()).toEqual({ status: 'failed' });
});

describe('preservation after person decisions and cross-run evidence writes', () => {
  const evidenceAgent = {kind:'agent',job:'link_evidence',runId:'review-evidence'} as const;
  const edge = (theoryId:string,signalId:string) => db.prepare('SELECT * FROM evidence WHERE theory_id=? AND signal_id=?').get(theoryId,signalId) as any;
  const fixture = () => {
    const d=dump('Evidence fixture');const s=signal(d.id,'A finding','https://a.test/protected');
    const other=signal(d.id,'Unrelated finding','https://b.test/distinct');
    const draft=tools.call('createDraftTheory',{claim:'Agent-owned draft'},agent) as any;
    return {s,other,draft};
  };
  for(const discarded of ['survivor','absorbed']) it(`refuses undo after discarding the ${discarded} without any mutation`, () => {
    const d=dump('Merged finding');const a=signal(d.id,'A','https://a.test/discarded');const b=signal(d.id,'B','https://b.test/discarded');
    const merge=tools.call('mergeNearDuplicateSignals',{survivorId:a.id,absorbedId:b.id,reasoning:'One finding'},agent) as any;
    tools.call('discardSignal',{id:discarded==='survivor'?a.id:b.id},person);
    const tables=['signals','tombstones','signal_sources','signal_origins','signal_themes','evidence','mentions','merges','events'];
    const before=tables.map(table=>db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all());
    expect(()=>tools.call('undoMerge',{id:merge.id},person)).toThrow('discarded');
    expect(tables.map(table=>db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all())).toEqual(before);
  });
  it('protects a person-created pair while allowing a genuinely new cross-run pair', () => {
    const {s,other,draft}=fixture();
    tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports',note:'Person decision'},person);
    const before=edge(draft.id,s.id);
    expect(()=>tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'undermines',note:'Agent overwrite'},evidenceAgent)).toThrow(AuthorityError);
    expect(edge(draft.id,s.id)).toEqual(before);
    tools.call('linkEvidence',{theoryId:draft.id,signalId:other.id,stance:'supports',note:'Distinct pair'},evidenceAgent);
    expect(edge(draft.id,other.id)).toMatchObject({stance:'supports',run_id:evidenceAgent.runId});
  });
  it('protects a person-modified pair even from its original agent; exact replay is a no-op', () => {
    const {s,draft}=fixture();
    tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports',note:'Agent initial'},agent);
    tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports',note:'Person revision'},person);
    const before=edge(draft.id,s.id);const events=(db.prepare('SELECT COUNT(*) n FROM events').get() as any).n;
    for(const actor of [agent,evidenceAgent]) expect(()=>tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'undermines',note:'Overwrite'},actor)).toThrow(AuthorityError);
    tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports',note:'Person revision'},evidenceAgent);
    expect(edge(draft.id,s.id)).toEqual(before);expect((db.prepare('SELECT COUNT(*) n FROM events').get() as any).n).toBe(events);
  });
  it('remembers a person unlink without blocking an unrelated new edge', () => {
    const {s,other,draft}=fixture();tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports'},agent);
    tools.call('unlinkEvidence',{theoryId:draft.id,signalId:s.id},person);
    for(const actor of [agent,evidenceAgent]) expect(()=>tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports'},actor)).toThrow(AuthorityError);
    tools.call('linkEvidence',{theoryId:draft.id,signalId:other.id,stance:'supports'},evidenceAgent);
    expect(edge(draft.id,s.id)).toBeUndefined();expect(edge(draft.id,other.id)).toBeDefined();
  });
  it('protects person-accepted evidence, including after the person undoes that decision', () => {
    const {s,draft}=fixture();
    const suggestion=tools.call('proposeEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports',note:'Proposed',reasoning:'Relevant'},agent) as any;
    tools.call('decideSuggestion',{id:suggestion.id,decision:'accepted'},person);
    expect(()=>tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'undermines'},evidenceAgent)).toThrow(AuthorityError);
    tools.call('decideSuggestion',{id:suggestion.id,decision:'undo'},person);expect(edge(draft.id,s.id)).toBeUndefined();
    expect(()=>tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports',note:'Proposed'},evidenceAgent)).toThrow(AuthorityError);
  });
  it('keeps an earlier successful run edge after a rejected overwrite and failed-run cleanup', () => {
    const {s,other,draft}=fixture();tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports',note:'Earlier run link'},agent);
    const before=edge(draft.id,s.id);db.prepare("UPDATE agent_runs SET status='done' WHERE id=?").run(agent.runId);
    expect(()=>tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'undermines',note:'New run changed it'},evidenceAgent)).toThrow(AuthorityError);
    tools.call('linkEvidence',{theoryId:draft.id,signalId:other.id,stance:'undermines',note:'New distinct edge'},evidenceAgent);
    db.prepare("UPDATE agent_runs SET status='failed' WHERE id=?").run(evidenceAgent.runId);clearRun(db,evidenceAgent.runId);
    expect(edge(draft.id,s.id)).toEqual(before);expect(edge(draft.id,other.id)).toBeUndefined();
    expect(db.prepare('SELECT status FROM agent_runs WHERE id=?').get(evidenceAgent.runId)).toEqual({status:'cleared'});
    expect(db.pragma('foreign_key_check')).toEqual([]);
  });
  it('does not reassign audit/run ownership for an exact cross-run replay', () => {
    const {s,draft}=fixture();tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports',note:'Original'},agent);
    const before=edge(draft.id,s.id);const events=(db.prepare('SELECT COUNT(*) n FROM events').get() as any).n;
    tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports',note:'Original'},evidenceAgent);
    expect(edge(draft.id,s.id)).toEqual(before);expect((db.prepare('SELECT COUNT(*) n FROM events').get() as any).n).toBe(events);
    db.prepare("UPDATE agent_runs SET status='failed' WHERE id=?").run(evidenceAgent.runId);clearRun(db,evidenceAgent.runId);
    expect(edge(draft.id,s.id)).toEqual(before);
  });
  it('retains same-run edits and clears only that run new evidence on failure', () => {
    const {s,draft}=fixture();tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports'},agent);
    tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'undermines',note:'Same attempt correction'},agent);
    expect(edge(draft.id,s.id)).toMatchObject({stance:'undermines',run_id:agent.runId});
    db.prepare("UPDATE agent_runs SET status='failed' WHERE id=?").run(agent.runId);clearRun(db,agent.runId);
    expect(edge(draft.id,s.id)).toBeUndefined();expect(db.pragma('foreign_key_check')).toEqual([]);
  });
  it('prevents an agent from unlinking another run edge or a person decision', () => {
    const {s,other,draft}=fixture();tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports'},evidenceAgent);
    tools.call('linkEvidence',{theoryId:draft.id,signalId:other.id,stance:'supports'},person);
    expect(()=>tools.call('unlinkEvidence',{theoryId:draft.id,signalId:s.id},agent)).toThrow(AuthorityError);
    expect(()=>tools.call('unlinkEvidence',{theoryId:draft.id,signalId:other.id},agent)).toThrow(AuthorityError);
    expect(edge(draft.id,s.id)).toBeDefined();expect(edge(draft.id,other.id)).toBeDefined();
  });
});

it('conservatively protects a legacy person unlink whose event omitted pair identity', () => {
  const d=dump('Legacy unlink');const s=signal(d.id,'Protected legacy observation','https://a.test/legacy-unlink');
  const draft=tools.call('createDraftTheory',{claim:'Legacy evidence draft'},agent) as any;
  tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports'},agent);
  tools.call('unlinkEvidence',{theoryId:draft.id,signalId:s.id},person);
  const event=db.prepare("SELECT id,before_json FROM events WHERE tool='unlinkEvidence' ORDER BY rowid DESC LIMIT 1").get() as any;
  const legacy=JSON.parse(event.before_json);delete legacy.evidenceDecision;
  db.prepare('UPDATE events SET before_json=? WHERE id=?').run(JSON.stringify(legacy),event.id);
  const before=db.prepare('SELECT * FROM evidence').all();
  expect(()=>tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports'},agent)).toThrow(AuthorityError);
  expect(db.prepare('SELECT * FROM evidence').all()).toEqual(before);
});
it('allows same-run unlink but keeps cross-run unlink gated even when that run added the edge', () => {
  const d=dump('Unlink ownership');const s=signal(d.id,'Observation','https://a.test/unlink-owned');
  const draft=tools.call('createDraftTheory',{claim:'Run-owned evidence'},agent) as any;
  tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'supports'},agent);
  tools.call('unlinkEvidence',{theoryId:draft.id,signalId:s.id},agent);
  expect(db.prepare('SELECT * FROM evidence').all()).toEqual([]);
  const other={kind:'agent',job:'link_evidence',runId:'review-evidence'} as const;
  tools.call('linkEvidence',{theoryId:draft.id,signalId:s.id,stance:'undermines'},other);
  const before=db.prepare('SELECT * FROM evidence').all();
  expect(()=>tools.call('unlinkEvidence',{theoryId:draft.id,signalId:s.id},other)).toThrow(AuthorityError);
  expect(db.prepare('SELECT * FROM evidence').all()).toEqual(before);
});
