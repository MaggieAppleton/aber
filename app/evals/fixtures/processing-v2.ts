export const PROCESSING_VERSION = 'processing-v2';
export const processingProvenance = 'Five additive synthetic processing dumps authored on 1 November 2026. All organisations, measurements and incidents are invented. The original 31 cases and labels remain unchanged. No personal material or real-world validation is claimed.';

/** Each clause is required; alternatives within a clause allow ordinary paraphrases.
 * These deliberately transparent lexical rubrics are not semantic model judges. */
export interface ExpectedObservation {
  key: string; clauses: string[]; themes: string[]; urls?: string[]; ownObservation?: boolean;
}
export interface ProcessingFixture {
  id: string; version: typeof PROCESSING_VERSION; text: string; urls: string[]; transcript?: string;
  article?: { url: string; title: string; text: string };
  setup?: { gist: string; url: string };
  expected: {
    count: [number, number]; observations: ExpectedObservation[]; forbiddenGists?: string[];
    draft?: { theme?: string; theory: string[]; themes: string[]; prototype?: string[] };
    revision?: { theoryId: string; clauses: string[] };
    dedup?: { merges: number; repeatedSource: string; independentSource: string; decoySource: string };
  };
}

const voiceTranscript = `Okay, I want to untangle three things from the visits this week before I forget which happened where. This is a synthetic field note, and I am only describing the small groups I actually watched. Please do not turn my guesses about the future into events that have already happened. There is an observation about review, another about memory, and a third about a little household tool. They may connect eventually, but I do not think one experiment proves all of them.

At Harbour Tools, six maintainers tried a local coding assistant for two weeks. Their daily log showed median code-writing time falling from ninety minutes to thirty minutes, while median human review time rose from forty minutes to a hundred minutes. That is the first concrete observation. The team kept the same six maintainers and the same category of small maintenance tasks in both weeks. Nobody measured the quality of the eventual product. I nearly said productivity doubled, but that would be going beyond the log. The measured finding is the shift in the time spent writing and reviewing. File that under code review, and perhaps cost if useful, but do not create separate signals for each number.

I keep picturing a timeline of decisions instead of another endless assistant conversation. What if review tools become local decision timelines rather than chat transcripts? That is a speculative theory I would like you to draft, under code review and novel agent interfaces. It is a proposal about what could happen by 2028, not a fourth observed event. I do not want to revise the wording of any held theory just because I have had that thought. I might test it later, once I know what the reviewers need to see when they reopen a project after a few days away.

The second visit was Cedar Workshop. Eight designers used a project assistant for eleven weeks. In the final week, all eight could retrieve a design decision that had been saved in the first week, without pasting the old chat. That is a much narrower result than saying the assistant remembered everything. They only tested one saved decision per designer. They did not test private documents, and they did not switch models during the trial. Please keep the eleven-week duration and the eight-person scope in the gist. This belongs under agent memory. It is a different trial from any earlier memory example, and should not be merged with one just because both mention a month.

The last thing was at Rowan House. Four adults living together used a shared pantry app they had built for that household, and kept using it for sixteen weeks. They told me every screen was designed around that home's cupboards and shopping rota. It had no customers outside the house and no plan to sell it. Please file one observation under personal software. I am not claiming this is evidence that most software has only one user; four people shared this particular tool. It is still useful as a concrete example of software shaped around a very small audience.

I have wandered around the same points a few times because I am walking home and trying to remember the numbers. The three events are Harbour's review log, Cedar's saved-decision trial, and Rowan's pantry tool. The decision timeline is just an idea to draft. I do not have a new source link for any of them; these are observations from the visits. Leave the uncertainties in the notes instead of quietly filling them in. A short reply with the three filings and the draft is enough.`;

export const processingFixtures: ProcessingFixture[] = [
  {
    id: 'p-social-commentary-v2', version: PROCESSING_VERSION,
    text: `Two invented posts to save. https://x.com/cedar_eval/status/101 reports that Cedar Notes restored saved project decisions in 36 of 40 tests after a twelve-week pause. https://x.com/harbour_eval/status/102 reports that Harbour's deployment agents now receive separate, revocable service identities instead of borrowing an employee login. My commentary: durable context and accountable identities might eventually make agents feel like colleagues. That last sentence is speculation, not a third finding. Please file the two concrete observations; do not draft a theory from this alone.`,
    urls: ['https://x.com/cedar_eval/status/101', 'https://x.com/harbour_eval/status/102'],
    expected: { count: [2, 2], observations: [
      { key: 'memory-trial', clauses: ['Cedar', '36|thirty.six', '40|forty', '12|twelve', 'week', 'restor|recall|retriev'], themes: ['memory'], urls: ['https://x.com/cedar_eval/status/101'] },
      { key: 'service-identities', clauses: ['Harbour', 'revoc', 'identit|credential', 'agent', 'separate|own|individual|distinct'], themes: ['identity'], urls: ['https://x.com/harbour_eval/status/102'] },
    ], forbiddenGists: ['feel like colleagues'] },
  },
  {
    id: 'p-full-article-v2', version: PROCESSING_VERSION,
    text: `Save this invented article. The teaser says "Agents remove the review bottleneck" but read the full report before filing: https://example.org/eval-v2/harbour-capacity. Please retain its actual measured qualifications, not the teaser.`,
    urls: ['https://example.org/eval-v2/harbour-capacity'],
    article: { url: 'https://example.org/eval-v2/harbour-capacity', title: 'Harbour capacity report: what the teaser omitted', text: `Harbour's October capacity study followed twelve engineering teams for six weeks. Agent-assisted code-writing time fell by 55%, but median human review time rose from 45 to 110 minutes per change. The reviewers handled more output and checked unfamiliar dependencies. The study does not say review disappeared. Its measured review result is 110 minutes per change, compared with 45 before adoption.

A separate infrastructure appendix reports that Vela Compute signed a five-year electricity contract with a minimum annual payment of 18 million dollars, payable even if its agent revenue falls. Vela's short-term inference prices fell, but that did not remove its long-term financial commitment. This is an observation about both intelligence cost and funding exposure, rather than a claim that all model labs will fail.

The study is synthetic evaluation material. Its sample is limited, and no claim about the whole software industry follows from twelve teams. The review figures and electricity obligation come from separate records and should remain distinct observations. The newsletter teaser was written before the study was complete and overstates the review result.` },
    expected: { count: [2, 2], observations: [
      { key: 'review-time', clauses: ['Harbour|team', '45|forty.five', '110|hundred.and.ten', 'review', 'minute', 'rose|increas|grew|climb'], themes: ['review'], urls: ['https://example.org/eval-v2/harbour-capacity'] },
      { key: 'power-obligation', clauses: ['Vela', 'five.year|5.year', '18|eighteen', 'million', 'power|electric', 'annual|yearly|per year', 'minimum|at least|take.or.pay|even if'], themes: ['cost', 'funding'], urls: ['https://example.org/eval-v2/harbour-capacity'] },
    ], forbiddenGists: ['review (?:disappeared|was eliminated|is no longer needed)', 'agents remove the review bottleneck'] },
  },
  {
    id: 'p-voice-ramble-v2', version: PROCESSING_VERSION, text: '', urls: [], transcript: voiceTranscript,
    expected: { count: [3, 3], observations: [
      { key: 'review-log', clauses: ['Harbour', '90|ninety', '30|thirty', '40|forty', '100|hundred', 'review'], themes: ['review'], ownObservation: true },
      { key: 'saved-decision', clauses: ['Cedar', 'eight|8', 'eleven|11', 'week', 'decision'], themes: ['memory'], ownObservation: true },
      { key: 'pantry-tool', clauses: ['Rowan', 'pantry', 'sixteen|16', 'week', 'four|4'], themes: ['personal'], ownObservation: true },
    ], draft: { theory: ['review', 'decision', 'timeline', 'local'], themes: ['review', 'interfaces'] }, forbiddenGists: ['review tools become local decision timelines'] },
  },
  {
    id: 'p-build-robotics-v2', version: PROCESSING_VERSION,
    text: `Synthetic visit to Alder Warehouse: its physical picking robot stopped 17 times in a week when transparent packaging defeated the gripper, and a human reset it every time. This is a physical deployment incident, not a software identity or interface finding. Please make a separate draft theme named Robotics and file that one incident there. I want to explore this falsifiable draft theory: "Warehouse picking robots still need human recovery at least weekly in 2028." Under Robotics, draft it as an idea I have not adopted. Also draft a prototype called Recovery rehearsal: a tabletop gripper test using transparent packages to measure how often a person must intervene. Link that prototype to the new theory. Do not change any held theory or mark either draft accepted.`, urls: [],
    expected: { count: [1, 1], observations: [
      { key: 'robot-stops', clauses: ['Alder', '17|seventeen', 'week', 'transparent', 'grip|pick', 'human|person'], themes: ['Robotics'], ownObservation: true },
    ], draft: { theme: 'Robotics', theory: ['warehouse|picking', 'robot', 'human', 'recover|reset', 'week', '2028'], themes: ['Robotics'], prototype: ['recovery', 'rehearsal'] } },
  },
  {
    id: 'p-revise-dedup-v2', version: PROCESSING_VERSION,
    text: `Three invented links about Cedar Atlas. The saved trial https://example.org/eval-v2/atlas-trial?utm_source=reshare and an independent write-up https://example.org/eval-v2/atlas-followup report the SAME trial: Cedar Atlas retained 90-day project memory only while a project vault stayed enabled; revoking consent erased its saved history. The independent write-up adds no new finding. Attach the repeated source, merge the duplicate observation from the other source, and keep this decoy apart: https://example.org/eval-v2/atlas-latency reports a separate 45% improvement in Cedar Atlas memory lookup latency. That speed benchmark says nothing about retention. Please propose, without applying, a revision to held theory t3 that qualifies cross-month context on keeping the project vault enabled with consent. Do not alter my current claim, confidence, body or accepted evidence.`,
    urls: ['https://example.org/eval-v2/atlas-trial?utm_source=reshare', 'https://example.org/eval-v2/atlas-followup', 'https://example.org/eval-v2/atlas-latency'],
    setup: { gist: 'Cedar Atlas retained 90-day project memory only while a project vault stayed enabled; revoking consent erased its saved history.', url: 'https://example.org/eval-v2/atlas-trial' },
    expected: { count: [2, 2], observations: [
      { key: 'conditional-memory', clauses: ['Cedar|Atlas', '90|ninety', 'vault', 'consent|revok', 'memory|histor'], themes: ['memory'], urls: ['https://example.org/eval-v2/atlas-trial', 'https://example.org/eval-v2/atlas-followup'] },
      { key: 'lookup-speed', clauses: ['Cedar|Atlas', '45|forty.five', 'latency|speed|faster'], themes: ['memory'], urls: ['https://example.org/eval-v2/atlas-latency'] },
    ], revision: { theoryId: 't3', clauses: ['context|memory', 'vault', 'consent|enabled'] }, dedup: { merges: 1, repeatedSource: 'https://example.org/eval-v2/atlas-trial', independentSource: 'https://example.org/eval-v2/atlas-followup', decoySource: 'https://example.org/eval-v2/atlas-latency' } },
  },
];
