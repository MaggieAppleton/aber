// "Theories column width" dial: sets --list-w (stage.css) on the page root, so every stage on the page follows.
// The default is the app's own width (296, measured in jig /app at 1440). Needs Dial Kit's vanilla bundle on the page.
(() => {
  const start = () => {
    if (!window.DialKit) return console.warn("Dial Kit did not load");
    window.DialKit.createDialRoot({ position: "top-right", defaultOpen: false, theme: "light" });
    let w = 296;
    const kit = window.DialKit.createDialKit("Layout", { theoriesColumn: [296, 240, 420, 4], copyValues: { type: "action", label: "Copy values" } }, {
      onAction: async p => { if (p !== "copyValues") return; const t = `--list-w: ${w}px;`; try { await navigator.clipboard.writeText(t); } catch { console.log(t); } },
    });
    kit.subscribe(v => { w = v.theoriesColumn; document.documentElement.style.setProperty("--list-w", `${w}px`); });
  };
  if (document.readyState === "complete") start(); else addEventListener("load", start);
})();
