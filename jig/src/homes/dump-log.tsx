import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DUMPS, type Dump } from "./data";
import { Icon, IconButton, DumpIcon } from "./atoms";
import type { DumpState } from "./pill-study";
import "./dump-log.css";

/*
 * The dump log (d-dump-log "minimal"): what I dumped and what became of it. Tier 3: it rises from the pill's log
 * segment and sinks back into it. Each dump shows its processing status (processing, done, failed with retry) and,
 * once done, what it produced as object glyphs with counts. Deleting moves a dump to the bin for 30 days, where it
 * can be restored. Every chat message is a dump (d-chat-as-dump), so questions appear here too.
 *
 * Opened from the history segment on the pill, or ⌘⇧L. Esc, a second click, or a click away closes it.
 */

export type Status = "processing" | "done" | "failed";
export type Entry = {
  id: string; kind: Dump["kind"]; first: string; day: string; time: string; status: Status;
  made?: { signals: number; drafts: number }; error?: string; deleted?: string;
};

const fromDump = (d: Dump): Entry => ({
  id: d.id, kind: d.kind, first: d.first, day: d.day, time: d.time, status: "done",
  made: { signals: d.produced.filter(p => p.startsWith("s")).length, drafts: d.produced.filter(p => p.startsWith("d")).length },
});

const SEED: Entry[] = [
  { id: "L1", kind: "voice", first: "Voice note, 1 min: memory as a liability", day: "Today", time: "08:31", status: "processing" },
  { id: "L2", kind: "link", first: "stratechery.com: agents and the price of a seat", day: "Today", time: "08:20", status: "failed", error: "Couldn't read the page (paywall)" },
  ...DUMPS.map(fromDump),
];
const BIN: Entry[] = [{ id: "L0", kind: "text", first: "test test", day: "Mon 27 Oct", time: "20:58", status: "done", made: { signals: 0, drafts: 0 }, deleted: "4d" }];

/** Processing takes this long in the jig. */
const WORK_MS = 2600;

export function useDumpLog() {
  const [entries, setEntries] = useState<Entry[]>(SEED);
  const [bin, setBin] = useState<Entry[]>(BIN);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const api = useMemo(() => {
    const patch = (id: string, p: Partial<Entry>) => setEntries(es => es.map(e => (e.id === id ? { ...e, ...p } : e)));
    const finish = (id: string, made: Entry["made"], ms = WORK_MS) => timers.current.push(window.setTimeout(() => patch(id, { status: "done", made }), ms));
    return {
      /** A new dump from the pill: processing until its reply arrives (or `done` is called). */
      add: (e: Omit<Entry, "status" | "day">) => setEntries(es => es.some(x => x.id === e.id) ? es : [{ ...e, day: "Today", status: "processing" }, ...es]),
      done: (id: string, made: Entry["made"]) => patch(id, { status: "done", made }),
      retry: (id: string) => { patch(id, { status: "processing", error: undefined }); finish(id, { signals: 1, drafts: 0 }); },
      remove: (id: string) => setEntries(es => { const e = es.find(x => x.id === id); if (e) setBin(b => [{ ...e, deleted: "now" }, ...b]); return es.filter(x => x.id !== id); }),
      restore: (id: string) => setBin(b => { const e = b.find(x => x.id === id); if (e) setEntries(es => [{ ...e, deleted: undefined }, ...es].sort(byTime)); return b.filter(x => x.id !== id); }),
      /** The seeded voice note finishes the first time the log is seen. */
      seen: () => finish("L1", { signals: 2, drafts: 1 }),
    };
  }, []);
  return { entries, bin, api };
}
export type DumpLogApi = ReturnType<typeof useDumpLog>["api"];

const DAYS = ["Today", "Yesterday"];
const byTime = (a: Entry, b: Entry) => (DAYS.indexOf(a.day) + 1 || 9) - (DAYS.indexOf(b.day) + 1 || 9) || b.time.localeCompare(a.time);

/** Every message sent from the pill becomes a dump in the log: processing while the agent works, then what it made. */
export function useLogFromDump(s: DumpState, api: DumpLogApi) {
  const known = useRef(new Set(s.thread.map(m => m.id)));
  const busy = useRef(s.busy);
  useEffect(() => {
    s.thread.forEach((m, i) => {
      if (m.who === "me" && !known.current.has(m.id)) {
        known.current.add(m.id);
        api.add({ id: m.id, kind: m.voice ? "voice" : m.atts.some(a => a.kind === "link") ? "link" : "text", first: m.voice ? `Voice note, ${m.voice}s` : m.text || m.atts.map(a => a.host).join(", "), time: m.time });
      }
      const reply = s.thread[i + 1];
      if (m.who === "me" && reply?.who === "agent" && !reply.thinking && !known.current.has(reply.id)) {
        known.current.add(reply.id);
        api.done(m.id, { signals: reply.filed.reduce((a, f) => a + f.n, 0), drafts: reply.draft ? 1 : 0 });
      }
    });
  }, [s.thread]);
  // A dump that never opened the panel (a drop or a closed-pill voice note) shows while the pill is busy.
  useEffect(() => {
    if (s.busy && !busy.current) api.add({ id: `direct-${Date.now()}`, kind: "voice", first: "Voice note", time: new Date().toTimeString().slice(0, 5) });
    busy.current = s.busy;
  }, [s.busy]);
}

/** The log panel itself. The host positions it (DumpOrAsk's log slot) and owns open/close. */
export function DumpLog({ entries, bin, api, onClose }: { entries: Entry[]; bin: Entry[]; api: DumpLogApi; onClose: () => void }) {
  const [tab, setTab] = useState<"log" | "bin">("log");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { api.seen(); ref.current?.focus({ preventScroll: true }); }, []);
  const list = tab === "log" ? entries : bin;
  const days = [...new Set(list.map(e => e.day))];
  return (
    <div className="dl" ref={ref} tabIndex={-1} role="dialog" aria-label={tab === "log" ? "Dump log" : "Bin"}>
      <header className="dl-head">
        {tab === "bin" && <IconButton icon="chevronLeft" label="Back to dumps" onClick={() => setTab("log")} />}
        <span className="ap-h">{tab === "log" ? "Dumps" : "Bin"}</span>
        {tab === "bin" && <span className="ap-muted">Kept 30 days</span>}
        <span className="dl-head-acts">
          {tab === "log" && <button className="dl-bin" onClick={() => setTab("bin")} title="Bin: deleted dumps, kept 30 days" aria-label={`Bin, ${bin.length} deleted`}>
            <Icon name="trash" size={14} />{bin.length > 0 && <span className="ap-num">{bin.length}</span>}
          </button>}
          <IconButton icon="x" label="Close (Esc)" onClick={onClose} />
        </span>
      </header>
      <div className="dl-scroll ap-scroll">
        <AnimatePresence initial={false} mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            {list.length === 0 && <p className="dl-empty ap-muted">{tab === "bin" ? "Nothing deleted" : "No dumps yet"}</p>}
            {days.map(day => (
              <section key={day} className="dl-day">
                <h3 className="ap-label dl-day-name">{day}</h3>
                <AnimatePresence initial={false} mode="popLayout">
                  {list.filter(e => e.day === day).map(e => <Row key={e.id} e={e} api={api} binned={tab === "bin"} />)}
                </AnimatePresence>
              </section>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Row({ e, api, binned }: { e: Entry; api: DumpLogApi; binned: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div layout={reduce ? false : "position"} className="dl-row" data-status={e.status}
      initial={{ opacity: 0, y: reduce ? 0 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
      <span className="dl-kind"><DumpIcon d={{ kind: e.kind } as Dump} /></span>
      <span className="dl-first" title={e.first}>{e.first}</span>
      <span className="dl-time ap-muted ap-num">{binned ? `Deleted ${e.deleted}` : e.time}</span>
      <span className="dl-status">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span key={e.status} className="dl-status-in" initial={{ opacity: 0, filter: "blur(2px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0, filter: "blur(2px)" }} transition={{ duration: 0.2 }}>
            {e.status === "processing" && <span className="dl-working">Processing</span>}
            {e.status === "failed" && <><span className="ap-mark" data-kind="challenge" aria-hidden /><span className="dl-error">{e.error ?? "Failed"}</span></>}
            {e.status === "done" && e.made && <Made made={e.made} />}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="dl-acts">
        {binned
          ? <button className="ap-btn" onClick={() => api.restore(e.id)}>Restore</button>
          : <>
              {e.status === "failed" && <button className="ap-btn" onClick={() => api.retry(e.id)}>Retry</button>}
              <span className="dl-del"><IconButton icon="trash" label="Delete (to the bin for 30 days)" onClick={() => api.remove(e.id)} /></span>
            </>}
      </span>
    </motion.div>
  );
}

/** What a dump produced: signals solid, drafts dashed (not yet mine). Nothing filed is said once, quietly. */
function Made({ made }: { made: NonNullable<Entry["made"]> }) {
  if (!made.signals && !made.drafts) return <span className="ap-muted">Nothing filed</span>;
  return (
    <span className="dl-made">
      {made.signals > 0 && <span className="dl-tok" title={`${made.signals} ${made.signals === 1 ? "signal" : "signals"}`}><Icon name="signal" size={12} /><span className="ap-num">{made.signals}</span></span>}
      {made.drafts > 0 && <span className="dl-tok" data-draft="" title={`${made.drafts} ${made.drafts === 1 ? "draft" : "drafts"}`}><Icon name="theory" size={12} /><span className="ap-num">{made.drafts}</span></span>}
    </span>
  );
}
