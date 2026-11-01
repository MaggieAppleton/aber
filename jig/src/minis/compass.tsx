import { useState } from "react";

export type CompassLayout = "keep" | "rivals-beside" | "protos-right";

type Dir = { key: string; label: string; items: { text: string; draft?: boolean }[] };

const D: Record<string, Dir> = {
  protos: { key: "protos", label: "↑ Prototypes", items: [{ text: "Token budget meter" }] },
  causes: { key: "causes", label: "← Follows from", items: [{ text: "Inference hardware keeps getting cheaper" }] },
  effects: { key: "effects", label: "Consequences →", items: [{ text: "Agents run in the background by default" }, { text: "Software priced per outcome", draft: true }] },
  evidence: { key: "evidence", label: "↓ Evidence", items: [{ text: "Lab cuts API prices again" }, { text: "Frontier training costs keep rising" }] },
  rivals: { key: "rivals", label: "Rival", items: [{ text: "Intelligence becomes scarce" }] },
  protosR: { key: "protos", label: "Prototypes →", items: [{ text: "Token budget meter" }] },
};

export function CompassMini({ layout }: { layout: CompassLayout }) {
  const [hot, setHot] = useState<string>();

  const cell = (d: Dir, area: string) => (
    <div className="cp-cell" style={{ gridArea: area }} data-hot={hot === d.key ? "" : undefined}
      onPointerEnter={() => setHot(d.key)} onPointerLeave={() => setHot(undefined)}>
      <div className="wf-label">{d.label}</div>
      {d.items.map(i => <div key={i.text} className={`wf-card cp-item${i.draft ? " wf-draft" : ""}`}><b>{i.text}</b></div>)}
    </div>
  );

  const areas = {
    keep: `". protos ." "causes claim effects" ". evidence ."`,
    "rivals-beside": `". protos . ." "causes claim rivals effects" ". evidence . ."`,
    "protos-right": `". . ." "causes claim effects" ". evidence protosR"`,
  }[layout];

  return (
    <div className="wf cp" style={{ gridTemplateAreas: areas, gridTemplateColumns: layout === "rivals-beside" ? "1fr 1.4fr 0.9fr 1fr" : "1fr 1.4fr 1fr" }}>
      {layout !== "protos-right" && cell(D.protos, "protos")}
      {layout === "protos-right" && cell(D.protosR, "protosR")}
      {cell(D.causes, "causes")}
      {cell(D.effects, "effects")}
      {cell(D.evidence, "evidence")}
      {layout === "rivals-beside" && cell(D.rivals, "rivals")}
      <div className="cp-claim" style={{ gridArea: "claim" }}>
        {layout === "keep" && (
          <div className="cp-rival" data-hot={hot === "rivals" ? "" : undefined}
            onPointerEnter={() => setHot("rivals")} onPointerLeave={() => setHot(undefined)}>
            Rival: Intelligence becomes scarce
          </div>
        )}
        <div className="cp-card"><b>Tokens become nearly free</b><span className="wf-mono">Confidence 3 of 5</span></div>
      </div>
    </div>
  );
}
