// "Card inset" dial: inline 8–12; block is always inline − 2 (proposed amendment to 01 Spacing). Default 10 / 8.
(() => {
  const start = () => {
    if (!window.DialKit) return console.warn("Dial Kit did not load");
    window.DialKit.createDialRoot({ position: "top-right", defaultOpen: false, theme: "light" });
    let v = 10;
    const kit = window.DialKit.createDialKit("Card inset", { inline: [10, 8, 12, 1], copyValues: { type: "action", label: "Copy values" } }, {
      onAction: async a => { if (a !== "copyValues") return; const t = `--card-inline: ${v}px; --card-block: ${v - 2}px;`; try { await navigator.clipboard.writeText(t); } catch { console.log(t); } },
    });
    kit.subscribe(x => { v = x.inline; document.documentElement.style.setProperty("--card-inline", `${v}px`); });
  };
  if (document.readyState === "complete") start(); else addEventListener("load", start);
})();
