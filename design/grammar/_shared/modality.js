// Input modality: focus rings only for keyboard interaction (proposed amendment to 05, from 14).
// Sets <html data-input="keyboard" | "pointer">: a key press (not a lone modifier) makes it keyboard; a pointer press or a pointer moving
// over the page makes it pointer. Rings show only on :focus-visible while the modality is keyboard, so a click, a hover, or focus
// moved in code after a click never shows one. Text fields keep their caret state (05: a field shows focus while it has the caret).
// Every grammar page should load it: <script src="../_shared/modality.js" defer></script>
(() => {
  const root = document.documentElement;
  const set = v => { if (root.dataset.input !== v) root.dataset.input = v; };
  addEventListener("keydown", e => { if (!["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key)) set("keyboard"); }, true);
  addEventListener("pointerdown", () => set("pointer"), true);
  addEventListener("pointermove", e => { if (e.movementX || e.movementY) set("pointer"); }, true);
  const style = document.createElement("style");
  style.textContent = `html:not([data-input="keyboard"]) :focus-visible:not(input, textarea, select, [contenteditable]) { outline: none !important; }`;
  document.head.append(style);
})();
