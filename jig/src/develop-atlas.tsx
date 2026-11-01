import { JigPage } from "./jig";
import { AtlasDeveloped, type MapStyle, type Treatment } from "./homes/atlas2";
import { useDecisions } from "./store";
import "./homes/homes.css";

const ROWS: [string, string][] = [
  ["Side pane", "The map shrinks to the left and centres on the territory; the theme or theory opens in a pane on the right. Click other landmarks to swap what the pane shows."],
  ["Deep zoom", "Zoom keeps going: map, territory, the territory's page, then a theory. The dots in the top left show how deep you are."],
];

/** Frames two to a row: wide enough that the fitted map keeps its territory names (scale ≥ 0.55). */
const SIZE = { w: 684, h: 440, mapw: 284 };

const STRUCTURES: { k: MapStyle; name: string; idea: string }[] = [
  { k: "circles", name: "Circles", idea: "One disc per theme, sized by its signals; overlaps share a lens." },
  { k: "terrain", name: "Terrain", idea: "Signals raise the ground; themes are contoured hills that merge where they share signals." },
];

/** The same four treatments apply to either structure. */
const TREATMENTS: { k: Treatment; name: string; ground: string; territories: string; dots: string; pins: string; labels: string }[] = [
  { k: "paper", name: "Paper", ground: "Warm paper", territories: "Flat grey tint, soft tone-on-tone edge, overlaps step darker",
    dots: "Plain grey dots", pins: "Solid ink disc, paper halo", labels: "Paper chip" },
  { k: "fine", name: "Fine line", ground: "White", territories: "No fill, hairline ink edge; overlaps read as crossing lines",
    dots: "Smaller, darker, denser", pins: "Ink ring; fills solid when selected", labels: "No chip, white text halo" },
  { k: "graphite", name: "Graphite", ground: "Cool grey", territories: "Flat cool tint, rim shading sinks each disc (soft occlusion where they cross), inner line. Terrain: double coastline, stepped tones",
    dots: "Tiny crosses", pins: "Square", labels: "White chip, small-caps names" },
  { k: "night", name: "Night", ground: "Ink", territories: "Soft glow at the centre fading to the rim, tone-on-tone edge. Terrain: light stepped tones",
    dots: "Soft light dots; new a brighter blue", pins: "Light disc, ink halo", labels: "Ink chip, light text" },
];

export function DevelopAtlasJig() {
  const { decisions, update } = useDecisions();
  const picked = decisions["atlas-treatment"]?.choice;
  return (
    <JigPage title="Atlas, developed"
      intro={<>
        <p>Two ways to open a territory or landmark to read and write it without losing the map. Esc steps back one level in each.</p>
        <table className="hm-where" style={{ marginTop: 8 }}><tbody>{ROWS.map(([a, b]) => <tr key={a}><th style={{ width: 160 }}>{a}</th><td>{b}</td></tr>)}</tbody></table>
      </>}>
      <section className="hm" id="treatment">
        <div className="hm-head"><div className="hm-head-text"><h2>Map treatment</h2><p>Four surfaces for either structure: same data, layout, stacking and camera. Blue is new, red is a challenge, dashed is a draft in every one. Paper is the current look.</p></div></div>
        <table className="hm-where">
          <thead><tr><th>Treatment</th><th>Background</th><th>Territories</th><th>Dots</th><th>Pins</th><th>Labels</th></tr></thead>
          <tbody>{TREATMENTS.map(t => <tr key={t.k}><th style={{ width: 100 }}>{t.name}</th><td>{t.ground}</td><td>{t.territories}</td><td>{t.dots}</td><td>{t.pins}</td><td>{t.labels}</td></tr>)}</tbody>
        </table>
      </section>
      {STRUCTURES.map(st => (
        <section key={st.k} className="hm" id={`treatment-${st.k}`}>
          <div className="hm-head"><div className="hm-head-text"><h2>{st.name}</h2><p>{st.idea}</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, ${SIZE.w}px)`, gap: "20px 8px" }}>
            {TREATMENTS.map(t => {
              const k = `${st.k}:${t.k}`, on = picked === k;
              return (
                <div key={t.k} style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingInline: 2 }}>
                    <strong style={{ fontWeight: 600 }}>{t.name}</strong>
                    <button className="jig-choose" aria-pressed={on} aria-label={`Pick ${st.name}, ${t.name}`} onClick={() => update("atlas-treatment", { choice: on ? undefined : k })}>{on ? "Picked" : "Pick"}</button>
                  </div>
                  <div className="hm-frame" data-treatment-frame={k} style={{ padding: 0, overflow: "visible" }}><AtlasDeveloped variant="side" mapStyle={st.k} treatment={t.k} size={SIZE} /></div>
                </div>
              );
            })}
          </div>
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
