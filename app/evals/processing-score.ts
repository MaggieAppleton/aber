import { normaliseUrl } from '../server/src/tools/core.js';
import type { ProcessingFixture } from './fixtures/processing-v2.js';
export interface ObservedSignal {
  id: string; gist: string; note: string; themes: string[];
  sources: { url?: string | null; ownObservation: boolean }[]; origins: string[]; fetched: { text: string }[];
}
export interface ObservedDraft { id: string; kind: string; text: string; draft: boolean; createdBy: string; themes: string[]; theories: string[]; horizon?: number | null }
export interface ProcessingSnapshot {
  signals: ObservedSignal[]; drafts: ObservedDraft[];
  revisions: { targetId: string; status: string; text: string }[];
  merges: { survivorId: string; absorbedId: string }[];
  themeNames: Record<string, string>; heldBefore: string; heldAfter: string;
  providerInput: string; dumpId: string; noAuthorityErrors: boolean; setupSignalId?: string;
}
const matches = (text: string, clauses: string[]) => clauses.every(clause => new RegExp(clause, 'i').test(text));
const urlMatches = (signal: ObservedSignal, url: string) => signal.sources.some(source => source.url && normaliseUrl(source.url) === normaliseUrl(url));

/** Fixed, handwritten clauses score observable state. No extra model calls or post-run label changes. */
export function scoreProcessing(fixture: ProcessingFixture, state: ProcessingSnapshot): Record<string, boolean> {
  const expected = fixture.expected;
  // A distinct output must satisfy each expected observation. One broad gist cannot count twice.
  const assign = (index: number, used: Set<string>): ObservedSignal[] | null => {
    if (index === expected.observations.length) return [];
    for (const signal of state.signals) {
      if (used.has(signal.id) || !matches(signal.gist, expected.observations[index].clauses)) continue;
      const rest = assign(index + 1, new Set([...used, signal.id]));
      if (rest) return [signal, ...rest];
    }
    return null;
  };
  const assigned = assign(0, new Set());
  const hasThemes = (actual: string[], required: string[]) => required.every(theme => actual.some(id => id === theme || state.themeNames[id] === theme));
  const checks: Record<string, boolean> = {
    signalCount: state.signals.length >= expected.count[0] && state.signals.length <= expected.count[1],
    observations: !!assigned,
    filing: !!assigned && assigned.every((signal, i) => hasThemes(signal.themes, expected.observations[i].themes)),
    sources: !!assigned && assigned.every((signal, i) => {
      const item = expected.observations[i];
      return (item.urls ?? []).every(url => urlMatches(signal, url)) && (!item.ownObservation || signal.sources.some(source => source.ownObservation && !source.url));
    }),
    sourcePrecision: !!assigned && assigned.every((signal, i) => {
      const item = expected.observations[i];
      const allowed = new Set((item.urls ?? []).map(normaliseUrl));
      return signal.sources.every(source => source.url ? allowed.has(normaliseUrl(source.url)) : !!item.ownObservation && source.ownObservation);
    }),
    origins: state.signals.every(signal => signal.origins.includes(state.dumpId)),
    noInventedFindings: state.signals.every(signal => !(expected.forbiddenGists ?? []).some(pattern => new RegExp(pattern, 'i').test(signal.gist))),
    heldObjectsUnchanged: state.heldBefore === state.heldAfter,
    noAuthorityErrors: state.noAuthorityErrors,
  };
  if (fixture.article) {
    const article = fixture.article;
    checks.fullArticleInInput = state.providerInput.includes(article.text);
    checks.fullArticleStored = !!assigned && assigned.every(signal => signal.fetched.some(item => item.text === article.text));
  }
  if (expected.draft) {
    const draft = expected.draft;
    const theory = state.drafts.find(item => item.kind === 'theory' && matches([item.text, item.horizon].filter(value => value !== undefined && value !== null).join(' '), draft.theory));
    checks.draftCounts = state.drafts.filter(item => item.kind === 'theory').length === 1 && state.drafts.filter(item => item.kind === 'theme').length === (draft.theme ? 1 : 0) && state.drafts.filter(item => item.kind === 'prototype').length === (draft.prototype ? 1 : 0);
    checks.draftTheory = !!theory;
    checks.draftTheoryFiling = !!theory && hasThemes(theory.themes, draft.themes);
    checks.draftOwnership = state.drafts.length > 0 && state.drafts.every(item => item.draft && item.createdBy.startsWith('agent:'));
    if (draft.theme) checks.draftTheme = state.drafts.some(item => item.kind === 'theme' && item.text.toLowerCase() === draft.theme!.toLowerCase());
    if (draft.prototype) {
      const prototype = state.drafts.find(item => item.kind === 'prototype' && matches(item.text, draft.prototype!));
      checks.draftPrototype = !!prototype;
      checks.prototypeRelationship = !!prototype && !!theory && prototype.theories.includes(theory.id);
    }
  } else checks.noUnrequestedDrafts = state.drafts.length === 0;
  if (expected.revision) checks.revisionProposal = state.revisions.some(item => item.targetId === expected.revision!.theoryId && item.status === 'pending' && matches(item.text, expected.revision!.clauses));
  else checks.noUnrequestedRevisions = state.revisions.length === 0;
  if (expected.dedup) {
    const dedup = expected.dedup;
    const survivor = state.signals.find(signal => signal.id === state.setupSignalId);
    checks.mergeDecision = state.merges.length === dedup.merges && state.merges.every(merge => merge.survivorId === state.setupSignalId);
    checks.repeatAttached = !!survivor && survivor.origins.length >= 2 && survivor.origins.includes(state.dumpId) && urlMatches(survivor, dedup.repeatedSource);
    checks.independentSourceMerged = !!survivor && urlMatches(survivor, dedup.independentSource);
    checks.decoyKeptApart = !!survivor && !urlMatches(survivor, dedup.decoySource) && state.signals.some(signal => signal.id !== survivor.id && urlMatches(signal, dedup.decoySource));
  } else checks.noUnexpectedMerges = state.merges.length === 0;
  return checks;
}
