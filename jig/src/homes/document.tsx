import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { THEMES, theoriesIn, signalsFor, prototypesFor, type Theory } from "./data";
import { Conf, Mark, Icon, IconButton, Pill, ProtoGlyph } from "./atoms";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Paradigm: one long document of what you currently think. Evidence lives in the margin. */
export function DocumentHome() {
  const [focus, setFocus] = useState<string>();
  const [settled, setSettled] = useState<Record<string, "accepted" | "discarded">>({});

  return (
    <div className="ap doc">
      <nav className="doc-outline">
        {THEMES.map(t => (
          <a key={t.id} href={`#doc-${t.id}`} title={t.name} onClick={e => { e.preventDefault(); document.getElementById(`doc-${t.id}`)?.scrollIntoView({ behavior: "smooth" }); }}>
            <span className="doc-tick" style={{ width: 6 + theoriesIn(t.id).length * 5 }} />
            <span className="doc-outline-name">{t.name}</span>
            {theoriesIn(t.id).length === 0 ? <Mark kind="open" /> : t.fresh > 0 && <Mark kind="fresh" />}
          </a>
        ))}
      </nav>
      <div className="doc-page ap-scroll">
        <div className="doc-body">
          <h1 className="doc-title">What I think will happen</h1>
          {THEMES.map(th => {
            const ts = theoriesIn(th.id).filter(t => settled[t.id] !== "discarded");
            return (
              <section key={th.id} id={`doc-${th.id}`} className="doc-section">
                <h2 className="doc-h2">{th.name}{ts.length === 0 && <IconButton icon="plus" label="State a theory" />}</h2>
                {ts.map(t => (
                  <Para key={t.id} t={t} focused={focus === t.id} onFocus={() => setFocus(t.id)} onBlur={() => setFocus(f => f === t.id ? undefined : f)}
                    accepted={settled[t.id] === "accepted"} onSettle={s => setSettled({ ...settled, [t.id]: s })} />
                ))}
              </section>
            );
          })}
          <div style={{ height: 120 }} />
        </div>
      </div>
      <Pill sees="document" />
    </div>
  );
}

function Para({ t, focused, onFocus, onBlur, accepted, onSettle }: {
  t: Theory; focused: boolean; onFocus: () => void; onBlur: () => void; accepted: boolean; onSettle: (s: "accepted" | "discarded") => void;
}) {
  const ev = signalsFor(t.id);
  const protos = prototypesFor(t.id);
  const draft = t.draft && !accepted;
  return (
    <motion.div layout transition={{ duration: 0.3, ease: EASE }} className="doc-para" data-draft={draft ? "" : undefined} data-focus={focused ? "" : undefined}
      onPointerEnter={onFocus} onPointerLeave={onBlur}>
      <p>
        <strong>{t.claim}.</strong> {t.body}
        {protos.map(p => <span key={p.id} className="doc-proto"><ProtoGlyph status={p.status} /><span className="doc-proto-name">{p.name}</span></span>)}
      </p>
      <div className="doc-gutter">
        {!draft && <Conf n={t.confidence ?? 3} />}
        {t.challenge && <Mark kind="challenge" />}
        {draft && (
          <span className="ap-ghost-actions">
            <IconButton icon="check" label="Accept (A)" onClick={() => onSettle("accepted")} />
            <IconButton icon="x" label="Discard (X)" onClick={() => onSettle("discarded")} />
          </span>
        )}
      </div>
      <aside className="doc-margin">
        {!focused && ev.length > 0 && (
          <span className="doc-ticks" aria-label={`${ev.length} signals`}>
            {ev.map(s => <i key={s.id} data-stance={s.evidence.find(e => e.theory === t.id)!.stance} data-suggested={s.evidence.find(e => e.theory === t.id)!.suggested ? "" : undefined} />)}
          </span>
        )}
        <AnimatePresence>
          {focused && ev.map((s, i) => {
            const e = s.evidence.find(x => x.theory === t.id)!;
            return (
              <motion.div key={s.id} className="doc-note" data-suggested={e.suggested ? "" : undefined}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.3, ease: EASE } }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
                <Icon name={e.stance === "supports" ? "arrowUp" : "arrowDown"} size={12} />
                <span>{s.gist}<span className="ap-muted"> {s.source}</span></span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </aside>
    </motion.div>
  );
}
