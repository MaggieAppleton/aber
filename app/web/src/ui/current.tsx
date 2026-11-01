import { CurrentSidebar } from "./current-sidebar";
import { rowFor } from "../data/live";
import { VIEW_CLEARANCE } from "./metrics";
import { Accordion } from "@base-ui/react/accordion";
import { createObject } from "../app/dialogs";
import { useRef, useState } from "react";
import { THEMES, theoriesIn, type Theory } from "./data";
import { TheoryCard, Pill, Icon, IconButton } from "./atoms";
import { useEdit } from "./edits";
import { tripFor } from "./trips";
import { ThemeName, type ObjKind, type OnOpen } from "./panes";

/** A host (the app shell) can open themes and theories from here into its own pane. */
export type CurrentHost = { open?: { kind: ObjKind; id: string }; onOpen: OnOpen; compact?: boolean };

/** A theory card that shows the live (edited) claim and confidence. */
function LiveCard({ t, hot, onEnter, onLeave, onClick }: { t: Theory; hot?: boolean; onEnter: () => void; onLeave: () => void; onClick?: () => void }) {
  const [e] = useEdit("theory", t.id);
  // Challenged while a tripwire hit is still undecided.
  const hits = tripFor(t.id).hits;
  const challenge = hits.length ? hits.some(h => !e.decisions[h.id]) : t.challenge;
  return <TheoryCard t={{ ...t, claim: e.claim, confidence: e.confidence, challenge }} hot={hot} onEnter={onEnter} onLeave={onLeave} onClick={onClick} />;
}

/** Baseline: the space-and-motion boards. Docked theme index, theme sections, floating pill. */
export function CurrentHome({ host }: { host?: CurrentHost }) {
  const [hot, setHot] = useState<string>();
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [draftsOpen,setDraftsOpen]=useState<Record<string,boolean>>({});
  const [active, setActive] = useState(THEMES[0]?.id ?? "");
  const main = useRef<HTMLElement>(null);
  const open = host?.open;
  // Scroll the sections themselves, never the page.
  const jump = (id: string) => {
    const m = main.current, el = document.getElementById(`cur-${id}`);
    if (!m || !el) return;
    m.scrollTo({ top: m.scrollTop + el.getBoundingClientRect().top - m.getBoundingClientRect().top - 16, behavior: "smooth" });
  };
  return (
    <div className="ap cur" data-hosted={host ? "" : undefined} data-compact={host?.compact ? "" : undefined} data-rail-collapsed={railCollapsed ? "" : undefined}>
      <CurrentSidebar active={active} onCollapsedChange={setRailCollapsed} onOpen={host?.onOpen} onTheme={id => { setActive(id); if (host?.compact) host.onOpen("theme", id); else jump(id); }} />
      <main className="cur-main ap-scroll" ref={main} inert={!!host?.compact && !railCollapsed}>
        {THEMES.map(t => {
          const ts = theoriesIn(t.id);
          const drafts=ts.filter(theory=>theory.draft);
          const stacked=drafts.length>3;
          const visible=stacked?ts.filter(theory=>!theory.draft):ts;
          const themeOpen = open?.kind === "theme" && open.id === t.id;
          return (
            <section key={t.id} id={`cur-${t.id}`} className="cur-section">
              <div className="cur-theme">
                {host
                  ? <button className="ap-h cur-theme-name cur-theme-btn" data-draft={rowFor("theme",t.id)?.status==="draft"?"":undefined} data-open={themeOpen ? "" : undefined} onClick={() => host.onOpen("theme", t.id)}
                      data-pick={t.id} data-region={t.id} data-kind="theme" data-label={t.name}><ThemeName id={t.id} /></button>
                  : <span className="ap-h cur-theme-name">{t.name}</span>}
                <span className="ap-muted ap-num">{t.signals} {t.signals===1?"signal":"signals"}</span>
                <IconButton icon="plus" label="State a theory" onClick={()=>void createObject("theory",t.id)} />
              </div>
              {ts.length > 0 && (
                <div className="cur-cards">
                  {visible.map(th => (
                    <div key={th.id} className="cur-card" data-pick={th.id} data-region={th.id} data-label={th.claim} data-kind="theory">
                      <LiveCard t={th} hot={hot === th.id || (open?.kind === "theory" && open.id === th.id)}
                        onEnter={() => setHot(th.id)} onLeave={() => setHot(undefined)} onClick={host ? () => host.onOpen("theory", th.id) : undefined} />
                    </div>
                  ))}
                  {stacked&&<Accordion.Root className="ab-draft-stack" value={draftsOpen[t.id]?[t.id]:[]} onValueChange={value=>setDraftsOpen(previous=>({...previous,[t.id]:value.length>0}))}><Accordion.Item value={t.id}><Accordion.Header><Accordion.Trigger className="ap-card ab-draft-stack-trigger" data-draft=""><span className="ap-card-claim">{drafts.at(-1)?.claim}</span><span className="ap-muted">{drafts.length} drafts <Icon name="chevron" size={12}/></span></Accordion.Trigger></Accordion.Header><Accordion.Panel className="ab-accordion-panel"><div className="ab-draft-stack-cards">{drafts.map(th=><LiveCard key={th.id} t={th} hot={hot===th.id} onEnter={()=>setHot(th.id)} onLeave={()=>setHot(undefined)} onClick={()=>host?.onOpen("theory",th.id)}/>)}</div></Accordion.Panel></Accordion.Item></Accordion.Root>}
                </div>
              )}
            </section>
          );
        })}
        <div style={{ height: VIEW_CLEARANCE.sectionEnd }} />
      </main>
      {!host && <Pill sees="World" />}
    </div>
  );
}
