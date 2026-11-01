import { describe, expect, it } from 'vitest';
import { processingFixtures } from './fixtures/processing-v2.js';
import { scoreProcessing, type ProcessingSnapshot } from './processing-score.js';
const fixture = (id: string) => processingFixtures.find(item => item.id === id)!;
const source = (url: string) => ({ url, ownObservation: false });
const social = (): ProcessingSnapshot => ({
  signals: [
    { id: 'a', gist: 'Cedar restored decisions in 36 of 40 tests after twelve weeks', note: '', themes: ['memory'], sources: [source('https://x.com/cedar_eval/status/101')], origins: ['dump'], fetched: [] },
    { id: 'b', gist: 'Harbour agents receive separate revocable service identities', note: '', themes: ['identity'], sources: [source('https://x.com/harbour_eval/status/102')], origins: ['dump'], fetched: [] },
  ], drafts: [], revisions: [], merges: [], themeNames: {}, heldBefore: 'unchanged', heldAfter: 'unchanged', providerInput: '', dumpId: 'dump', noAuthorityErrors: true,
});
const passes = (value: Record<string, boolean>) => Object.values(value).every(Boolean);

describe('handwritten processing rubric rejects plausible incomplete outputs', () => {
  it('accepts complete separately filed observations', () => expect(passes(scoreProcessing(fixture('p-social-commentary-v2'), social()))).toBe(true));
  it.each(['missing', 'wrong'])('rejects %s filing', mode => {
    const state = social(); state.signals[0].themes = mode === 'missing' ? [] : ['cost'];
    expect(scoreProcessing(fixture('p-social-commentary-v2'), state).filing).toBe(false);
  });
  it('rejects gist keywords with the measured finding omitted', () => {
    const state = social(); state.signals[0].gist = 'Cedar memory lasted twelve weeks';
    expect(scoreProcessing(fixture('p-social-commentary-v2'), state).observations).toBe(false);
  });
  it('does not let notes rescue an uninformative gist', () => {
    const state = social(); state.signals[0].note = state.signals[0].gist; state.signals[0].gist = 'An interesting trial';
    expect(scoreProcessing(fixture('p-social-commentary-v2'), state).observations).toBe(false);
  });
  it('requires a distinct signal for each expected finding', () => {
    const state = social(); state.signals[0].gist += '; ' + state.signals[1].gist; state.signals[1].gist = 'An unrelated observation';
    expect(scoreProcessing(fixture('p-social-commentary-v2'), state).observations).toBe(false);
  });
  it('rejects missing source, held mutations and authority failures independently', () => {
    const state = social(); state.signals[0].sources = []; state.heldAfter = 'person wording changed'; state.noAuthorityErrors = false;
    expect(scoreProcessing(fixture('p-social-commentary-v2'), state)).toMatchObject({ sources: false, heldObjectsUnchanged: false, noAuthorityErrors: false });
  });
  it('rejects unrelated citations even when the required source is present', () => {
    const state = social(); state.signals[0].sources.push(source('https://example.org/invented-citation'));
    expect(scoreProcessing(fixture('p-social-commentary-v2'), state).sourcePrecision).toBe(false);
  });
  it('requires the full article in provider input and every sourced signal', () => {
    const item = fixture('p-full-article-v2'); const state = social();
    state.signals = [
      { ...state.signals[0], gist: 'Harbour review rose from 45 to 110 minutes', themes: ['review'], sources: item.urls.map(source), fetched: [{ text: item.article!.text }] },
      { ...state.signals[1], gist: 'Vela signed a five-year electricity contract with a minimum annual payment of 18 million dollars', themes: ['cost', 'funding'], sources: item.urls.map(source), fetched: [{ text: item.article!.text }] },
    ];
    state.providerInput = item.article!.text;
    expect(passes(scoreProcessing(item, state))).toBe(true);
    state.signals[0].gist = state.signals[0].gist.replace('rose', 'fell');
    expect(scoreProcessing(item, state).observations).toBe(false);
    state.signals[0].gist = state.signals[0].gist.replace('fell', 'rose');
    state.providerInput = item.article!.title;
    expect(scoreProcessing(item, state).fullArticleInInput).toBe(false);
    state.signals[1].fetched = [];
    expect(scoreProcessing(item, state).fullArticleStored).toBe(false);
    state.signals[0].gist += '; review disappeared';
    expect(scoreProcessing(item, state).noInventedFindings).toBe(false);
  });
  it('requires new draft ownership, theme and prototype relationships', () => {
    const item = fixture('p-build-robotics-v2'); const state = social();
    state.themeNames = { robots: 'Robotics' };
    state.signals = [{ ...state.signals[0], gist: 'Alder picking robot stopped 17 times in a week on transparent packages and needed a human reset', themes: ['robots'], sources: [{ ownObservation: true }] }];
    state.drafts = [
      { id: 'robots', kind: 'theme', text: 'Robotics', draft: true, createdBy: 'agent:process_dump:run', themes: [], theories: [] },
      { id: 'theory', kind: 'theory', text: 'Warehouse picking robots need human recovery weekly in 2028', draft: true, createdBy: 'agent:process_dump:run', themes: ['robots'], theories: [] },
      { id: 'prototype', kind: 'prototype', text: 'Recovery rehearsal', draft: true, createdBy: 'agent:process_dump:run', themes: [], theories: ['theory'] },
    ];
    expect(passes(scoreProcessing(item, state))).toBe(true);
    state.drafts[1].text = 'Warehouse picking robots need human recovery weekly';
    state.drafts[1].horizon = 2028;
    expect(passes(scoreProcessing(item, state))).toBe(true);
    state.drafts[1].horizon = 2029;
    expect(scoreProcessing(item, state).draftTheory).toBe(false);
    state.drafts[1].horizon = 2028;
    state.drafts.push({ ...state.drafts[0], id: 'unrequested-theme', text: 'AI software' });
    expect(scoreProcessing(item, state).draftCounts).toBe(false);
    state.drafts.pop();
    state.drafts[1].draft = false;
    expect(scoreProcessing(item, state).draftOwnership).toBe(false);
    state.drafts[1].draft = true;
    state.drafts[2].theories = [];
    expect(scoreProcessing(item, state).prototypeRelationship).toBe(false);
    state.drafts[1].themes = [];
    expect(scoreProcessing(item, state).draftTheoryFiling).toBe(false);
    state.drafts[0].createdBy = 'person:maggie';
    expect(scoreProcessing(item, state).draftOwnership).toBe(false);
  });
  it('requires a pending revision, retained repeat and independent decoy', () => {
    const item = fixture('p-revise-dedup-v2'); const state = social(); const dedup = item.expected.dedup!;
    state.setupSignalId = 'original';
    state.signals = [
      { ...state.signals[0], id: 'original', gist: item.setup!.gist, sources: [source(dedup.repeatedSource), source(dedup.independentSource)], origins: ['setup', 'dump'] },
      { ...state.signals[0], id: 'decoy', gist: 'Cedar Atlas memory lookup latency improved by 45%', sources: [source(dedup.decoySource)] },
    ];
    state.merges = [{ survivorId: 'original', absorbedId: 'copy' }];
    state.revisions = [{ targetId: 't3', status: 'pending', text: 'Agents keep context while a project vault stays enabled with consent' }];
    expect(passes(scoreProcessing(item, state))).toBe(true);
    state.revisions = [];
    expect(scoreProcessing(item, state).revisionProposal).toBe(false);
    state.signals[0].sources.push(source(dedup.decoySource)); state.signals.pop();
    expect(scoreProcessing(item, state).decoyKeptApart).toBe(false);
    state.signals[0].origins = ['dump'];
    expect(scoreProcessing(item, state).repeatAttached).toBe(false);
  });
});
