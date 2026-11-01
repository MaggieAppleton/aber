import { useState } from "react";
import { motion, LayoutGroup } from "motion/react";
import { PinIcon } from "./icons";

type Theory = { id: string; claim: string; draft?: boolean };
type Theme = { id: string; name: string; theories: Theory[]; signals: number; last: number; moved?: string };

const THEMES: Theme[] = [
  { id: "cost", name: "Cost of intelligence", signals: 23, last: 0, moved: "2 new signals",
    theories: [{ id: "t1", claim: "Tokens become nearly free" }, { id: "t2", claim: "Intelligence becomes scarce" }, { id: "d1", claim: "Local models absorb everyday work", draft: true }] },
  { id: "mem", name: "Agent memory", signals: 31, last: 1,
    theories: [{ id: "t3", claim: "Agents keep context for months" }] },
  { id: "review", name: "Code review after agents", signals: 18, last: 0, moved: "1 challenge",
    theories: [{ id: "t4", claim: "Review becomes the bottleneck" }] },
  { id: "personal", name: "Personal software", signals: 27, last: 0, moved: "1 draft theory",
    theories: [{ id: "t5", claim: "Most apps are made for one" }, { id: "d2", claim: "App stores lose relevance", draft: true }] },
  { id: "ui", name: "Novel agent interfaces", signals: 14, last: 3, theories: [] },
  { id: "fund", name: "AI funding cycle", signals: 9, last: 6,
    theories: [{ id: "t6", claim: "Labs face a funding correction" }] },
  { id: "ident", name: "Agent identity", signals: 6, last: 9, theories: [] },
];

export type WorldMode = "pin-themes" | "pin-both" | "activity";

function TheoryCard({ t, pinnable, pinned, onPin }: { t: Theory; pinnable?: boolean; pinned?: boolean; onPin?: () => void }) {
  return (
    <motion.div layout="position" className={`wf-card${t.draft ? " wf-draft" : ""}`}>
      <b>{t.claim}</b>
      {pinnable && !t.draft && (
        <button className="wf-icon" aria-label={pinned ? "Unpin theory" : "Pin theory"} title={pinned ? "Unpin" : "Pin"} aria-pressed={pinned} onClick={onPin}>
          <PinIcon filled={pinned} />
        </button>
      )}
    </motion.div>
  );
}

function ThemeBlock({ th, children }: { th: Theme; children?: React.ReactNode }) {
  return (
    <motion.div layout="position">
      <div className="wf-theme"><strong>{th.name}</strong><span className="wf-mono">{th.signals} signals</span>{children}</div>
      {th.theories.length > 0
        ? <div className="wf-row">{th.theories.map(t => <TheoryCard key={t.id} t={t} />)}</div>
        : <div className="wf-empty">No theory yet</div>}
    </motion.div>
  );
}

export function WorldMini({ mode }: { mode: WorldMode }) {
  const [pinnedThemes, setPinnedThemes] = useState<string[]>(["cost", "mem"]);
  const [pinnedTheories, setPinnedTheories] = useState<string[]>(["t4"]);
  const [themes, setThemes] = useState(THEMES);
  const [day, setDay] = useState(0);
  const [flash, setFlash] = useState<string>();

  const toggle = (list: string[], set: (l: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  // Activity mode: the two most recently active themes expand on their own.
  const byActivity = [...themes].sort((a, b) => a.last - b.last);
  const expanded = mode === "activity" ? byActivity.slice(0, 2).map(t => t.id) : pinnedThemes;

  function nextDay() {
    const pool = themes.filter(t => !expanded.includes(t.id));
    const pick = pool[(day * 3 + 1) % pool.length];
    setThemes(themes.map(t => t.id === pick.id ? { ...t, last: -1 - day } : { ...t, last: t.last + 1 }));
    setFlash(pick.id);
    setDay(day + 1);
  }

  const allTheories = themes.flatMap(t => t.theories);

  return (
    <div className="wf">
      <LayoutGroup>
        {mode === "pin-both" && (
          <>
            <div className="wf-label">Pinned theories</div>
            <div className="wf-row">
              {pinnedTheories.length === 0 && <div className="wf-empty">None</div>}
              {pinnedTheories.map(id => {
                const t = allTheories.find(x => x.id === id)!;
                return <TheoryCard key={id} t={{ ...t, id: `p-${id}` }} pinnable pinned onPin={() => toggle(pinnedTheories, setPinnedTheories, id)} />;
              })}
            </div>
          </>
        )}

        <div className="wf-label">
          {mode === "activity" ? "Active this week" : "Pinned"}
          {mode === "activity" && <button className="wf-btn" onClick={nextDay}>Next day</button>}
        </div>
        {expanded.map(id => {
          const th = themes.find(t => t.id === id)!;
          if (mode !== "pin-both") return <ThemeBlock key={id} th={th} />;
          return (
            <motion.div key={id} layout="position">
              <div className="wf-theme"><strong>{th.name}</strong><span className="wf-mono">{th.signals} signals</span></div>
              <div className="wf-row">
                {th.theories.map(t => <TheoryCard key={t.id} t={t} pinnable pinned={pinnedTheories.includes(t.id)} onPin={() => toggle(pinnedTheories, setPinnedTheories, t.id)} />)}
              </div>
            </motion.div>
          );
        })}

        <div className="wf-label">Moved since yesterday</div>
        <div className="wf-table">
          {themes.filter(t => t.moved).map(t => (
            <div key={t.id} className="wf-tr"><b>{t.name}</b><span className="wf-mono" style={{ gridColumn: "span 3", textAlign: "left" }}>{t.moved}</span></div>
          ))}
        </div>

        <div className="wf-label">All themes</div>
        <div className="wf-table">
          {byActivity.map(t => {
            const pinned = pinnedThemes.includes(t.id);
            return (
              <motion.div layout="position" key={t.id} className={`wf-tr${flash === t.id ? " wf-flash" : ""}`} onAnimationEnd={() => setFlash(undefined)}>
                <span>{t.name}</span>
                <span className="wf-mono">{t.theories.length}</span>
                <span className="wf-mono">{t.last <= 0 ? "today" : `${t.last}d`}</span>
                {mode === "activity" ? <span /> : (
                  <button className="wf-icon" aria-label={pinned ? "Unpin theme" : "Pin theme"} title={pinned ? "Unpin" : "Pin"} aria-pressed={pinned}
                    onClick={() => toggle(pinnedThemes, setPinnedThemes, t.id)}>
                    <PinIcon filled={pinned} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}
