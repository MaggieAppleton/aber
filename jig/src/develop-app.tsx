import { JigPage } from "./jig";
import { AppShell, VIEWS, type View } from "./homes/app-shell";
import "./homes/homes.css";

const ROWS: [string, string][] = [
  ["Views", "Four views of the same theories: Theme sections, Columns, Atlas (side pane) and Timeline (horizon by confidence; drag a card to change either)."],
  ["Switch views", "Icon control bottom-left, opposite the pill, or ⌘1 to ⌘4. Short cross-fade with a slight scale; whatever is open stays open."],
  ["Open an object", "Click a theory, theme heading, territory or pin. It opens in one shared pane docked on the right that slides in from the edge and pushes the view."],
  ["Dump or ask", "Pill and mic bottom-right on every view. Its chip names what you are looking at: the view, or the open object first. Click or ⌘J grows the docked column up from the corner."],
  ["Both open", "Both stay docked. The dump column owns the far-right edge because it grows from the corner pill; the pane narrows and moves left of it, and the view compresses (Timeline scrolls sideways)."],
  ["Esc", "One stack: closes whichever of the pane and the column opened last, then the other. Picking and recording are cancelled first."],
];

export function DevelopAppJig() {
  const q = new URLSearchParams(location.search).get("view");
  const initial = VIEWS.some(v => v.id === q) ? (q as View) : "current";
  return (
    <JigPage title="App" intro={<p>The dump-or-ask pill living with the four views, one shared object pane, and the edits store, in one window.</p>}>
      <div className="as-page">
        <AppShell initial={initial} />
        <table className="hm-where as-where"><tbody>{ROWS.map(([a, b]) => <tr key={a}><th>{a}</th><td>{b}</td></tr>)}</tbody></table>
      </div>
    </JigPage>
  );
}
