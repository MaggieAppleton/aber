import { useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { JigPage } from "./jig";
import { AppShell, VIEWS, logStatus, type View } from "./homes/app-shell";
import { BriefingView } from "./homes/briefing-app";
import { DumpLog, useDumpLog, useLogFromDump } from "./homes/dump-log";
import { ObjectPane, type ObjKind } from "./homes/panes";
import { DumpOrAsk, PhoneFrame, useDump, type Sees } from "./homes/pill-study";
import { IconButton } from "./homes/atoms";
import { useEdit } from "./homes/edits";
import "./homes/homes.css";

const ROWS: [string, string][] = [
  ["Views", "Five views of the same material. Theme sections opens first; Columns, Atlas (circles, Paper, signals revealed on zoom) and Timeline (the Field) are the same theories arranged differently; Briefing is what changed since you last looked."],
  ["Switch views", "Icon control bottom-left, opposite the pill, or ⌘1 to ⌘5 in that order. Short cross-fade with a slight scale; whatever is open stays open."],
  ["Open an object", "Click a theory, theme heading, territory, pin or Briefing item. It opens in one shared pane docked on the right that slides in from the edge and pushes the view."],
  ["Pane widths", "Compact, half, wide (the view's default) and full; drag the left edge or ⌘[ ⌘]. When half lands within 40px of compact, half is kept and compact drops out."],
  ["Briefing", "Challenges, drafts, suggestions, auto-merged near-duplicates (one click to unmerge) and new signals by theme. J and K move, A accepts, X discards, U unmerges, O opens."],
  ["Dump or ask", "Pill and mic bottom-right on every view. Its chip names what you are looking at: the view, or the open object first. Click or ⌘J grows the docked column up from the corner."],
  ["Dump log", "The history segment at the pill's left end, or ⌘⇧L: recent dumps with processing status and what each produced, and a bin that keeps deleted dumps for 30 days. Esc sinks it back into the pill."],
  ["Both open", "Both stay docked. The dump column owns the far-right edge because it grows from the corner pill; the pane narrows and moves left of it, and the view compresses (Timeline scrolls sideways)."],
  ["Esc", "One stack: closes whichever of the log, the pane and the column opened last, then the next. Picking and recording are cancelled first."],
];

export function DevelopAppJig() {
  const q = new URLSearchParams(location.search).get("view");
  const initial = VIEWS.some(v => v.id === q) ? (q as View) : "current";
  return (
    <JigPage title="App" status={<>Canonical. Every v1 surface, as decided; see <a href="/reference">/reference</a> for the constants.</>}
      intro={<p>The five views, one shared object pane, the dump-or-ask pill with its log, and the edits store, in one window.</p>}>
      <div className="as-page">
        <AppShell initial={initial} />
        <table className="hm-where as-where"><tbody>{ROWS.map(([a, b]) => <tr key={a}><th>{a}</th><td>{b}</td></tr>)}</tbody></table>
        <section className="hm" id="phone">
          <div className="hm-head"><div className="hm-head-text"><h2>Phone</h2>
            <p>Capture is the Apple Shortcut. On the phone the app is only the Briefing, the pane and the pill, at 390 wide. Tap an item to open it; the back arrow returns.</p></div></div>
          <div className="aph-row">
            <PhoneApp />
            <PhoneApp start={{ kind: "theory", id: "t3" }} />
          </div>
        </section>
      </div>
    </JigPage>
  );
}

type Obj = { kind: ObjKind; id: string };
const PW = 390, PH = 844;

/** The phone: Briefing, the pane over it, and the pill bottom-right with its log. */
function PhoneApp({ start }: { start?: Obj }) {
  const frame = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Obj | undefined>(start);
  const [logOpen, setLogOpen] = useState(false);
  const { s, api } = useDump({ ctx: [] });
  const log = useDumpLog();
  useLogFromDump(s, log.api);
  const name = useEdit("theory", open?.kind === "theory" ? open.id : "t1")[0].claim;
  const sees: Sees[] = [open?.kind === "theory" ? { label: name, kind: "theory", id: open.id } : { label: "Briefing", kind: "screen" }];
  return (
    <MotionConfig reducedMotion="user">
      <PhoneFrame>
        <div ref={frame} className="ps-frame ap aph" data-variant="P" style={{ width: PW, height: PH }}
          onPointerDownCapture={e => { if (logOpen && !(e.target as Element).closest(".ps-log, [data-log-toggle]")) setLogOpen(false); }}>
          <BriefingView phone host={{ open, onOpen: (kind, id) => setOpen({ kind, id }), onLog: () => setLogOpen(true) }} />
          <AnimatePresence>
            {open && (
              <motion.div key="pane" className="aph-pane" initial={{ x: PW }} animate={{ x: 0 }} exit={{ x: PW }} transition={{ type: "spring", duration: 0.45, bounce: 0.06 }}>
                <div className="aph-bar"><IconButton icon="arrowLeft" label="Back to the Briefing" onClick={() => setOpen(undefined)} /></div>
                <div className="aph-scroll ap-scroll">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={`${open.kind}:${open.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}>
                      <ObjectPane kind={open.kind} id={open.id} nav={{ onOpen: (kind, id) => setOpen({ kind, id }) }} />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <DumpOrAsk variant="P" corner s={s} api={api} w={PW} h={PH} frameRef={frame} sees={sees} keys={false}
            log={{ open: logOpen, onToggle: () => setLogOpen(o => !o), status: logStatus(log.entries),
              panel: <DumpLog entries={log.entries} bin={log.bin} api={log.api} onClose={() => setLogOpen(false)} /> }} />
        </div>
      </PhoneFrame>
    </MotionConfig>
  );
}
