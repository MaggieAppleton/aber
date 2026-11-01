import { useState, type ReactNode } from "react";
import { motion, LayoutGroup } from "motion/react";
import { DUMPS, SIGNALS, THEMES, THEORIES, PROTOTYPES, theoriesIn } from "./data";
import { Icon, Conf, DumpIcon, Mark, ProtoGlyph, Pill, type IconName } from "./atoms";
import { lineage, key, type Kind } from "./graph";

type Item = { id: string; body: ReactNode; draft?: boolean };

/** Paradigm: five columns from raw to refined. Selection pulls the lineage to the top of every column. */
export function ColumnsHome() {
  const [sel, setSel] = useState<{ kind: Kind; id: string }>();
  const related = sel ? lineage(sel.kind, sel.id) : undefined;

  const columns: { kind: Kind; icon: IconName; name: string; items: Item[] }[] = [
    { kind: "dump", icon: "dump", name: "Dumps", items: DUMPS.map(d => ({ id: d.id, body: <><span className="col-row"><DumpIcon d={d} /><span className="col-clip">{d.first}</span></span><span className="ap-muted ap-num col-sub">{d.day === "Today" ? d.time : d.day}</span></> })) },
    { kind: "signal", icon: "signal", name: "Signals", items: SIGNALS.map(s => ({ id: s.id, body: <><span className="col-row">{s.day === "Today" && <Mark kind="fresh" />}<span>{s.gist}</span></span><span className="ap-muted col-sub">{s.source}</span></> })) },
    { kind: "theme", icon: "theme", name: "Themes", items: THEMES.map(t => ({ id: t.id, body: <span className="col-row col-spread"><span>{t.name}</span>{theoriesIn(t.id).length === 0 ? <Mark kind="open" /> : <span className="ap-muted ap-num">{t.signals}</span>}</span> })) },
    { kind: "theory", icon: "theory", name: "Theories", items: THEORIES.map(t => ({ id: t.id, draft: t.draft, body: <><span className="col-claim">{t.claim}</span><span className="col-row">{!t.draft && <Conf n={t.confidence} />}{t.challenge && <Mark kind="challenge" />}</span></> })) },
    { kind: "prototype", icon: "prototype", name: "Prototypes", items: PROTOTYPES.map(p => ({ id: p.id, body: <span className="col-row"><ProtoGlyph status={p.status} /><span>{p.name}</span></span> })) },
  ];

  return (
    <div className="ap col" onKeyDown={e => e.key === "Escape" && setSel(undefined)}>
      <LayoutGroup id="columns">
        {columns.map(c => {
          const sorted = related ? [...c.items].sort((a, b) => +related.has(key(c.kind, b.id)) - +related.has(key(c.kind, a.id))) : c.items;
          const count = related ? c.items.filter(i => related.has(key(c.kind, i.id))).length : c.items.length;
          return (
            <section key={c.kind} className="col-col" data-kind={c.kind}>
              <header className="col-head">
                <Icon name={c.icon} size={14} /><span>{c.name}</span>
                <motion.span key={count} className="ap-muted ap-num" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{count}</motion.span>
              </header>
              <div className="col-list ap-scroll">
                {sorted.map(i => {
                  const isSel = sel?.kind === c.kind && sel.id === i.id;
                  const dim = related && !related.has(key(c.kind, i.id));
                  return (
                    <motion.button layout="position" transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      key={i.id} className="col-item" data-sel={isSel ? "" : undefined} data-dim={dim ? "" : undefined} data-draft={i.draft ? "" : undefined}
                      onClick={() => setSel(isSel ? undefined : { kind: c.kind, id: i.id })}>
                      {i.body}
                    </motion.button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </LayoutGroup>
      <Pill sees={sel ? "selection" : "everything"} />
    </div>
  );
}
