import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { THEORIES, theme, signalsFor, prototypesFor, type Signal } from "./data";
import { Conf, Mark, IconButton, Pill, ProtoGlyph, Icon } from "./atoms";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Paradigm: a deck. One theory fills the stage; its neighbours wait at the edges. Evidence sits in two stacks. */
export function DeckHome() {
  const [[i, dir], setI] = useState<[number, number]>([0, 0]);
  const go = (d: number) => setI(([x]) => [(x + d + THEORIES.length) % THEORIES.length, d]);
  const t = THEORIES[i];
  const prev = THEORIES[(i - 1 + THEORIES.length) % THEORIES.length], next = THEORIES[(i + 1) % THEORIES.length];
  const ev = signalsFor(t.id);
  const stance = (s: Signal) => s.evidence.find(e => e.theory === t.id)!;

  return (
    <div className="ap dck" tabIndex={0} onKeyDown={e => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }}>
      <div className="dck-dots">{THEORIES.map((x, k) => <button key={x.id} aria-label={x.claim} data-on={k === i ? "" : undefined} data-draft={x.draft ? "" : undefined} onClick={() => setI([k, k > i ? 1 : -1])} />)}</div>
      <button className="dck-peek dck-left" onClick={() => go(-1)} aria-label={`Previous: ${prev.claim}`}><span>{prev.claim}</span></button>
      <button className="dck-peek dck-right" onClick={() => go(1)} aria-label={`Next: ${next.claim}`}><span>{next.claim}</span></button>
      <AnimatePresence mode="popLayout" custom={dir} initial={false}>
        <motion.div key={t.id} className="dck-stage" custom={dir}
          initial={{ x: dir * 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: dir * -120, opacity: 0, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
          transition={{ duration: 0.45, ease: EASE }}>
          <div className="dck-protos">
            {prototypesFor(t.id).map(p => <span key={p.id} className="dck-proto"><ProtoGlyph status={p.status} /><span>{p.name}</span></span>)}
          </div>
          <div className="dck-card" data-draft={t.draft ? "" : undefined}>
            <div className="dck-themes">{t.themes.map(id => <span key={id}>{theme(id).name}</span>)}</div>
            <div className="dck-claim">{t.claim}</div>
            <div className="dck-meta">
              {t.draft
                ? <span className="ap-ghost-actions"><IconButton icon="check" label="Accept" /><IconButton icon="x" label="Discard" /></span>
                : <Conf n={t.confidence} />}
              {t.challenge && <Mark kind="challenge" />}
              {t.pending > 0 && <Mark kind="pending" n={t.pending} />}
              <span className="ap-muted ap-num">{t.horizon}</span>
            </div>
            <p className="dck-body">{t.body}</p>
          </div>
          <div className="dck-evidence">
            {(["supports", "undermines"] as const).map(st => {
              const ss = ev.filter(s => stance(s).stance === st);
              return (
                <div key={st} className="dck-stack" style={{ ["--n" as string]: ss.length }}>
                  <Icon name={st === "supports" ? "arrowUp" : "arrowDown"} size={14} />
                  {ss.map((s, k) => (
                    <div key={s.id} className="dck-sig" data-suggested={stance(s).suggested ? "" : undefined} data-under={k > 0 ? "" : undefined} style={{ ["--k" as string]: k }}>
                      {s.gist}<span className="ap-muted"> {s.source}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
      <Pill sees={t.draft ? "draft" : "Theory"} />
    </div>
  );
}
