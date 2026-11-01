import { Copy, Enter } from "../../parts";
import { Icon } from "../../../homes/atoms";

export const notes = `The rule that holds it together: agents can make their own drafts and do anything to them, but to my things they can only propose. They transcribe, file and draft overnight. If they think a signal undermines one of my theories, it shows up as a dashed suggestion I accept or throw away. They never touch my confidence, because the whole point is that the number is mine.`;

export default function AuthoritySlide() {
  return (
    <div className="dk-slide a12-top">
      <Copy headline="Agents draft and propose. I decide." support="They can do anything to their own drafts. To mine, they can only suggest." />
      <div className="a12-groups">
        <Enter delay={0.3} className="a12-group">
          <p className="dk-meta">Agents do</p>
          <div className="a12-frag">
            <p className="a12-inline dk-meta"><Icon name="wave" size={18} />Voice note, 4 min</p>
            <p className="a12-inline"><Icon name="split" size={18} />Split into 3 signals</p>
            <p className="a12-inline"><Icon name="theme" size={18} />Filed under Agent memory</p>
            <p className="a12-inline"><Icon name="merge" size={18} />Merged a duplicate<span className="a12-undo"><Icon name="undo" size={16} /></span></p>
          </div>
        </Enter>
        <Enter delay={0.45} className="a12-group">
          <p className="dk-meta">Agents propose</p>
          <div className="a12-frag a12-sugg">
            <p className="a12-inline a12-neg"><Icon name="arrowDown" size={18} />Undermines</p>
            <p className="dk-strong">Memory feature withdrawn after privacy complaints</p>
            <p className="dk-meta">On Agents keep context across months</p>
            <div className="a12-acts"><span className="a12-btn">Accept</span><span className="a12-btn a12-btn-quiet">Dismiss</span></div>
          </div>
        </Enter>
        <Enter delay={0.6} className="a12-group">
          <p className="a12-jade">Only me</p>
          <div className="a12-frag">
            <p className="dk-meta">Confidence</p>
            <span className="a12-steps-ctl">{[1, 2, 3, 4, 5].map(i => <i key={i} data-on={i <= 3 ? "" : undefined} data-focus={i === 3 ? "" : undefined} />)}</span>
            <p className="a12-inline"><span className="a12-fell"><Icon name="arrowDown" size={18} />3</span>Lowered, with a note</p>
          </div>
          <p className="dk-meta a12-never">Agents never set it, edit my theories or delete anything.</p>
        </Enter>
      </div>
    </div>
  );
}
