/* ===== SIDEBAR / SEARCH ===== */
/** Build the left sidebar: brand, two top-level pages, status footer. Tables are browsed per user. */
function buildNav() {
  $("#sb").innerHTML =
    `<div class="brand"><div class="logo3d"><div data-collar data-size="sm" data-n="20"></div></div><div><small>Operations</small><b>Pet Tracker</b></div></div>
 <nav class="mnav"><a data-t="overview"><span class="ni">◆</span>Overview</a><a data-t="accounts"><span class="ni">◎</span>Users<small>${fmt(TOTAL.users)}</small></a></nav>
 <div class="sbc"><div class="sbc-3d"><div data-collar data-size="md" data-n="40"></div></div><b>Smart Collar</b><small>GPS · Heart rate · LTE</small></div>
 <div class="sbfoot"><span class="pillg"><i class="live"></i>Live data</span><p>Monitor collars, pets and care records in one console.</p></div>`;
  $$("#sb a").forEach((a) => (a.onclick = () => go(a.dataset.t)));
  Collar3D.mountAll($("#sb"));
}
const idx = [];
/** (Re)build the global-search index. Runs after sign-in, once the users are loaded. */
function buildIdx() {
  idx.length = 0;
  Object.keys(S).forEach((t) => {
    idx.push({ k: t, l: t, s: "table · " + S[t][0], t });
    cols(t).forEach((c) => idx.push({ k: t + "." + c.n, l: c.n, s: t + " · " + PT[c.ty], t }));
  });
  U.forEach((u, i) =>
    idx.push({ k: u.name + " " + u.email, l: u.name, s: "user · " + u.email, t: "user-" + i }),
  );
}
let hi = 0,
  hits = [];
/** Global search over tables, columns and users; fills the result dropdown. */
function search(q) {
  q = q.toLowerCase().trim();
  const box = $("#res");
  if (!q) {
    box.style.display = "none";
    return;
  }
  hits = idx
    .filter((x) => x.k.toLowerCase().includes(q))
    .sort((a, b) => (a.s.startsWith("table") ? 0 : 1) - (b.s.startsWith("table") ? 0 : 1))
    .slice(0, 12);
  hi = 0;
  box.innerHTML =
    hits
      .map(
        (h, i) =>
          `<div data-i="${i}" class="${i ? "" : "h"}"><span>${esc(h.l)}</span><small>${esc(h.s)}</small></div>`,
      )
      .join("") || "<div><small>No matches</small></div>";
  box.style.display = "block";
  $$("#res div[data-i]").forEach((d) => (d.onclick = () => pickHit(+d.dataset.i)));
}
/** Navigate to the highlighted search result. */
function pickHit(i) {
  const h = hits[i];
  if (!h) return;
  $("#res").style.display = "none";
  $("#gs").value = "";
  go(h.t);
}
