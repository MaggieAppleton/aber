import type { ReactNode } from "react";
import { motion } from "motion/react";

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Fades and lifts a piece in on slide entry. Reduced motion is handled by the deck's MotionConfig. */
export function Enter({ delay = 0, y = 12, className, style, children }: { delay?: number; y?: number; className?: string; style?: React.CSSProperties; children: ReactNode }) {
  return (
    <motion.div className={className} style={style} initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay }}>
      {children}
    </motion.div>
  );
}

/** One headline and at most one supporting line. */
export function Copy({ headline, support }: { headline: ReactNode; support?: ReactNode }) {
  return (
    <div className="dk-copy">
      <Enter><h1 className="dk-headline">{headline}</h1></Enter>
      {support && <Enter delay={0.12}><p className="dk-support">{support}</p></Enter>}
    </div>
  );
}
