// "Main-area inset" dial: the inset of a full view that fills the main area (Briefing and object full views). Inline 44–72 (the title tile hangs 44 into it), default 56; the top inset follows it.
(() => {
  const start = () => {
    if (!window.DialKit) return console.warn("Dial Kit did not load");
    window.DialKit.createDialRoot({ position: "top-right", defaultOpen: false, theme: "light" });
    let v = 56;
    const kit = window.DialKit.createDialKit("Main-area inset", { inline: [56, 44, 72, 4], copyValues: { type: "action", label: "Copy values" } }, {
      onAction: async a => { if (a !== "copyValues") return; const t = `--main-inset-inline: ${v}px; --main-inset-block: ${v}px;`; try { await navigator.clipboard.writeText(t); } catch { console.log(t); } },
    });
    kit.subscribe(x => { v = x.inline; document.documentElement.style.setProperty("--main-inset-inline", `${v}px`); });
  };
  if (document.readyState === "complete") start(); else addEventListener("load", start);
})();
