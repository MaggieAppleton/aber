import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";
import { DevelopAppJig } from "./develop-app";
import { DevelopIconsJig } from "./develop-icons";
import { ReferenceJig } from "./reference";
import { Deck } from "./deck/deck";
import "./jig.css";
import "./minis/wf.css";

const JIGS = {
  reference: { title: "Reference (start here)", view: ReferenceJig },
  deck: { title: "Talk deck", view: Deck },
  app: { title: "App (canonical)", view: DevelopAppJig },
  icons: { title: "Icons", view: DevelopIconsJig },
};

const LOCAL = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(location.hostname);

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
      {/* Only on a local machine, and hidden on the talk deck unless ?feedback is in the URL. */}
      {LOCAL && (id !== "deck" || new URLSearchParams(location.search).has("feedback")) && <Agentation appName={`Aber jig: ${jig?.title ?? "index"}`} />}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
