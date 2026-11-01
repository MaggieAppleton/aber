import { useRef, useState } from "react";
import { THEMES, theoriesIn, PROTOTYPES, type Theory } from "./data";
import { TheoryCard, Pill, Icon, IconButton } from "./atoms";
import { useEdit } from "./edits";
import { ThemeName, type ObjKind, type OnOpen } from "./panes";

/** A host (the app shell) can open themes and theories from here into its own pane. */
export type CurrentHost = { open?: { kind: ObjKind; id: string }; onOpen: OnOpen };

/** A theory card that shows the live (edited) claim and confidence. */
function LiveCard({ t, hot, onEnter, onLeave, onClick }: { t: Theory; hot?: boolean; onEnter: () => void; onLeave: () => void; onClick?: () => void }) {
  const [e] = useEdit("theory", t.id);
  return <TheoryCard t={{ ...t, claim: e.claim, confidence: e.confidence }} hot={hot} onEnter={onEnter} onLeave={onLeave} onClick={onClick} />;
}

/** Baseline: the space-and-motion boards. Docked theme index, theme sections, floating pill. */
export function CurrentHome({ host }: { host?: CurrentHost }) {
  const [hot, setHot] = useState<string>();
  const [active, setActive] = useState("cost");
  const main = useRef<HTMLElement>(null);
  const open = host?.open;
  // Scroll the sections themselves, never the page.
  const jump = (id: string) => {
    const m = main.current, el = document.getElementById(`cur-${id}`);
    if (!m || !el) return;
    m.scrollTo({ top: m.scrollTop + el.getBoundingClientRect().top - m.getBoundingClientRect().top - 16, behavior: "smooth" });
  };
  return (
    <div className="ap cur" data-hosted={host ? "" : undefined}>
      <aside className="cur-rail">
        <div className="cur-brand">Aber<IconButton icon="search" label="Find (⌘K)" /></div>
        <nav className="cur-index">
          {THEMES.map(t => {
            const n = theoriesIn(t.id).length;
            return (
              <a key={t.id} href={`#cur-${t.id}`} data-active={active === t.id ? "" : undefined}
                onClick={e => { e.preventDefault(); setActive(t.id); jump(t.id); }}>
                <span><ThemeName id={t.id} /></span>
                <span className="ap-muted ap-num">{n || "open"}</span>
              </a>
            );
          })}
        </nav>
        <a className="cur-protos"><Icon name="prototype" />Prototypes<span className="ap-muted ap-num">{PROTOTYPES.length}</span></a>
      </aside>
      <main className="cur-main ap-scroll" ref={main}>
        {THEMES.map(t => {
          const ts = theoriesIn(t.id);
          const themeOpen = open?.kind === "theme" && open.id === t.id;
          return (
            <section key={t.id} id={`cur-${t.id}`} className="cur-section">
              <div className="cur-theme">
                {host
                  ? <button className="ap-h cur-theme-name cur-theme-btn" data-open={themeOpen ? "" : undefined} onClick={() => host.onOpen("theme", t.id)}
                      data-pick={t.id} data-region={t.id} data-kind="theme" data-label={t.name}><ThemeName id={t.id} /></button>
                  : <span className="ap-h cur-theme-name">{t.name}</span>}
                <span className="ap-muted ap-num">{t.signals} signals</span>
                {ts.length === 0 && <IconButton icon="plus" label="State a theory" />}
              </div>
              {ts.length > 0 && (
                <div className="cur-cards">
                  {ts.map(th => (
                    <div key={th.id} className="cur-card" data-pick={th.id} data-region={th.id} data-label={th.claim} data-kind="theory">
                      <LiveCard t={th} hot={hot === th.id || (open?.kind === "theory" && open.id === th.id)}
                        onEnter={() => setHot(th.id)} onLeave={() => setHot(undefined)} onClick={host ? () => host.onOpen("theory", th.id) : undefined} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
        <div style={{ height: 80 }} />
      </main>
      {!host && <Pill sees="World" />}
    </div>
  );
}
