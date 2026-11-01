import { useState } from "react";
import { JigPage, Question, type Option } from "./jig";
import { useDecisions } from "./store";
import { WorldMini } from "./minis/world";
import { CompassMini } from "./minis/compass";
import { ChatMini } from "./minis/chat";
import { DraftsMini, type DraftPolicy } from "./minis/drafts";

type Q = { id: string; title: string; context: string; options: Option[] };

const SIMPLE: Q[] = [
  { id: "hosting", title: "Hosting", context: "This turns on whether Aber is a work tool or a personal one.", options: [
    { key: "own", label: "Own server", note: "A small DigitalOcean server in London on your Tailscale network, about $13–14 a month. Personal and portable.", recommended: true, confidence: "low" },
    { key: "coolify", label: "Team Coolify server", note: "Free and already run by someone else, but it ties Aber to work." },
  ] },
  { id: "bin", title: "Bin for deleted dumps", context: "Deleted dumps can be restored for a while.", options: [
    { key: "30", label: "30 days", note: "Matches how Apple Photos and Gmail handle deletions.", recommended: true, confidence: "moderate" },
    { key: "90", label: "90 days", note: "Safer for a tool you might not open for weeks." },
    { key: "forever", label: "Never purge", note: "Deleted dumps stay hidden but are never removed." },
  ] },
  { id: "near-dup", title: "Near-duplicate signals", context: "The same observation from two different sources.", options: [
    { key: "suggest", label: "Suggest a merge", note: "Follows the authority rule, because the signals are already yours.", recommended: true, confidence: "high" },
    { key: "auto", label: "Merge automatically", note: "Less triage, but the agent's judgement gets applied to your material." },
  ] },
  { id: "sources", title: "Sources per signal", context: "One observation can be reported in several places.", options: [
    { key: "many", label: "Several sources", note: "Merging near-duplicates needs this.", recommended: true, confidence: "high" },
    { key: "one", label: "One source", note: "Simpler, but a merge then has to drop a source." },
  ] },
  { id: "tombstones", title: "Discarded signals as tombstones", context: "Keep a hidden record so a later dump doesn't bring them back.", options: [
    { key: "yes", label: "Keep tombstones", note: "Without them, discarded signals come back from the next repeat dump.", recommended: true, confidence: "high" },
    { key: "no", label: "Remove completely", note: "Cleaner data, but discarded signals can come back." },
  ] },
  { id: "retire", title: "Reasons for retiring a theory", context: "The current list is disproven, superseded and abandoned.", options: [
    { key: "complete", label: "That list is complete", note: "Three reasons cover being wrong, being replaced and losing interest.", recommended: true, confidence: "moderate" },
    { key: "add", label: "Add more", note: "Name them in the note, for example 'came true'." },
  ] },
  { id: "media", title: "Prototype media storage", context: "Images and video live outside SQLite.", options: [
    { key: "disk", label: "Server disk, backed up to B2", note: "One place to read from and simple to serve. Needs its own backup job.", recommended: true, confidence: "moderate" },
    { key: "b2", label: "Straight to B2", note: "Durable from the start, but adds latency and signed URLs." },
  ] },
];

export function DecisionsJig() {
  const { decisions, update, saved } = useDecisions();
  const [days, setDays] = useState(0);

  const q = (id: string) => ({ id, value: decisions[id], onChange: (p: Record<string, unknown>) => update(id, p) });
  const answered = Object.values(decisions).filter(d => d.choice).length;
  const ALL = ["world-scale", "compass", "chat", "drafts", ...SIMPLE.map(s => s.id)];

  return (
    <JigPage
      title="Open questions"
      intro={<p>Section 6 of the design model. The first four block Layer 4. The minis are live: pin, hover, send messages and drag the slider.</p>}
      aside={
        <>
          <div className="jig-status">{answered} of {ALL.length} answered{saved ? "" : ", saving"}</div>
          <nav className="jig-toc">
            {ALL.map((id, i) => <a key={id} href={`#${id}`} data-answered={decisions[id]?.choice ? "" : undefined}>{i + 1}</a>)}
          </nav>
        </>
      }
    >
      <div className="jig-section-label">Blocking</div>

      <Question {...q("world-scale")} title="1. World page at 100+ themes"
        context="Board A (theme sections) stays the base plane, and B is already rejected. The open question is how A scales. Pin themes from the table, and try 'Next day' in C."
        options={[
          { key: "pin-themes", label: "A. Pin themes", note: "Adds Pin to Theme only. Theories are reached through their theme.", recommended: true, confidence: "moderate", visual: <WorldMini mode="pin-themes" /> },
          { key: "pin-both", label: "B. Pin themes and theories", note: "Faster to reach one theory, but the same card appears in two places and adds more grammar.", visual: <WorldMini mode="pin-both" /> },
          { key: "activity", label: "C. No pin, use activity", note: "No new verb. Recently active themes expand on their own, so the page shifts from day to day.", visual: <WorldMini mode="activity" /> },
        ]} />

      <Question {...q("compass")} title="2. Theory compass directions"
        context="Hover a direction to see its area."
        options={[
          { key: "keep", label: "A. Keep as drawn", note: "Below is what it rests on; left to right is causal time. Rivals peek from behind the card.", recommended: true, confidence: "moderate", visual: <CompassMini layout="keep" /> },
          { key: "rivals-beside", label: "B. Rivals beside", note: "Rivals are easier to find, but they lose the 'alternative to this' meaning and the compass gets wider.", visual: <CompassMini layout="rivals-beside" /> },
          { key: "protos-right", label: "C. Prototypes bottom right", note: "Frees up the top, but puts artefacts beside claims.", visual: <CompassMini layout="protos-right" /> },
        ]} />

      <Question {...q("chat")} title="3. Is each chat message a Dump?"
        context="Send your own message, ending it with ? to make it a question, and watch what each option stores."
        options={[
          { key: "all-dumps", label: "A. Every message is a Dump", note: "One way in, full provenance. The log fills with questions too.", recommended: true, confidence: "moderate", visual: <ChatMini policy="all-dumps" /> },
          { key: "dumps-only", label: "B. Only material is kept", note: "The agent decides which messages are questions. A cleaner log, but some thinking is lost.", visual: <ChatMini policy="dumps-only" /> },
          { key: "separate", label: "C. Separate conversation log", note: "Adds a Conversation concept, which was rejected before. Listed for completeness.", visual: <ChatMini policy="separate" /> },
        ]} />

      <Question {...q("drafts")} title="4. Do drafts expire?"
        context="Drafts sit at the end of their theme section. Drag the slider to see time pass while you're away."
        controls={
          <label className="jig-controls">
            Days away
            <input type="range" min={0} max={40} value={days} onChange={e => setDays(+e.target.value)} />
            <output>{days} days</output>
          </label>
        }
        options={(["stack-by-age", "expire-30", "fade"] as DraftPolicy[]).map((p, i) => ({
          key: p,
          label: ["A. No expiry, stack by age", "B. Expire after 30 days", "C. Fade with age"][i],
          note: [
            "Drafts older than 2 weeks fold into the stack. Nothing vanishes without you.",
            "Untouched drafts are discarded and tombstoned. Tidy, but you can lose good ones.",
            "A visual cue only, but fading competes with the translucent 'not yet yours' material.",
          ][i],
          recommended: i === 0, confidence: i === 0 ? "moderate" as const : undefined,
          visual: <DraftsMini policy={p} days={days} />,
        }))} />

      <div className="jig-section-label">Grammar and implementation</div>
      {SIMPLE.map((s, i) => (
        <Question key={s.id} {...q(s.id)} title={`${i + 5}. ${s.title}`} context={s.context} options={s.options} compact />
      ))}
    </JigPage>
  );
}
