/* ===== MOTION & NAVIGATION EXTRAS =====
   Everything that is about feel rather than content lives here:
     - top progress bar and page-enter animation on every route change
     - count-up numbers on KPI cards
     - recent pages menu, back/forward buttons, keyboard shortcuts
     - sidebar collapse, scrim, back-to-top button
   Other modules call: Motion.start(), Motion.done(route), Motion.replay(el),
   Motion.countUp(root), Motion.toggleSidebar(), Motion.init(). */
const Motion = (() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const recent = []; // most recent first: [{ hash, title }]
  let barTimer;

  /** Restart a CSS animation by toggling its class. */
  function replay(el, cls = "replay") {
    el.classList.remove(cls);
    void el.offsetWidth; // force reflow so the animation restarts
    el.classList.add(cls);
  }

  /** Route began: run the progress bar to ~70%. */
  function start() {
    const bar = $("#bar");
    clearTimeout(barTimer);
    bar.style.transition = "none";
    bar.style.opacity = "1";
    bar.style.transform = "scaleX(0)";
    void bar.offsetWidth;
    bar.style.transition = "";
    bar.style.transform = "scaleX(.7)";
  }

  /** Route finished: complete the bar, animate the page in, remember the page. */
  function done(route) {
    const bar = $("#bar");
    bar.style.transform = "scaleX(1)";
    barTimer = setTimeout(() => (bar.style.opacity = "0"), 250);
    const title = ($("#crumb b") || {}).textContent || "Dashboard";
    document.title = `${title} · Pet Tracker`;
    remember(route, title);
    replay($("#view"), "enter");
  }

  /** Keep the last 8 distinct pages for the Recent menu. */
  function remember(hash, title) {
    const i = recent.findIndex((r) => r.hash === hash);
    if (i >= 0) recent.splice(i, 1);
    recent.unshift({ hash, title });
    recent.length = Math.min(recent.length, 8);
  }

  /** Animate every [data-count] element from 0 to its value. */
  function countUp(root = document) {
    root.querySelectorAll("[data-count]").forEach((el) => {
      const end = +el.dataset.count;
      if (reduce || !isFinite(end)) return (el.textContent = fmt(end));
      const t0 = performance.now(), dur = 900;
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - p, 3)))); // ease-out
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /** Desktop: collapse the sidebar. Mobile: slide it over the page. */
  function toggleSidebar() {
    document.body.classList.toggle(innerWidth <= 960 ? "open" : "collapsed");
  }

  const toggleHelp = (force) => $("#help").classList.toggle("open", force);

  /** One-time setup, called from boot. */
  function init() {
    
    
    
    
    $("#helpx").onclick = () => toggleHelp(false);
    $("#help").onclick = (e) => { if (e.target.id === "help") toggleHelp(false); };
    $("#scrim").onclick = () => { $("#dr").classList.remove("o"); document.body.classList.remove("open"); };
    $("#totop").onclick = () => scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    addEventListener("scroll", () => $("#totop").classList.toggle("show", scrollY > 400), { passive: true });
    

    // keyboard: "?" help, "g" then d/u to jump, "[" and "]" for previous/next table
    let pending = false, pendingTimer;
    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || document.body.classList.contains("locked")) return;
      if (e.key === "Escape") return toggleHelp(false);
      if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === "?") return toggleHelp();
      if (pending) {
        pending = false;
        const target = { d: "overview", u: "accounts" }[e.key];
        return target && go(target);
      }
      if (e.key === "g") {
        pending = true;
        clearTimeout(pendingTimer);
        pendingTimer = setTimeout(() => (pending = false), 900);
      } else if (e.key === "[" || e.key === "]") {
        const keys = Object.keys(S), i = keys.indexOf(location.hash.slice(1));
        if (i >= 0 && keys[i + (e.key === "]" ? 1 : -1)]) go(keys[i + (e.key === "]" ? 1 : -1)]);
      }
    });
  }

  return { start, done, replay, countUp, toggleSidebar, init };
})();
