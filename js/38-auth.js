/* ===== AUTH  ·  static sign-in =====
   The email and password live in js/05-config.js and are checked in the browser. This only
   gates the screen: it does not protect your API, so restrict the API itself (API key, CORS). */
const Auth = (() => {
  const KEY = "pt-admin-session";
  const safe = (fn, d = null) => { try { return fn(); } catch { return d; } };
  const signedIn = () => !!safe(() => sessionStorage.getItem(KEY) || localStorage.getItem(KEY));
  const save = (remember) => safe(() => (remember ? localStorage : sessionStorage).setItem(KEY, "1"));
  const clear = () => safe(() => { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); });
  const verify = (email, pw) =>
    email.trim().toLowerCase() === CONFIG.LOGIN.email.toLowerCase() && pw === CONFIG.LOGIN.password;

  const lock = () => {
    $("#login").classList.remove("leaving");
    document.body.classList.add("locked");
    $("#lgp").value = "";
    setTimeout(() => $("#lge").focus(), 50);
  };

  /* ---- live updates: re-read the API on a timer and redraw only when something changed ---- */
  let timer = 0;
  const stamp = (txt) => { const e = $("#stamp"); if (e) e.textContent = txt || (Data.updatedAt ? "Updated " + new Date(Data.updatedAt).toLocaleTimeString() : ""); };
  const busyUi = () => document.hidden || document.body.classList.contains("locked") || $("#dr").classList.contains("o") || /INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName || "");
  async function refreshNow(manual) {
    if (Data.busy || !Data.ready) return;
    const btn = $("#rf");
    btn && btn.classList.add("spin");
    try {
      const changed = await Data.refresh();
      stamp();
      if (changed) {
        const y = scrollY;
        buildNav();
        await route();
        scrollTo(0, y);
        toast("Data updated");
      } else if (manual) toast("Already up to date");
    } catch (e) {
      stamp("Update failed " + new Date().toLocaleTimeString());
      if (manual) toast("Could not reach the API");
      console.warn("refresh failed:", e.message);
    } finally {
      btn && btn.classList.remove("spin");
    }
  }
  const startTimer = () => {
    clearInterval(timer);
    if (CONFIG.REFRESH_SECONDS > 0) timer = setInterval(() => !busyUi() && refreshNow(false), CONFIG.REFRESH_SECONDS * 1000);
  };

  /** Load users and pets, then draw the current page. Throws if the API cannot be reached. */
  async function load() {
    await Data.init();
    Data.updatedAt = Date.now();
    stamp();
    startTimer();
    buildIdx();
    buildNav();
    route();
    // fill the dashboard counts once every table has loaded
    Data.preload(() => {
      buildNav();
      if (["", "overview", "accounts"].includes(location.hash.slice(1))) route();
    });
  }

  /** Show the problem inside the app (instead of staying stuck on the login screen) with a Retry button. */
  function showLoadError(ex) {
    $("#view").innerHTML = `<div class="card" style="margin:24px 0"><h3>Could not load data from your API</h3><p style="color:var(--mu);line-height:1.6;white-space:pre-line">${esc(ex.message)}</p><p style="color:var(--mu);font-size:13px">API_BASE and HEADERS are set in js/05-config.js (run python3 build.py after changing them).</p><button class="ib" id="retry">Retry</button></div>`;
    $("#retry").onclick = () => load().catch(showLoadError);
  }

  /** Sign-in succeeded: open the app. The data loads after it opens, so an API problem never blocks the login. */
  function start(animate) {
    const box = $("#login");
    const show = () => {
      document.body.classList.remove("locked");
      box.classList.remove("leaving");
      FX.sidebar();
      load().catch(showLoadError);
    };
    buildNav();
    if (animate) {
      box.classList.add("leaving");
      setTimeout(show, 650);
    } else show();
  }

  function init() {
    const f = $("#lgf"), err = $("#lgerr"), go = $("#lgo");
    $("#lghint").style.display = CONFIG.SHOW_LOGIN_HINT ? "" : "none";
    $("#lghe").textContent = CONFIG.LOGIN.email;
    $("#lghp").textContent = CONFIG.LOGIN.password;
    $("#lgdemo").onclick = () => {
      $("#lge").value = CONFIG.LOGIN.email;
      $("#lgp").value = CONFIG.LOGIN.password;
      err.textContent = "";
      $("#lgo").focus();
    };
    $("#lgeye").onclick = () => {
      const p = $("#lgp"), show = p.type === "password";
      p.type = show ? "text" : "password";
      $("#lgeye").textContent = show ? "Hide" : "Show";
    };
    $("#lgforgot").onclick = () => (err.textContent = "Ask your administrator for the login details.");
    const shake = () => {
      f.classList.remove("shake");
      void f.offsetWidth;
      f.classList.add("shake");
    };
    f.onsubmit = async (e) => {
      e.preventDefault();
      err.textContent = "";
      const email = $("#lge").value, pw = $("#lgp").value;
      if (!email.trim() || !pw) {
        err.textContent = "Enter your email and password.";
        return shake();
      }
      if (!verify(email, pw)) {
        err.textContent = "That email and password don't match.";
        return shake();
      }
      save($("#lgr").checked);
      start(true);
    };
    $("#rf").onclick = () => refreshNow(true);
    $("#out").onclick = () => {
      clearInterval(timer);
      stamp("");
      clear();
      Data.reset();
      location.hash = "#overview";
      lock();
    };
    lock();
    if (signedIn()) start(false);
  }
  return { init };
})();
