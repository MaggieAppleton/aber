// Agentation for plain-HTML grammar jigs: click an element, comment on it, copy the comments for the agent.
// Usage: <script type="module" src="../_shared/agentation.js" data-app-name="Grammar 1: Foundations"></script>
// Mounts only on localhost. React, ReactDOM and agentation come from esm.sh, pinned to jig/package.json,
// with ?deps= so all three share one React.
const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
const REACT = "19.3.1";
const AGENTATION = "3.1.2";
const deps = `?deps=react@${REACT},react-dom@${REACT}`;

if (LOCAL) {
  const appName = document.currentScript?.dataset.appName
    || document.querySelector('script[src$="agentation.js"]')?.dataset.appName
    || document.title;
  try {
    const [React, { createRoot }, { Agentation }] = await Promise.all([
      import(`https://esm.sh/react@${REACT}`),
      import(`https://esm.sh/react-dom@${REACT}/client${deps}`),
      import(`https://esm.sh/agentation@${AGENTATION}${deps}`),
    ]);
    const host = document.createElement("div");
    host.id = "agentation-root";
    document.body.append(host);
    createRoot(host).render(React.createElement(Agentation, { appName }));
  } catch (err) {
    console.warn("Agentation did not load from esm.sh", err);
  }
}
