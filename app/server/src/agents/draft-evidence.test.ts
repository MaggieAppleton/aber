import { expect, it } from 'vitest';
import { createDatabase } from '../db/index.js';
import { seed } from '../seed.js';
import { createTools } from '../tools/index.js';
import { linkEvidence } from './jobs/link-evidence.js';
import { modelProjection } from './projection.js';
import { compactTheory } from './jobs/context.js';

it('preserves conservative relationship flags through repeated model projection', () => {
  const theory = { id: 'draft', claim: 'A testable claim', status: 'draft', created_by: 'agent:process_dump:old', updated_by: 'agent:process_dump:old', evidence: [{ id: 'e', signal_id: 's', theory_id: 'draft', stance: 'supports', created_by: 'person:maggie', updated_by: 'person:maggie' }] };
  const projection = modelProjection(modelProjection(theory)) as Record<string, any>;
  expect(projection.editableDraftRelationships).toBe(true); expect(projection.evidence[0].protectedByPerson).toBe(true);
  expect(compactTheory({ ...theory, updated_by: 'person:maggie' }).editableDraftRelationships).toBe(false);
  expect(compactTheory({ ...theory, status: 'held' }).editableDraftRelationships).toBe(false);
});
it('fake evidence links untouched drafts across runs and proposes to held or person-edited theories', async () => {
  process.env.AGENT_MODE = 'fake'; const db = createDatabase(); seed(db); const tools = createTools(db);
  const person = { kind: 'person' as const, id: 'maggie' };
  try {
    db.prepare("INSERT INTO agent_runs(id,job,provider,model,prompt_version,status,started_at) VALUES('setup-evidence','process_dump','fake','fixture','v1','done',?)").run(new Date().toISOString());
    const dump = tools.call('captureDump', { text: 'Synthetic local model findings.' }, person);
    const actor = { kind: 'agent' as const, job: 'process_dump', runId: 'setup-evidence' };
    const first = tools.call('createSignal', { dumpId: dump.id, gist: 'Open-weight local models cut small model inference prices.' }, actor);
    const result = await linkEvidence(db, tools, first.id);
    expect(JSON.stringify(result?.trace)).not.toContain('AuthorityError');
    expect(db.prepare("SELECT stance FROM evidence WHERE theory_id='d1' AND signal_id=?").get(first.id)).toEqual({ stance: 'supports' });
    expect(tools.call('getTheory', { id: 't1' }, person).suggestions.some((suggestion: any) => suggestion.payload.signal_id === first.id)).toBe(true);
    tools.call('editTheory', { id: 'd1', body: 'Maggie rewrote this draft.' }, person);
    const second = tools.call('createSignal', { dumpId: dump.id, gist: 'Local small models lower inference prices again.' }, actor);
    await linkEvidence(db, tools, second.id);
    expect(db.prepare("SELECT 1 FROM evidence WHERE theory_id='d1' AND signal_id=?").get(second.id)).toBeUndefined();
    expect(tools.call('getTheory', { id: 'd1' }, person).suggestions.some((suggestion: any) => suggestion.payload.signal_id === second.id)).toBe(true);
  } finally { db.close(); }
});
