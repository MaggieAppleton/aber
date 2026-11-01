import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";
import { DecisionsJig } from "./decisions";
import { BoardsJig } from "./boards";
import { ObjectsJig } from "./objects";
import { HomesJig } from "./homes";
import { DevelopColumnsJig } from "./develop-columns";
import { DevelopAtlasJig } from "./develop-atlas";
import { DevelopPillJig } from "./develop-pill";
import { DevelopAppJig } from "./develop-app";
import { DevelopTimelineJig } from "./develop-timeline";
import { DevelopDetailsJig } from "./develop-details";
import { DevelopIconsJig } from "./develop-icons";
import { DevelopDecideJig } from "./develop-decide";
import { ReferenceJig } from "./reference";
import "./jig.css";
import "./minis/wf.css";

const JIGS = {
  reference: { title: "Reference (start here)", view: ReferenceJig },
  app: { title: "App (canonical)", view: DevelopAppJig },
  decide: { title: "Decide", view: DevelopDecideJig },
  details: { title: "Pane details", view: DevelopDetailsJig },
  icons: { title: "Icons", view: DevelopIconsJig },
  timeline: { title: "Timeline", view: DevelopTimelineJig },
  pill: { title: "Dump or ask", view: DevelopPillJig },
  atlas: { title: "Atlas, developed", view: DevelopAtlasJig },
  columns: { title: "Columns, developed", view: DevelopColumnsJig },
  homes: { title: "Homepages", view: HomesJig },
  objects: { title: "Objects and how many there are", view: ObjectsJig },
  decisions: { title: "Open questions (parked until the shape is chosen)", view: DecisionsJig },
  boards: { title: "Space and motion boards", view: BoardsJig },
};

function App() {
  const id = location.pathname.replace(/^\/|\/$/g, "") as keyof typeof JIGS;
  const jig = JIGS[id];
  return (
    <>
      {jig ? <jig.view /> : (
        <main className="jig">
          <header className="jig-header"><h1>Aber jigs</h1></header>
          <nav className="jig-index">
            {Object.entries(JIGS).map(([key, { title }]) => <a key={key} href={`/${key}`}>{title}</a>)}
          </nav>
        </main>
      )}
      <Agentation appName={`Aber jig: ${jig?.title ?? "index"}`} />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
