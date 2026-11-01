import { useState } from "react";
import { THEMES, theoriesIn, PROTOTYPES } from "./data";
import { TheoryCard, Pill, Icon, IconButton } from "./atoms";

/** Baseline: the space-and-motion boards. Docked theme index, theme sections, floating pill. */
export function CurrentHome() {
  const [hot, setHot] = useState<string>();
  const [active, setActive] = useState("cost");
  return (
    <div className="ap cur">
      <aside className="cur-rail">
        <div className="cur-brand">Aber<IconButton icon="search" label="Find (⌘K)" /></div>
        <nav className="cur-index">
          {THEMES.map(t => {
            const n = theoriesIn(t.id).length;
            return (
              <a key={t.id} href={`#cur-${t.id}`} data-active={active === t.id ? "" : undefined}
                onClick={e => { e.preventDefault(); setActive(t.id); document.getElementById(`cur-${t.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                <span>{t.name}</span>
                <span className="ap-muted ap-num">{n || "open"}</span>
              </a>
            );
          })}
        </nav>
        <a className="cur-protos"><Icon name="prototype" />Prototypes<span className="ap-muted ap-num">{PROTOTYPES.length}</span></a>
      </aside>
      <main className="cur-main ap-scroll">
        {THEMES.map(t => {
          const ts = theoriesIn(t.id);
          return (
            <section key={t.id} id={`cur-${t.id}`} className="cur-section">
              <div className="cur-theme">
                <span className="ap-h cur-theme-name">{t.name}</span>
                <span className="ap-muted ap-num">{t.signals} signals</span>
                {ts.length === 0 && <IconButton icon="plus" label="State a theory" />}
              </div>
              {ts.length > 0 && (
                <div className="cur-cards">
                  {ts.map(th => (
                    <TheoryCard key={th.id} t={th} hot={hot === th.id} onEnter={() => setHot(th.id)} onLeave={() => setHot(undefined)} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
        <div style={{ height: 80 }} />
      </main>
      <Pill sees="World" />
    </div>
  );
}
