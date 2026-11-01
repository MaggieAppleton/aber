import { motion } from "motion/react";
import { Copy, EASE } from "../parts";

export const notes = `Agents are genuinely good at the sorting: transcribing memos, filing links, spotting repeats. The trouble starts when they write the claim for you. It comes back fluent and confident, it sounds better than what you wrote, and quietly it stops being your thinking.`;

const BEAT = 1.1;

export default function RewriteSlide() {
  return (
    <div className="dk-slide">
      <Copy headline="Agents can sort the pile. They shouldn't think for me." support="When an agent writes the claim, it sounds right, and it isn't mine any more." />
      <div className="dk-visual">
        <motion.div
          className="dk-card dk-note"
          style={{ top: 184 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
        >
          <div className="dk-field">
            <p className="dk-meta">What I wrote</p>
            <div className="dk-mine">
              <motion.p className="dk-mine-text" style={{ textDecorationLine: "line-through", textDecorationThickness: 2 }}
                initial={{ color: "#1a211e", textDecorationColor: "rgba(134, 142, 139, 0)" }}
                animate={{ color: "#868e8b", textDecorationColor: "rgba(134, 142, 139, 1)" }} transition={{ duration: 0.4, delay: BEAT + 0.3 }}>
                small teams will start making their own tools instead of buying them? the cost thing feels like it changes everything
              </motion.p>
            </div>
          </div>
          <motion.div
            className="dk-agent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: BEAT + 0.5 }}
          >
            <div className="dk-who"><span className="dk-who-mark" />Rewritten by agent</div>
            <p className="dk-agent-text">Enterprise SaaS will fragment into bespoke, AI-generated internal tools within 24 months as development costs collapse.</p>
            <div><span className="dk-chip">Confidence: high</span></div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
