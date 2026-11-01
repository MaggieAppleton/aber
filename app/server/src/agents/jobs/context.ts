import type { AgentJob, ToolLayer } from '../types.js';
import { editableDraftRelationships, modelProjection } from '../projection.js';
export type Row = Record<string, any>;

export async function readTool<T = Row>(tools: ToolLayer, name: string, input: unknown, job: AgentJob): Promise<T> {
  return await tools.call(name, input, { kind: 'agent', job, runId: 'read-only-context' }) as T;
}

export function compactTheory(theory: Row): Row {
  return { id: theory.id, claim: theory.claim, body: theory.body, status: theory.status, createdBy: theory.createdBy ?? theory.created_by, editableDraftRelationships: editableDraftRelationships(theory), tripwire: theory.tripwire, tripwireVersion: theory.tripwireVersion ?? theory.tripwire_version, themes: theory.themes, evidence: modelProjection(theory.evidence), suggestions: modelProjection(theory.suggestions) };
}

export function compactSignal(signal: Row): Row {
  return { id: signal.id, gist: signal.gist, note: signal.note, sources: modelProjection(signal.sources), fetched: signal.fetched, themes: signal.themes, evidence: modelProjection(signal.evidence), origins: signal.origins?.map((origin: Row) => ({ dumpId: origin.dumpId ?? origin.dump_id })) };
}

export function signalCandidates(value: unknown): Row[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const record = value as Row;
    return record.signals ?? record.similar ?? record.results ?? [];
  }
  return [];
}
