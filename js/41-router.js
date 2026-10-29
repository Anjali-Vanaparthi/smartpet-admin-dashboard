/* ===== ROUTER ===== */
const crumb = (...p) =>
  ($("#crumb").innerHTML =
    `<a data-t="overview">Operations</a> <i>/</i> ` +
    p.map((x, i) => (i === p.length - 1 ? `<b>${x}</b>` : x)).join(" <i>/</i> "));
let st;
/** Read the URL hash, highlight the sidebar item, set breadcrumbs and render the page. */
async function route() {
  if (!Data.ready) return; // wait until sign-in has loaded the data
  try {
    await routeInner();
  } catch (err) {
    console.error(err);
    Motion.done("error");
    $("#view").innerHTML = `<div class="card" style="margin:24px 0"><h3>Could not load data</h3><p style="color:var(--mu)">${esc(err.message)}</p><button class="ib" id="retry">Retry</button></div>`;
    $("#retry").onclick = route;
  }
}
async function routeInner() {
  Motion.start(); // progress bar
  let r = (location.hash || "#overview").slice(1);
  if (
    !S[r] &&
    !/^user-\d+(\/[a-z_]+){0,2}$/.test(r) &&
    !/^loc-\d+$/.test(r) &&
    !/^fix-\d+$/.test(r) &&
    !["overview", "accounts"].includes(r)
  )
    r = "overview";
  const navKey = /^(user|loc|fix)-/.test(r) ? "accounts" : r;
  $$("#sb a").forEach((a) => a.classList.toggle("on", a.dataset.t === navKey));
  FX.sidebar();
  $("#dr").classList.remove("o");
  if (r === "overview") {
    crumb("Overview");
    await overview();
  } else if (r.startsWith("loc-")) {
    const i = +r.slice(4),
      u = U[i];
    if (!u) return go("accounts");
    crumb(
      `<a data-t="accounts">Users</a>`,
      `<a data-t="user-${i}">${u.name}</a>`,
      "Location details",
    );
    await locPage(u, i);
  } else if (r.startsWith("fix-")) {
    const f = (await fetchTable("location_fixes")).find((x) => String(x.id) === r.slice(4));
    if (!f) {
      go("accounts");
      return;
    }
    const i = users.indexOf(f.user_id),
      u = U[i];
    if (!u) {
      crumb(`<a data-t="accounts">Users</a>`, "Fix #" + f.id);
      $("#view").innerHTML = `<div class="card" style="margin:24px 0"><h3>Fix #${f.id} is not linked to a user yet</h3><p style="color:var(--mu);line-height:1.6">This position came from device <b>${esc(f.device_id)}</b>, but the database does not say which user or pet owns that collar. Link collars to users (database-setup.sql) and this page will show the map.</p><button class="ib" data-t="accounts">Back to users</button></div>`;
      $$("#view [data-t]").forEach((e) => (e.onclick = () => go(e.dataset.t)));
      return;
    }
    crumb(
      `<a data-t="accounts">Users</a>`,
      `<a data-t="user-${i}">${u.name}</a>`,
      `<a data-t="loc-${i}">Location details</a>`,
      "Fix #" + f.id,
    );
    await fixPage(f, u, i);
  } else if (r === "accounts") {
    crumb("Users");
    await accounts();
  } else if (r.startsWith("user-")) {
    const [n, tab, tbl] = r.slice(5).split("/"),
      u = U[+n],
      tb = UTABS.find((x) => x.k === tab);
    if (!u) return go("accounts");
    crumb(`<a data-t="accounts">Users</a>`, tb ? `<a data-t="user-${n}">${u.name}</a>` : u.name, ...(tb ? [tb.l] : []));
    await userPage(u, tb ? tab : "summary", tbl);
  } else {
    crumb(`<a data-t="overview">Dashboard</a>`, r);
    await tableView(r);
  }
  $$("#crumb a").forEach((a) => (a.onclick = () => go(a.dataset.t)));
  scrollTo(0, 0);
  Motion.done(r); // finish bar, page-enter animation, recent list
}
