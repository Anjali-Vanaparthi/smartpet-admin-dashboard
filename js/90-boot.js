/* ===== BOOT ===== */
$("#th").onclick = () => {
  const r = document.documentElement,
    d = getComputedStyle(r).colorScheme.includes("dark") || r.dataset.theme === "dark";
  r.dataset.theme = d ? "light" : "dark";
};
$("#burger").onclick = Motion.toggleSidebar;
$("#drx").onclick = () => $("#dr").classList.remove("o");
$("#gs").oninput = (e) => search(e.target.value);
$("#gs").onkeydown = (e) => {
  const items = $$("#res div[data-i]");
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    hi = Math.max(0, Math.min(items.length - 1, hi + (e.key === "ArrowDown" ? 1 : -1)));
    items.forEach((d, i) => d.classList.toggle("h", i === hi));
  } else if (e.key === "Enter") pickHit(hi);
  else if (e.key === "Escape") {
    $("#res").style.display = "none";
    e.target.blur();
  }
};
document.addEventListener("keydown", (e) => {
  if (document.body.classList.contains("locked")) return;
  if (e.key === "/" && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
    e.preventDefault();
    $("#gs").focus();
  }
  if (e.key === "Escape") $("#dr").classList.remove("o");
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".srch")) $("#res").style.display = "none";
});
/* any element with data-u opens that user's profile (capture phase, so row click handlers do not also fire) */
document.addEventListener(
  "click",
  (e) => {
    const a = e.target.closest("[data-u]");
    if (a) {
      e.stopPropagation();
      e.preventDefault();
      go("user-" + a.dataset.u);
    }
  },
  true,
);
addEventListener("hashchange", route);
Scene.init();
buildNav();
Collar3D.mountAll();
Motion.init();
FX.init(); // history buttons, shortcuts, recent menu, back-to-top
Auth.init(); // signs in, loads the data, then calls route()
