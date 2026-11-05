// Grammar 14 page: the phone demo. On touch a tethered menu becomes a bottom sheet (04 rule 10): grab handle, items 44, focus returns to the trigger.
(() => {
  const start = () => {
    const phone = document.getElementById("phone"), trig = document.getElementById("ph-retire"); if (!phone || !trig) return;
    const reasons = ["Disproven", "Superseded", "Abandoned"];
    let sheet = null, scrim = null;
    const close = (back = true) => {
      if (!sheet) return; const s = sheet, c = scrim; sheet = scrim = null;
      s.classList.add("out"); c.classList.add("out"); setTimeout(() => { s.remove(); c.remove(); }, 170);
      trig.setAttribute("aria-expanded", "false"); if (back) trig.focus();
    };
    trig.addEventListener("click", () => {
      if (sheet) return close();
      scrim = document.createElement("div"); scrim.className = "mn-scrim"; scrim.addEventListener("click", () => close());
      sheet = document.createElement("div"); sheet.className = "mn-sheet"; sheet.setAttribute("role", "menu"); sheet.setAttribute("aria-label", "Retire");
      sheet.innerHTML = `<span class="grab" aria-hidden="true"></span><div class="mn-label" aria-hidden="true">Retire as</div>${reasons.map(r => `<button type="button" class="mn-item" role="menuitem" tabindex="-1">${`<span class="t">${r}</span>`}</button>`).join("")}`;
      phone.append(scrim, sheet); trig.setAttribute("aria-expanded", "true");
      sheet.querySelector(".mn-item").focus();
    });
    phone.addEventListener("keydown", e => {
      if (!sheet) return; const items = [...sheet.querySelectorAll(".mn-item")], i = items.indexOf(document.activeElement);
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus(); }
      else if (e.key === "Tab") { e.preventDefault(); close(); }
    });
    phone.addEventListener("click", e => { if (sheet && e.target.closest(".mn-sheet .mn-item")) close(); });
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();
})();
