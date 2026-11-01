import { JigPage } from "./jig";
import { AtlasDeveloped, type MapStyle } from "./homes/atlas2";
import { useDecisions } from "./store";
import "./homes/homes.css";

const ROWS: [string, string][] = [
  ["Side pane", "The map shrinks to the left and centres on the territory; the theme or theory opens in a pane on the right. Click other landmarks to swap what the pane shows."],
  ["Deep zoom", "Zoom keeps going: map, territory, the territory's page, then a theory. The dots in the top left show how deep you are."],
];

/** Style, how themes read, how overlap reads, how it scales. */
const STYLES: { k: MapStyle; name: string; idea: string; themes: string; overlap: string; scale: string }[] = [
  { k: "circles", name: "Circles", idea: "The current map: one grey disc per theme, sized by its signals.",
    themes: "Grey discs, name at the top", overlap: "Discs overlap; the shared lens is darker", scale: "Clean at any zoom; says little about where signals cluster" },
  { k: "terrain", name: "Terrain", idea: "Signals raise the ground. Themes are hills drawn as contour lines; where two themes share signals they rise into one hill.",
    themes: "Contoured hills, name at the top edge", overlap: "Shared hills merge; no boundary to read", scale: "Contours stay hairline; the field is computed once" },
  { k: "tiles", name: "Tiles", idea: "Every signal is a hex tile, packed around the theory it feeds and tinted by theme.",
    themes: "Tinted clumps of tiles", overlap: "A tile in two themes is split in their two tints", scale: "Countable at any zoom; islands look small zoomed out" },
  { k: "cartographic", name: "Cartographic", idea: "An atlas page: organic territories in calm hues, names set like places, theories like towns, signals as stippling.",
    themes: "Soft-coloured countries, small-caps names", overlap: "Tints multiply where territories cross", scale: "Outlines stay hairline; the look holds from fit to deep zoom" },
];

export function DevelopAtlasJig() {
  const { decisions, update } = useDecisions();
  const picked = decisions["atlas-style"]?.choice;
  return (
    <JigPage title="Atlas, developed"
      intro={<>
        <p>Two ways to open a territory or landmark to read and write it without losing the map. Esc steps back one level in each.</p>
        <table className="hm-where" style={{ marginTop: 8 }}><tbody>{ROWS.map(([a, b]) => <tr key={a}><th style={{ width: 160 }}>{a}</th><td>{b}</td></tr>)}</tbody></table>
      </>}>
      <section className="hm" id="style">
        <div className="hm-head"><div className="hm-head-text"><h2>Map style</h2><p>Four looks for the same map, data and interactions. Blue is new, red is a challenge, dashed is a draft in every one.</p></div></div>
        <table className="hm-where">
          <thead><tr><th>Style</th><th>How themes read</th><th>How overlap reads</th><th>Scale</th></tr></thead>
          <tbody>{STYLES.map(s => <tr key={s.k}><th style={{ width: 120 }}>{s.name}</th><td>{s.themes}</td><td>{s.overlap}</td><td>{s.scale}</td></tr>)}</tbody>
        </table>
      </section>
      {STYLES.map(s => (
        <section key={s.k} className="hm" id={`style-${s.k}`}>
          <div className="hm-head">
            <div className="hm-head-text"><h2>{s.name}{s.k === "circles" ? ", current" : ""}</h2><p>{s.idea}</p></div>
            <button className="jig-choose" aria-pressed={picked === s.k} onClick={() => update("atlas-style", { choice: picked === s.k ? undefined : s.k })}>{picked === s.k ? "Picked" : "Pick"}</button>
          </div>
          <div className="hm-frame" data-style-frame={s.k}><AtlasDeveloped variant="side" mapStyle={s.k} /></div>
        </section>
      ))}
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
