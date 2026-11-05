// "Main-area inset" dial: the inset of a full view that fills the main area (Briefing and object full views). Inline 44–120 (the title tile hangs 44 into it), default 88; the top stays 48.
(() => {
  const start = () => {
    if (!window.DialKit) return console.warn("Dial Kit did not load");
    window.DialKit.createDialRoot({ position: "top-right", defaultOpen: false, theme: "light" });
    let v = 88;
    const kit = window.DialKit.createDialKit("Main-area inset", { inline: [88, 44, 120, 4], copyValues: { type: "action", label: "Copy values" } }, {
      onAction: async a => { if (a !== "copyValues") return; const t = `--main-inset-inline: ${v}px; --main-inset-block: 48px;`; try { await navigator.clipboard.writeText(t); } catch { console.log(t); } },
    });
    kit.subscribe(x => { v = x.inline; document.documentElement.style.setProperty("--main-inset-inline", `${v}px`); });
  };
  if (document.readyState === "complete") start(); else addEventListener("load", start);
})();
