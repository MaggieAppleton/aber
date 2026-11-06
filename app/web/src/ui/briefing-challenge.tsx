import { useId } from "react";
import { world, type Row } from "../data/live";
import { useIsPresent } from "motion/react";
import { SIGNALS } from "./data";
import { Meter, Tile } from "./atoms";
import { RelRow, type OnOpen } from "./panes";
import { openObject } from "../app/dialogs";
import { briefingChallenge } from "./briefing-challenge-state";
import "./briefing-challenge.css";

/** The solid subject owns the tripwire; only the proposed change has a dashed edge. */
export function BriefingChallenge({ suggestion, onOpen, onDecide, busy, error }: {
  suggestion: Row; onOpen: OnOpen; onDecide: (decision: "accepted" | "discarded") => void; busy?: boolean; error?: string;
}) {
  const { theory, signal, level, to, blocked, unavailable, reason } = briefingChallenge(suggestion);
  const id = useId();
  const present = useIsPresent();
  const accepted = !present && world.suggestions.some(row => row.id === suggestion.id && row.status === "accepted");
  const source = SIGNALS.find(row => row.id === signal?.id)?.source;
  return <article className="br-challenge" data-accepted={accepted ? "" : undefined} aria-label={`Challenge: ${theory?.claim ?? "Unavailable theory"}`} aria-busy={busy}>
    <div className="br-ch-subject"><RelRow kind="theory" id={theory?.id} name={theory?.claim ?? "Theory unavailable"} rk={<Meter n={level}/>} onClick={() => theory && onOpen("theory", theory.id)}/></div>
    <div className="br-ch-tripwire"><Tile kind="tripwire"/><p>{theory?.tripwire}</p></div>
    <div className="br-ch-proposal" data-suggestion-id={suggestion.id}>
      <div className="br-ch-label">Tripped by a new signal</div>
      {reason && <p className="br-ch-reason">{reason}</p>}
      <div className="br-ch-signal"><RelRow kind="signal" id={signal?.id} name={signal?.gist ?? "Signal unavailable"} kv={source} onClick={() => signal && openObject("signal", signal.id)}/></div>
      <div className="br-ch-footer">
        {level !== undefined && level > 1 && <p className="br-ch-change"><span className="br-ch-marks" aria-hidden>{[1,2,3,4,5].map(n => <i key={n} data-on={n <= to! ? "" : undefined} data-gone={n === level ? "" : undefined}/>)}</span><span>I suggest lowering confidence from {level} to {to}</span></p>}
        <span className="ab-decide">
          <button type="button" className="ab-btn secondary" aria-disabled={busy || unavailable || undefined} aria-describedby={unavailable || error ? id : undefined} onClick={() => { if (!busy && !unavailable) onDecide("discarded"); }}>Keep confidence</button>
          <button type="button" className="ab-btn primary" aria-disabled={busy || !!blocked || undefined} aria-describedby={blocked || error ? id : undefined} aria-keyshortcuts="A" title="Lower confidence (A)" onClick={() => { if (!busy && !blocked) onDecide("accepted"); }}>Lower to {to ?? "…"}</button>
        </span>
      </div>
      {(blocked || error) && <p id={id} className="br-ch-message" role={error ? "alert" : "status"}>{error || blocked}</p>}
      {busy && <span className="br-ch-message" role="status">Saving decision…</span>}
    </div>
  </article>;
}
