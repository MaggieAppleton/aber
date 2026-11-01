import { JigPage } from "./jig";
import { ColumnsDeveloped } from "./homes/columns2";
import "./homes/homes.css";

const ROWS: [string, string][] = [
  ["Open a theme, theory or prototype", "It opens into a wide pane on the right. Its own column stays so you can step between siblings; every other column folds to a rail showing how many related items it holds."],
  ["Unfold a signal or dump", "It expands in place: a note field, the theories it bears on, its themes, the dump it came from. Every link inside is a way across."],
  ["Fold a column", "Hover a column header for the fold control. Rails keep a 44px strip with an icon; dots remove the column entirely and leave a toggle in the floating cluster."],
  ["Lineage", "Whatever is open or unfolded pulls its relatives to the top of every column and dims the rest. Rails and dots show the related count."],
];

export function DevelopColumnsJig() {
  return (
    <JigPage title="Columns, developed"
      intro={<>
        <p>Stocks open into space; flows unfold in place. Dumps and signals start folded. Try: open a theory, follow an evidence link, unfold a signal, then click its dump chip.</p>
        <table className="hm-where" style={{ marginTop: 8 }}><tbody>{ROWS.map(([a, b]) => <tr key={a}><th style={{ width: 220 }}>{a}</th><td>{b}</td></tr>)}</tbody></table>
      </>}>
      <section className="hm" id="rails">
        <div className="hm-head"><div className="hm-head-text"><h2>A. Fold to rails</h2><p>Folded columns stay as narrow rails at their place in the order, so the left-to-right story from raw to refined is always visible.</p></div></div>
        <div className="hm-frame"><ColumnsDeveloped fold="rails" /></div>
      </section>
      <section className="hm" id="dots">
        <div className="hm-head"><div className="hm-head-text"><h2>B. Fold to dots</h2><p>Folded columns vanish; a floating cluster of icon dots in the top left toggles them. More room, less sense of order.</p></div></div>
        <div className="hm-frame"><ColumnsDeveloped fold="dots" /></div>
      </section>
    </JigPage>
  );
}
