import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export type ChatPolicy = "all-dumps" | "dumps-only" | "separate";

type Msg = { text: string; reply: string };

const SEED: Msg[] = [
  { text: "x.com/… Anthropic cut prices again, and a voice note about local models", reply: "Filed 2 signals in Cost of intelligence" },
  { text: "Which of my theories does this undermine?", reply: "Possibly Intelligence becomes scarce" },
  { text: "What if pricing moves to outcomes, not seats?", reply: "Drafted a theory that follows from Tokens become nearly free" },
];

const isQuestion = (t: string) => t.trim().endsWith("?") && !/^what if/i.test(t.trim());

export function ChatMini({ policy }: { policy: ChatPolicy }) {
  const [msgs, setMsgs] = useState(SEED);
  const [draft, setDraft] = useState("");

  const dumps = msgs.filter(m => policy === "all-dumps" || !isQuestion(m.text));
  const questions = policy === "separate" ? msgs.filter(m => isQuestion(m.text)) : [];
  const lost = policy === "dumps-only" ? msgs.filter(m => isQuestion(m.text)) : [];

  function send() {
    if (!draft.trim()) return;
    setMsgs([...msgs, { text: draft.trim(), reply: isQuestion(draft) ? "Answered" : "Processing" }]);
    setDraft("");
  }

  return (
    <div className="wf ch">
      <div className="ch-panel">
        {msgs.map((m, i) => (
          <div key={i} className="ch-msg"><div className="ch-me">{m.text}</div><div className="wf-mono">{m.reply}</div></div>
        ))}
        <form onSubmit={e => { e.preventDefault(); send(); }} className="ch-input">
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Dump or ask" aria-label="Message" />
        </form>
      </div>
      <div className="wf-label">Dump log</div>
      <div className="wf-table">
        <AnimatePresence initial={false}>
          {dumps.map(m => (
            <motion.div key={m.text} className="wf-tr ch-tr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <span className="ch-clip">{m.text}</span><span className="wf-mono">{m.reply.startsWith("Filed") ? "2 signals" : m.reply.startsWith("Drafted") ? "1 draft" : "reply"}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {policy === "separate" && (
        <>
          <div className="wf-label">Conversations</div>
          <div className="wf-table">{questions.map(m => <div key={m.text} className="wf-tr ch-tr"><span className="ch-clip">{m.text}</span><span /></div>)}</div>
        </>
      )}
      {lost.length > 0 && (
        <>
          <div className="wf-label">Not kept after the session</div>
          {lost.map(m => <div key={m.text} className="wf-empty ch-lost">{m.text}</div>)}
        </>
      )}
    </div>
  );
}
