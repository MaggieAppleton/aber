import type { UIMessage } from 'ai';

export const JEV_FIXTURE_VERSION = 'jev-e2e-v1';
export const jevFixtureProvenance = 'Handwritten synthetic jig-world regression examples. Development/held-out split fixed before live evaluation; no personal material and no model-generated labels.';
export interface JevFixture {
  id: string;
  split: 'dev' | 'held-out';
  category: string;
  workflow: 'evidence' | 'tripwire' | 'duplicate' | 'filing' | 'chat';
  text: string;
  prior?: string;
  watch?: { id: string; tripwire: string };
  chat?: {
    context: { kind: string; id?: string; label: string }[];
    history?: UIMessage[];
  };
  expected: {
    proposals?: string[];
    relationships?: string[];
    merge?: boolean;
    displays?: string[];
    signalCount?: [number, number];
    cofiled?: boolean;
    drafts?: ('theme' | 'theory' | 'prototype')[];
    mutationTools?: string[];
  };
}
export const jevFixtures: readonly JevFixture[] = [
  { id: 'j-dev-evidence-clear', split: 'dev', category: 'relationship', workflow: 'evidence', text: 'Northstar assistant restored all 47 project decisions saved 105 days earlier without receiving any old conversation text.', expected: { proposals: ['evidence:t3:supports'] } },
  { id: 'j-held-evidence-clear', split: 'held-out', category: 'relationship', workflow: 'evidence', text: 'In a 140-day independent audit, Juniper assistant lost every saved project decision after day 30 and required users to paste prior sessions again.', expected: { proposals: ['evidence:t3:undermines'] } },
  { id: 'j-dev-evidence-ambiguous', split: 'dev', category: 'ambiguous', workflow: 'evidence', text: 'A Northstar brochure says its assistant might one day remember work, but reports no test, deployment, or observed retention period.', expected: { proposals: [] } },
  { id: 'j-held-evidence-ambiguous', split: 'held-out', category: 'ambiguous', workflow: 'evidence', text: 'A Juniper roadmap lists long-term project context as a possible research goal; the authors explicitly say it has not been built or measured.', expected: { proposals: [] } },
  { id: 'j-dev-no-match', split: 'dev', category: 'no-match', workflow: 'evidence', text: 'The municipal pool changed its opening time from seven to eight on Saturdays.', expected: { proposals: [] } },
  { id: 'j-held-no-match', split: 'held-out', category: 'no-match', workflow: 'evidence', text: 'The local pottery club moved its annual exhibition to the town hall.', expected: { proposals: [] } },
  { id: 'j-dev-topic-decoy', split: 'dev', category: 'topic-decoy', workflow: 'evidence', text: 'Northstar redesigned the colour of the memory settings icon; no memory retention or behaviour changed.', expected: { proposals: [] } },
  { id: 'j-held-topic-decoy', split: 'held-out', category: 'topic-decoy', workflow: 'evidence', text: 'Juniper translated the assistant memory help page into Swedish; the announcement contains no evidence about recall duration or privacy changes.', expected: { proposals: [] } },
  { id: 'j-dev-tripwire-hit', split: 'dev', category: 'tripwire-hit', workflow: 'tripwire', text: 'Northstar, a major assistant provider, withdrew its memory feature from all users after verified privacy complaints on 2 November.', expected: { proposals: ['challenge:t3'] } },
  { id: 'j-held-tripwire-hit', split: 'held-out', category: 'tripwire-hit', workflow: 'tripwire', text: 'Major assistant Juniper permanently disabled saved memory across its service following an independent privacy investigation and user complaints.', expected: { proposals: ['challenge:t3'] } },
  { id: 'j-dev-tripwire-near', split: 'dev', category: 'tripwire-near-miss', workflow: 'tripwire', text: 'Northstar withdrew a privacy help article about memory; its major assistant memory feature remains available and unchanged.', expected: { proposals: [] } },
  { id: 'j-held-tripwire-near', split: 'held-out', category: 'tripwire-near-miss', workflow: 'tripwire', text: 'Juniper users petitioned for a memory shutdown over privacy concerns, but the major assistant provider declined and kept the feature running.', expected: { proposals: [] } },
  { id: 'j-dev-duplicate', split: 'dev', category: 'duplicate', workflow: 'duplicate', prior: 'Northstar Atlas trial restored 47 project decisions after 105 days on 2 November.', text: 'The 2 November Northstar Atlas trial restored 47 project decisions after a 105-day gap.', expected: { proposals: [], merge: true } },
  { id: 'j-held-duplicate', split: 'held-out', category: 'duplicate', workflow: 'duplicate', prior: 'Juniper Elm measured a 41 percent decrease in retrieval latency on 3 November.', text: 'In its 3 November Elm benchmark, Juniper reported retrieval latency falling by 41 percent.', expected: { proposals: [], merge: true } },
  { id: 'j-dev-nonduplicate', split: 'dev', category: 'nonduplicate', workflow: 'duplicate', prior: 'Northstar Atlas trial restored 47 project decisions after 105 days on 2 November.', text: 'Northstar Atlas lowered memory lookup latency by 47 percent in a separate speed trial on 3 November.', expected: { proposals: [], merge: false } },
  { id: 'j-held-nonduplicate', split: 'held-out', category: 'nonduplicate', workflow: 'duplicate', prior: 'Juniper Elm measured a 41 percent decrease in retrieval latency on 3 November.', text: 'Juniper Elm recovered saved project decisions from 141 days ago in a separate retention experiment on 4 November.', expected: { proposals: [], merge: false } },
  { id: 'j-dev-multi-theme', split: 'dev', category: 'multi-theme', workflow: 'filing', text: 'Northstar review agents restored decisions saved 105 days earlier, cutting human code review time from 110 to 45 minutes per change in a controlled trial.', expected: { proposals: [], relationships: ['filing:memory', 'filing:review'] } },
  { id: 'j-held-multi-theme', split: 'held-out', category: 'multi-theme', workflow: 'filing', text: 'Juniper gave each agent a separately revocable service identity for access to its persistent project memory store; the trial measured permission isolation and long-term recall together.', expected: { proposals: [], relationships: ['filing:identity', 'filing:memory'] } },
  { id: 'j-dev-chat', split: 'dev', category: 'chat-context', workflow: 'chat', text: 'Show me this theory and its evidence split.', expected: { proposals: [], displays: ['showTheory:t3', 'showEvidenceSplit:t3'] } },
  { id: 'j-held-chat', split: 'held-out', category: 'chat-topic-decoy', workflow: 'chat', text: 'The words memory and privacy are in my notes, but show the open theory and its current evidence, not a settings page.', expected: { proposals: [], displays: ['showTheory:t3', 'showEvidenceSplit:t3'] } },
  { id: 'j-dev-tripwire-simple', split: 'dev', category: 'tripwire-simple-hit', workflow: 'tripwire', watch: { id: 'jev-watch', tripwire: 'a major assistant withdraws its memory feature following privacy complaints' }, text: 'Major assistant Northstar withdrew its saved memory feature following verified privacy complaints on 2 November.', expected: { proposals: ['challenge:jev-watch'] } },
  { id: 'j-held-tripwire-simple-near', split: 'held-out', category: 'tripwire-simple-near-miss', workflow: 'tripwire', watch: { id: 'jev-watch', tripwire: 'a major assistant withdraws its memory feature following privacy complaints' }, text: 'Major assistant Juniper withdrew a help article following privacy complaints, but its saved memory feature remains available and unchanged.', expected: { proposals: [] } },
];
