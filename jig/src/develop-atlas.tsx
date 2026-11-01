import { JigPage } from "./jig";
import { AtlasDeveloped } from "./homes/atlas2";
import "./homes/homes.css";

const ROWS: [string, string][] = [
  ["Side pane", "The map shrinks to the left and centres on the territory; the theme or theory opens in a pane on the right. Click other landmarks to swap what the pane shows."],
  ["Deep zoom", "Zoom keeps going: map, territory, the territory's page, then a theory. The dots in the top left show how deep you are."],
];

export function DevelopAtlasJig() {
  return (
    <JigPage title="Atlas, developed"
      intro={<>
        <p>Two ways to open a territory or landmark to read and write it without losing the map. Esc steps back one level in each.</p>
        <table className="hm-where" style={{ marginTop: 8 }}><tbody>{ROWS.map(([a, b]) => <tr key={a}><th style={{ width: 160 }}>{a}</th><td>{b}</td></tr>)}</tbody></table>
      </>}>
      <section className="hm" id="side">
        <div className="hm-head"><div className="hm-head-text"><h2>Side pane</h2><p>The map stays live beside what you are reading, so moving between neighbours is one click.</p></div></div>
        <div className="hm-frame"><AtlasDeveloped variant="side" /></div>
      </section>
      <section className="hm" id="deep">
        <div className="hm-head"><div className="hm-head-text"><h2>Deep zoom</h2><p>Reading and writing are just deeper zoom levels of the same map.</p></div></div>
        <div className="hm-frame"><AtlasDeveloped variant="deep" /></div>
      </section>
    </JigPage>
  );
}
