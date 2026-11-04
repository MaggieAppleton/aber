// Grammar 00: full-size viewer, token strips with live contrast checks, the decide box and the colour dials.
(() => {
  const root = document.documentElement;
  const TYPES = { dump: "tray-arrow-down", signal: "pulse", theme: "binoculars", theory: "target", prototype: "pencil-ruler", tripwire: "signpost" };

  // Full-size viewer
  const viewer = document.getElementById("viewer");
  document.querySelector(".viewer .seg-group").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    viewer.dataset.stage = JSON.stringify({ system: b.value });
    window.AberStage.render(viewer);
  });

  // Strips: labelled swatches resolved inside each system's scope
  const SW = [["--ground", "ground"], ["--ground-2", "sunk"], ["--surface", "surface"], ["--ink", "ink"], ["--ink-2", "ink 2"], ["--ink-3", "ink 3 (lines)"],
    ["--accent", "accent"], ["--accent-text", "accent text"], ["--accent-wash", "accent wash"], ["--primary", "primary"],
    ["--neg", "challenge"], ["--pos", "rose"], ["--fell", "fell"], ["--building", "building"]];
  for (const host of document.querySelectorAll("[data-strip]")) {
    const sys = host.dataset.strip;
    host.innerHTML = `<div data-system="${sys}" class="strip-scope">
      <div class="strip-row">${SW.map(([v, n]) => `<span class="sw"><span style="background:var(${v})"></span><span>${n}</span></span>`).join("")}</div>
      <div class="strip-row">${Object.entries(TYPES).map(([t, i]) => `<span class="sw" data-type="${t}"><span style="background:var(--type-tile);color:var(--type-glyph)"><i class="ph ph-${i}"></i></span><span>${t}</span></span>`).join("")}</div>
      <p class="contrast"></p></div>`;
  }

  // Contrast: resolve each token to sRGB through a canvas, then WCAG ratio
  const cv = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgb = c => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = "#000"; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
  const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = rgb(c); return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const TEXT = [["--ink", "--ground"], ["--ink", "--ground-2"], ["--ink", "--surface"], ["--ink-2", "--ground"], ["--ink-2", "--ground-2"], ["--ink-2", "--surface"],
    ["--accent-text", "--surface"], ["--accent-text", "--accent-wash"], ["--on-primary", "--primary"], ["--neg", "--surface"], ["--pos", "--surface"], ["--fell", "--surface"], ["--building", "--surface"]];
  const check = () => {
    for (const scope of document.querySelectorAll(".strip-scope")) {
      const probe = document.createElement("span"); scope.append(probe);
      const val = v => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
      const fails = [], mins = [];
      for (const [fg, bg] of TEXT) { const r = ratio(val(fg), val(bg)); mins.push(r); if (r < 4.5) fails.push(`${fg.slice(2)} on ${bg.slice(2)} ${r.toFixed(2)}`); }
      for (const t of Object.keys(TYPES)) {
        const el = scope.querySelector(`.sw[data-type="${t}"] span`); const s = getComputedStyle(el);
        const r = ratio(s.color, s.backgroundColor); if (r < 3) fails.push(`${t} glyph on tile ${r.toFixed(2)} (icons need 3:1)`);
      }
      probe.remove();
      scope.querySelector(".contrast").innerHTML = fails.length
        ? `<b>${fails.length} below minimum:</b> <span class="fail">${fails.join("; ")}</span>`
        : `<b>All ${TEXT.length} text pairs ≥ 4.5:1</b> (lowest ${Math.min(...mins).toFixed(2)}); type glyphs ≥ 3:1 on their tiles.`;
    }
  };

  // Decide box
  const paintPick = () => {
    let v = null; try { v = JSON.parse(localStorage.getItem("jig:grammar-00-colour:system"))?.choice; } catch {}
    document.querySelector("[data-pick] .pick").innerHTML = v ? `Current pick: <b>${v}</b>` : "No pick yet";
  };
  document.addEventListener("click", e => { if (e.target.closest(".jig-choose")) setTimeout(paintPick, 0); });

  // Dials
  const DIALS = { neutralTone: { token: "--tone", def: [0, -1, 1, 0.05] }, typeColour: { token: "--type-k", def: [1, 0, 1, 0.05] } };
  const start = () => {
    paintPick(); check();
    if (!window.DialKit) return console.warn("Dial Kit did not load");
    window.DialKit.createDialRoot({ position: "top-right", defaultOpen: matchMedia("(min-width: 1100px)").matches, theme: "light" });
    const config = Object.fromEntries(Object.entries(DIALS).map(([k, d]) => [k, d.def]));
    config.copyValues = { type: "action", label: "Copy values" };
    let current = {};
    const kit = window.DialKit.createDialKit("Colour", config, {
      persist: { key: "grammar-00-colour" },
      onAction: async p => { if (p !== "copyValues") return; const t = Object.entries(DIALS).map(([k, d]) => `${d.token}: ${current[k]};`).join("\n"); try { await navigator.clipboard.writeText(t); } catch { console.log(t); } },
    });
    kit.subscribe(v => { current = v; for (const [k, d] of Object.entries(DIALS)) root.style.setProperty(d.token, v[k]); requestAnimationFrame(check); });
  };
  if (document.readyState === "complete") start(); else addEventListener("load", start);
})();
