/* ===== FX  ·  pointer spotlight, click ripple, sliding sidebar highlight =====
   Purely visual; every effect is skipped when the user prefers reduced motion. */
const FX = (() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Soft light that follows the pointer across cards, tiles and pills. */
  function spotlight() {
    document.addEventListener(
      "pointermove",
      (e) => {
        const el = e.target.closest && e.target.closest(".card, .kpi, .step, .pills a, .subs a");
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", e.clientX - r.left + "px");
        el.style.setProperty("--my", e.clientY - r.top + "px");
      },
      { passive: true },
    );
  }

  /** Expanding ring where a button or tab was clicked. */
  function ripple() {
    document.addEventListener("pointerdown", (e) => {
      const el = e.target.closest && e.target.closest(".ib, .pills a, .subs a, .chip-b, .hbtn");
      if (!el) return;
      const r = el.getBoundingClientRect(),
        d = Math.max(r.width, r.height) * 2,
        s = document.createElement("span");
      s.className = "rpl";
      s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
      el.appendChild(s);
      setTimeout(() => s.remove(), 650);
    });
  }

  /** Slide the sidebar highlight to the active item (springy). */
  let navPos = null;
  function sidebar() {
    const box = $(".mnav"),
      on = box && box.querySelector("a.on");
    if (!box) return;
    let ind = box.querySelector(".nind");
    if (!ind) {
      ind = document.createElement("i");
      ind.className = "nind";
      box.prepend(ind);
    }
    if (!on) {
      ind.style.opacity = 0;
      return;
    }
    const to = { y: on.offsetTop, h: on.offsetHeight };
    ind.style.opacity = 1;
    ind.style.height = to.h + "px";
    if (navPos === null || reduce) {
      ind.style.transition = "none";
      ind.style.transform = `translateY(${to.y}px)`;
      void ind.offsetWidth;
      ind.style.transition = "";
    } else ind.style.transform = `translateY(${to.y}px)`;
    navPos = to.y;
  }

  /** 3D tilt: tiles lean toward the pointer. Strength shrinks with tile size so wide tables stay calm. */
  function tilt() {
    const SEL = ".kpi, .gc, .step, .hero, .card:not(.inner), .strip > div";
    let cur = null;
    const rest = (el) => {
      el.classList.remove("tilting");
      ["--rx", "--ry", "--px", "--py"].forEach((v) => el.style.removeProperty(v));
    };
    document.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType === "touch" || document.body.classList.contains("locked")) return;
        const el = e.target.closest && e.target.closest(SEL);
        if (cur && cur !== el) rest(cur);
        cur = el;
        if (!el) return;
        const r = el.getBoundingClientRect(),
          px = (e.clientX - r.left) / r.width - 0.5,
          py = (e.clientY - r.top) / r.height - 0.5,
          k = Math.min(1, 340 / r.width) * Math.min(1, 280 / r.height) * (el.classList.contains("hero") ? 0.6 : 1);
        el.style.setProperty("--rx", (-py * 13 * k).toFixed(2) + "deg");
        el.style.setProperty("--ry", (px * 16 * k).toFixed(2) + "deg");
        el.style.setProperty("--px", px.toFixed(3));
        el.style.setProperty("--py", py.toFixed(3));
        el.classList.add("tilting");
      },
      { passive: true },
    );
    document.addEventListener("pointerleave", () => cur && (rest(cur), (cur = null)));
    addEventListener("blur", () => cur && (rest(cur), (cur = null)));
  }

  /** Pointer position drives the floating scene (page-wide) and the login layers. */
  function parallax() {
    const root = document.documentElement,
      login = document.getElementById("login");
    let raf = 0, x = 0, y = 0;
    document.addEventListener(
      "pointermove",
      (e) => {
        x = e.clientX / innerWidth - 0.5;
        y = e.clientY / innerHeight - 0.5;
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          root.style.setProperty("--mx", (x * 2).toFixed(3));
          root.style.setProperty("--my", (y * 2).toFixed(3));
          if (login) {
            login.style.setProperty("--px", x.toFixed(3));
            login.style.setProperty("--py", y.toFixed(3));
          }
        });
      },
      { passive: true },
    );
  }

  function init() {
    if (reduce) return;
    spotlight();
    ripple();
    tilt();
    parallax();
  }
  return { init, sidebar };
})();
