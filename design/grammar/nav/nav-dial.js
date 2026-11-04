// "Type rail width" dial: sets --nv-rail-w on the page root, so every type-first window follows. Default 160 (was 200, 20% narrower).
(() => {
  const start = () => {
    if (!window.DialKit) return console.warn("Dial Kit did not load");
    window.DialKit.createDialRoot({ position: "top-right", defaultOpen: false, theme: "light" });
    let w = 160;
    const kit = window.DialKit.createDialKit("Navigation", { typeRailWidth: [160, 120, 220, 4], copyValues: { type: "action", label: "Copy values" } }, {
      onAction: async p => { if (p !== "copyValues") return; const t = `--nv-rail-w: ${w}px;`; try { await navigator.clipboard.writeText(t); } catch { console.log(t); } },
    });
    kit.subscribe(v => { w = v.typeRailWidth; document.documentElement.style.setProperty("--nv-rail-w", `${w}px`); });
  };
  if (document.readyState === "complete") start(); else addEventListener("load", start);
})();
