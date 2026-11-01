import type { ReactNode } from "react";
import { Icon } from "./atoms";

export type Stance = "supports" | "undermines";

/**
 * A signal inside a suggestion or a challenge ("option D · mini signal card"): a small card of its own, dashed because
 * it is proposed and not yet mine. A round well holds the signal's Pulse icon; the gist sits in full ink with its
 * source below; the stance is a tag on the right. Icon, text and tag share a top edge. `children` sit under the
 * source (a decision, say), and `aside` under the tag (actions, which live bottom right).
 */
export function SignalCard({ gist, source, stance, decided, children, aside, className }: {
  gist: ReactNode; source?: ReactNode; stance?: Stance; decided?: boolean; children?: ReactNode; aside?: ReactNode; className?: string;
}) {
  return <span className={`ab-sigcard${className ? ` ${className}` : ""}`} data-decided={decided ? "" : undefined}>
    <span className="ab-sigcard-well" aria-hidden><Icon name="signal" size={14} /></span>
    <span className="ab-sigcard-text">
      <span className="ab-sigcard-gist">{gist}</span>
      {source && <span className="ab-sigcard-src">{source}</span>}
      {children}
    </span>
    {(stance || aside) && <span className="ab-sigcard-side">
      {stance && <span className="ab-sigcard-tag"><Icon name={stance === "supports" ? "arrowUp" : "arrowDown"} size={12} />{stance === "supports" ? "Supports" : "Undermines"}</span>}
      {aside}
    </span>}
  </span>;
}
