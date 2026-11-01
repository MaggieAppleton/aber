import type { Actor, ObjectKind } from '../../../shared/src/index.js';
export class AuthorityError extends Error {
  readonly code = 'AUTHORITY_DENIED';
  constructor(message = 'Only a person may make this decision') { super(message); this.name = 'AuthorityError'; }
}
export function actorString(actor: Actor): string {
  return actor.kind === 'person' ? `person:${actor.id ?? actor.personId}` : `agent:${actor.job}:${actor.runId}`;
}
export function assertPerson(actor: Actor): void {
  if (actor.kind !== 'person') throw new AuthorityError();
}
export function assertMayWrite(actor: Actor, target: { kind: ObjectKind | string; id?: string; status?: string; draft?: number | boolean; createdBy?: string; created_by?: string; updatedBy?: string; updated_by?: string }, tool: string): void {
  if (actor.kind === 'person') return;
  const never = ['captureDump','deleteDump','restoreDump','previewDeleteDump','retryDump','unfileSignal','undoMerge','discardSignal','markSeen','writeTheme','writeTheory','acceptDraft','rephraseDraft','discardDraft','setConfidence','setHorizon','setTripwire','retireTheme','retireTheory','decideSuggestion'];
  if (never.includes(tool)) throw new AuthorityError(`${tool} is a person decision`);
  if (tool.startsWith('propose') || tool.startsWith('createDraft') || ['createSignal','attachOrigin','fileSignal','recordMention','mergeNearDuplicateSignals','reply'].includes(tool)) return;
  if (['theme','theory','prototype'].includes(target.kind)) {
    const createdBy = target.createdBy ?? target.created_by ?? '';
    const updatedBy = target.updatedBy ?? target.updated_by ?? createdBy;
    const isDraft = target.status === 'draft' || target.draft === 1 || target.draft === true;
    const untouchedAgentDraft = isDraft && createdBy.startsWith('agent:') && updatedBy.startsWith('agent:');
    // Relationship organisation spans processing and evidence jobs; prose keeps the stricter same-run rule.
    const draftRelation = target.kind === 'theory' && ['linkEvidence', 'linkTheoryTheme', 'linkRivals', 'linkFollows'].includes(tool);
    if (!untouchedAgentDraft || (!draftRelation && createdBy !== actorString(actor))) {
      throw new AuthorityError(`Agents may edit only untouched agent drafts (${tool})`);
    }
    return;
  }
  throw new AuthorityError(`Agents cannot call ${tool}`);
}
