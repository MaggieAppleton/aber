import { outputId, scriptedModel, toolOutputs, type ScriptStep, type StepFactory } from './scripted-model.js';

type Item = Record<string, any>;
const calls = (toolName: string, input: unknown): ScriptStep => ({ calls: [{ toolName, input }] });

/** Explicit synthetic fixtures, never used as live inference or quality evidence. */
export const SYNTHETIC_D1 = {
  text: 'Fixture D1: 3 links and a ramble about small models. Lab cuts API prices again for its small model tier. Open-weight model matches last year’s frontier on coding. Data-centre power contracts are booked years ahead.',
  gists: ['Lab cuts API prices again for its small model tier', 'Open-weight model matches last year’s frontier on coding', 'Data-centre power contracts are booked years ahead'],
  theme: 'Cost of intelligence',
};

function themeFor(gist: string, themes: Item[]): Item | undefined {
  const text = gist.toLowerCase();
  const name = /memory|recall|privacy|context across/.test(text) ? 'Agent memory'
    : /review|pull request|\bprs\b|diffs/.test(text) ? 'Code review after agents'
    : /funding|capital|revenue/.test(text) ? 'AI funding cycle'
    : /household|personal|budgeting|audience of one/.test(text) ? 'Personal software'
    : /canvas|interface/.test(text) ? 'Novel agent interfaces'
    : /oauth|identit/.test(text) ? 'Agent identity' : 'Cost of intelligence';
  return themes.find(theme => theme.name === name) ?? themes[0];
}

export function fakeProcessModel(dump: Item, themes: Item[], candidates: Item[] = []) {
  const text: string = [dump.text, ...(dump.transcripts ?? []).map((item: Item) => item.text)].filter(Boolean).join('\n');
  const d1 = /(?:fixture d1|3 links and a ramble about small models)/i.test(text);
  const attachments = (dump.attachments ?? []).filter((item: Item) => item.kind === 'link');
  const gists = d1 ? SYNTHETIC_D1.gists : text.split(/\n+|(?<=[.!])\s+/).map(line => line.replace(/^[-*]\s*/, '').trim()).filter(line => line.length > 8 && !line.endsWith('?')).slice(0, 6);
  if (!gists.length && !text.trim()) for (const attachment of attachments.slice(0, 6)) gists.push(attachment.title || `Saved report from ${new URL(attachment.url).hostname}`);
  const steps: (ScriptStep | StepFactory)[] = [];
  gists.forEach((gist, index) => {
    const attachment = attachments[index];
    const theme = d1 ? themes.find(item => item.name === SYNTHETIC_D1.theme) ?? themes[0] : themeFor(gist, themes);
    steps.push(calls('createSignal', { dumpId: dump.id, gist: gist.replace(/\.$/, ''), note: '', sources: attachment ? [{ url: attachment.url, ...(typeof attachment.title === 'string' ? { title: attachment.title } : {}) }] : [{ ownObservation: true }] }));
    if (theme) steps.push(options => {
      const outputs = toolOutputs(options, 'createSignal');
      const output = outputs[outputs.length - 1];
      if (!output || typeof output !== 'object' || !('id' in output)) return calls('getDump', { id: dump.id });
      return calls('fileSignal', { signalId: outputId(output), themeId: theme.id });
    });
    const sameFinding = candidates.find(candidate => normalWords(candidate.gist) === normalWords(gist));
    if (sameFinding) steps.push(options => {
      const output = toolOutputs(options, 'createSignal').at(-1);
      if (!output || (typeof output === 'object' && 'error' in output) || outputId(output) === sameFinding.id) return calls('recordMention', { kind: 'signal', id: sameFinding.id, dumpId: dump.id });
      return calls('mergeNearDuplicateSignals', { survivorId: sameFinding.id, absorbedId: outputId(output), dumpId: dump.id, reasoning: 'Synthetic planted duplicate of the same finding.' });
    });
  });
  if (/fixture:\s*all draft kinds/i.test(text)) {
    steps.push(calls('createDraftTheme', { dumpId: dump.id, name: 'Research workbenches' }));
    steps.push(options => calls('createDraftTheory', { dumpId: dump.id, claim: 'Personal research workbenches become commonplace', body: 'Synthetic three-kind draft fixture.', themes: [outputId(toolOutputs(options, 'createDraftTheme').at(-1))], horizon: 2028 }));
    steps.push(options => calls('createDraftPrototype', { dumpId: dump.id, name: 'Personal research workbench', body: 'A small prototype to test the draft theory.', theories: [outputId(toolOutputs(options, 'createDraftTheory').at(-1))] }));
  } else if (/what if|draft|local models absorb|personal software/i.test(text) && !text.trim().endsWith('?')) {
    const theme = themeFor(text, themes);
    steps.push(calls('createDraftTheory', { dumpId: dump.id, claim: /review/i.test(text) ? 'Review shifts from diffs to intent' : 'Local models absorb most everyday agent work', body: 'Synthetic draft from the captured observations. This claim needs testing.', themes: theme ? [theme.id] : [], horizon: 2028 }));
  }
  steps.push(options => {
    const merges = toolOutputs(options, 'mergeNearDuplicateSignals').filter((item): item is Item => !!item && typeof item === 'object' && 'survivorId' in item);
    const signals = toolOutputs(options, 'fileSignal').filter((item): item is Item => !!item && typeof item === 'object' && 'id' in item).map(signal => {
      const merged = merges.find(merge => merge.absorbedId === signal.id);
      if (!merged) return signal;
      const survivor = candidates.find(candidate => candidate.id === merged.survivorId);
      return { ...signal, id: merged.survivorId, gist: survivor?.gist ?? signal.gist };
    });
    const unique = [...new Map(signals.map(signal => [signal.id, signal])).values()];
    const parts: unknown[] = [{ type: 'text', text: gists.length ? `Filed ${unique.length} observation${unique.length === 1 ? '' : 's'}.` : 'I can explore that with you. Open a theory or theme to bring its evidence into the conversation.' }];
    for (const theme of themes) {
      const filed = unique.filter(signal => signal.themes?.includes(theme.id));
      if (filed.length) parts.push({ type: 'data-filed', data: { themeId: theme.id, themeName: theme.name, count: filed.length, signals: filed.map(({ id, gist }) => ({ id, gist })) } });
    }
    for (const [name, kind] of [['createDraftTheme', 'theme'], ['createDraftTheory', 'theory'], ['createDraftPrototype', 'prototype']]) {
      for (const draft of toolOutputs(options, name)) if (draft && typeof draft === 'object' && 'id' in draft) parts.push({ type: 'data-draft', data: { ...draft, kind } });
    }
    return calls('reply', { dumpId: dump.id, parts });
  });
  steps.push({ text: 'Synthetic processing fixture completed.' });
  return scriptedModel(steps);
}

export function normalWords(text: string): string { return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim(); }

export function fakeEvidenceModel(signal: Item, theories: Item[]) {
  const candidates = theories.filter(theory => relevant(signal, theory));
  const undermines = /withdrawn|privacy complaints|failed|cannot recall|expensive|costs? rise/i.test(signal.gist);
  return scriptedModel(candidates.slice(0, 3).map(theory => {
    const createdBy = theory.createdBy ?? theory.created_by ?? '';
    const updatedBy = theory.updatedBy ?? theory.updated_by ?? createdBy;
    const direct = theory.editableDraftRelationships ?? (theory.status === 'draft' && createdBy.startsWith('agent:') && updatedBy.startsWith('agent:'));
    return calls(direct ? 'linkEvidence' : 'proposeEvidence', { theoryId: theory.id, signalId: signal.id, stance: undermines ? 'undermines' : 'supports', note: `Synthetic labelled pair: ${signal.gist}`, reasoning: `The observed finding ${undermines ? 'cuts against' : 'supports'} this claim.` });
  }).concat([{ text: 'Synthetic evidence fixture completed.' }]));
}

function relevant(signal: Item, theory: Item): boolean {
  const text = `${signal.gist} ${signal.note ?? ''}`.toLowerCase();
  const claim = theory.claim.toLowerCase();
  return (/memory|recall|context|privacy/.test(text) && /memory|context|sessions/.test(claim))
    || (/price|tokens|small model|open-weight|local model|training.*cost/.test(text) && /tokens|intelligence|local models/.test(claim))
    || (/review|diffs|pull request/.test(text) && /review/.test(claim))
    || (/household|personal|budgeting/.test(text) && /audience of one|personal/.test(claim))
    || (/funding|capital/.test(text) && /funding/.test(claim));
}

export function fakeTripwireModel(signal: Item, theories: Item[]) {
  const hits = theories.filter(theory => relevant(signal, theory) && /withdrawn|privacy complaints|failed|cannot recall|memory reset|forced reset/i.test(signal.gist));
  return scriptedModel(hits.map(theory => calls('proposeChallenge', { theoryId: theory.id, signalId: signal.id, tripwireVersion: theory.tripwireVersion ?? theory.tripwire_version, why: `Synthetic planted hit: ${signal.gist}`, reasoning: 'This labelled observation meets the watched condition.' })).concat([{ text: 'Synthetic tripwire fixture completed.' }]));
}
