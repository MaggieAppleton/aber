import { TooltipButton } from "./tooltip";
import { act, field, useWorld, world } from "../data/live";
import { deleteDump } from "../app/dialogs";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DUMPS, type Dump } from "./data";
import { Icon, IconButton, DumpIcon } from "./atoms";
import type { DumpState } from "./pill-study";
import "./dump-log.css";
import { pendingDumpLabel } from "./dump-status";

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

export function useDumpLog() {
  useWorld();
  const convert=(d:any):Entry=>{
    const date=new Date(field(d,"capturedAt")??field(d,"createdAt")??Date.now());
    const produced=d.produced??[];
    return { id:d.id,kind:d.kind??(d.attachments?.some((a:any)=>a.kind==="audio")?"voice":d.attachments?.some((a:any)=>a.kind==="link")?"link":"text"),first:d.first??d.text?.split("\n")[0]??"Voice note",day:d.day??date.toLocaleDateString("en-GB",{day:"numeric",month:"short"}),time:d.time??date.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}),status:d.status==="failed"?"failed":d.status==="done"?"done":"processing",error:d.error,made:d.made??{signals:produced.filter((id:string)=>world.signals.some(s=>s.id===id)).length,drafts:produced.filter((id:string)=>world.theories.some(t=>t.id===id&&t.status==="draft")).length},deleted:field(d,"deletedAt")?new Date(field(d,"deletedAt")).toLocaleDateString("en-GB",{day:"numeric",month:"short"}):undefined };
  };
  const all=[...world.dumps].sort((a,b)=>(field(b,"capturedAt")??"").localeCompare(field(a,"capturedAt")??""));
  return {entries:all.filter(d=>!field(d,"deletedAt")).map(convert),bin:all.filter(d=>field(d,"deletedAt")).map(convert),api:{retry:(id:string)=>act("retryDump",{id}),remove:(id:string)=>void deleteDump(id),restore:(id:string)=>act("restoreDump",{id}),seen:()=>{}}};
}
export type DumpLogApi = ReturnType<typeof useDumpLog>["api"];
export function useLogFromDump(_s:DumpState,_api:DumpLogApi) {}

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
          {tab === "log" && <TooltipButton className="dl-bin" onClick={() => setTab("bin")} tooltip="Bin: deleted dumps, kept 30 days" aria-label={`Bin, ${bin.length} deleted`}>
            <Icon name="trash" size={14} />{bin.length > 0 && <span className="ap-num">{bin.length}</span>}
          </TooltipButton>}
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
  const paused = e.status === "processing" ? pendingDumpLabel(e.error) : undefined;
  return (
    <motion.div layout={reduce ? false : "position"} className="dl-row" data-status={e.status}
      initial={{ opacity: 0, y: reduce ? 0 : -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
      <span className="dl-kind"><DumpIcon d={{ kind: e.kind } as Dump} /></span>
      <span className="dl-first" title={e.first}>{e.first}</span>
      <span className="dl-time ap-muted ap-num">{binned ? `Deleted ${e.deleted}` : e.time}</span>
      <span className="dl-status">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span key={e.status} className="dl-status-in" initial={{ opacity: 0, filter: "blur(2px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0, filter: "blur(2px)" }} transition={{ duration: 0.2 }}>
            {e.status === "processing" && (paused ? <span className="dl-paused ap-muted">{paused}</span> : <span className="dl-working">Processing</span>)}
            {e.status === "failed" && <><span className="dl-error">{e.error ?? "Failed"}</span></>}
            {e.status === "done" && e.made && <Made made={e.made} />}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="dl-acts">
        {world.merges.filter(m=>field(m,"dumpId")===e.id&&!field(m,"undoneAt")).map(m=><button key={m.id} className="ap-btn" onClick={()=>act("undoMerge",{id:m.id})}>Undo merge</button>)}
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
