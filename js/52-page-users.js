/* ===== USERS ===== */
/** User directory: one row per user with counts; click a row to open the profile. */
async function accounts() {
  const T = [
      "health_data",
      "alert_data",
      "reminder",
      "medication",
      "vet_visit",
      "safe_zones",
      "location_fixes",
    ],
    [ur, pr, ...all] = await Promise.all(["users", "pets", ...T].map(fetchTable)),
    c = (t, u) => all[T.indexOf(t)].filter((r) => r.user_id === u);
  $("#view").innerHTML =
    `<div class="pgh"><div><h1 class="t">Users</h1><div class="sub">One row per account. Click a user to browse only their data.</div></div></div>
 <div class="tool"><input class="q" id="uf" placeholder="Filter users by name, email or city…" autocomplete="off"></div><div class="wrap"><table><thead><tr><th>User</th><th>Email</th><th>City</th><th>Pets</th><th>Health readings</th><th>Alerts</th><th>Unread</th><th>Reminders</th><th>Medications</th><th>Vet visits</th><th>Zones</th><th>Last fix</th><th>Joined</th></tr></thead><tbody>${U.map(
   (u, i) => {
     const un = c("alert_data", u.id).filter((a) => !a.is_read).length,
 lfx = c("location_fixes", u.id),
 last = Math.max(0, ...lfx.map((f) => f.fix_timestamp));
     return `<tr class="cl" data-i="${i}"><td><b>${u.name}</b></td><td>${u.email}</td><td>${u.addr}</td><td>${pr.filter((p) => p.user_id === u.id).length}</td><td>${c("health_data", u.id).length}</td><td>${c("alert_data", u.id).length}</td><td>${un ? `<span class="pill wa">${un}</span>` : "0"}</td><td>${c("reminder", u.id).length}</td><td>${c("medication", u.id).length}</td><td>${c("vet_visit", u.id).length}</td><td>${c("safe_zones", u.id).length}</td><td>${last ? dt(last) : "—"}</td><td>${dt(ur[i].created_at)}</td></tr>`;
   },
 ).join(
   "",
 )}</tbody></table></div><div class="pager">Click a user to open their complete profile. Counts are loaded from the database.</div>`;
  $$("#view tr.cl").forEach((e) => (e.onclick = () => go("user-" + e.dataset.i)));
  // live filter over the visible text of each row
  $("#uf").oninput = (e) => {
    const q = e.target.value.toLowerCase();
    $$("#view tr.cl").forEach((r) => (r.hidden = !r.textContent.toLowerCase().includes(q)));
  };
}
/** User page sections: each groups one or more tables. */
const UTABS = [
  { k: "summary", l: "Summary" },
  { k: "pets", l: "Pets", t: ["pets", "devices"] },
  { k: "health", l: "Health", t: ["health_data", "hourly_health_trends", "daily_step_goals"] },
  { k: "locations", l: "Locations", t: ["location_fixes", "gnss_details", "serving_cells", "neighbor_cells"] },
  { k: "alerts", l: "Alerts", t: ["alert_data"] },
  { k: "care", l: "Care", t: ["medication", "vet_visit", "grooming", "reminder"] },
  { k: "zones", l: "Safe zones", t: ["safe_zones"] },
  { k: "account", l: "Account", t: ["users", "app_info"] },
];
const userTables = () => UTABS.flatMap((x) => x.t || []);
/** Rows of table t that belong to user u. GNSS / serving / neighbour cell rows have no user_id: they belong via their location fix. */
const ownRows = (t, u, data, fixIds) =>
  data.filter((r) =>
    t === "users" ? r.id === u.id : "location_fix_id" in r ? fixIds.has(r.location_fix_id) : r.user_id === u.id,
  );
let lastInd = null; // previous pill position, so the highlight can glide to the new tab

/** User page: identity header, section pills, then the selected section's data (only this user's rows). */
async function userPage(u, tab = "summary", tbl) {
  const ui = users.indexOf(u.id),
    T = userTables(),
    all = await Promise.all(T.map(fetchTable)),
    fixIds = new Set(all[T.indexOf("location_fixes")].filter((f) => f.user_id === u.id).map((f) => f.id)),
    m = (t) => ownRows(t, u, all[T.indexOf(t)], fixIds),
    me = m("users")[0],
    myp = m("pets"),
    al = m("alert_data"),
    hd = m("health_data"),
    cur = UTABS.find((x) => x.k === tab),
    tables = cur.t || [],
    sel = tables.includes(tbl) ? tbl : tables[0],
    count = (x) => (x.t ? x.t.reduce((a, t) => a + m(t).length, 0) : null),
    ini = u.name.split(" ").map((x) => x[0]).join(""),
    sw = (d) => {
      const j = ui + d;
      return j < 0 || j > 7
        ? `<button class="ib" disabled>${d < 0 ? "‹" : "›"}</button>`
        : `<button class="ib" data-t="user-${j}${tab === "summary" ? "" : "/" + tab}" title="${U[j].name}">${d < 0 ? "‹" : "›"}</button>`;
    };

  const head = `<div class="uhead"><div class="av">${ini}</div><div class="grow"><h1>${u.name}</h1>
    <div class="meta"><span>✉ ${u.email}</span><span>☎ ${u.mobile}</span><span>⌖ ${u.addr}</span><span>Joined ${dt(me.created_at)}</span></div></div>
    <div class="usw"><span>User ${ui + 1} of ${U.length}</span>${sw(-1)}${sw(1)}</div></div>`;

  const pills = `<div class="pills" id="pills"><i class="pind"></i>${UTABS.map(
    (x) =>
      `<a data-t="user-${ui}${x.k === "summary" ? "" : "/" + x.k}" data-k="${x.k}" class="${x.k === tab ? "on" : ""}">${x.l}${count(x) != null ? `<small>${count(x)}</small>` : ""}</a>`,
  ).join("")}</div>`;

  const subs =
    tables.length > 1
      ? `<div class="subs">${tables.map((t) => `<a data-t="user-${ui}/${tab}/${t}" class="${t === sel ? "on" : ""}">${t}<small>${m(t).length}</small></a>`).join("")}</div>`
      : "";

  const tables_loc = ["gnss_details", "serving_cells", "neighbor_cells"];
  let body;
  if (tab === "summary") {
    const lat = [...al].sort((a, b) => b.triggered_at - a.triggered_at).slice(0, 5),
      unread = al.filter((a) => !a.is_read).length;
    body = `<div class="card"><h3>Pets · ${myp.length}</h3><div class="grid three">${
      myp
        .map((p) => {
          const ph = hd.filter((r) => r.pet_id === p.id),
            last = ph[ph.length - 1];
          return `<div class="card inner"><b>🐾 ${p.name}</b><div class="mu">${p.pettype} · ${p.breed} · ${p.gender} · ${p.weight_kg} kg · born ${p.dob}</div><div class="leg" style="margin-top:8px"><span>${ph.length} readings</span><span>${al.filter((a) => a.pet_id === p.id).length} alerts</span>${last ? `<span>last HR ${last.heart_rate} bpm</span>` : ""}</div></div>`;
        })
        .join("") || '<span class="mu">No pets.</span>'
    }</div></div>
 <div class="card" style="margin-top:14px"><div class="chd"><h3 style="margin:0">Latest locations</h3><button class="ib" data-m="${ui}">All location details →</button></div><div class="wrap flat" style="margin-top:12px"><table><thead><tr><th>Time</th><th>Pet</th><th>Source</th><th>Accuracy</th><th>Coordinates</th></tr></thead><tbody>${[
      ...m("location_fixes"),
    ]
      .sort((a, b) => b.fix_timestamp - a.fix_timestamp)
      .slice(0, 5)
      .map(
        (f) =>
          `<tr class="fx" data-fx="${f.id}"><td>${dt(f.fix_timestamp)}</td><td>${esc(pName(f.pet_id) || "—")}</td><td>${f.source}</td><td>± ${f.accuracy_m} m</td><td class="m">${f.latitude}, ${f.longitude}</td></tr>`,
      )
      .join("")}</tbody></table></div><div class="pager">Click a row to open it on the map.</div></div>
 <div class="card" style="margin-top:14px"><h3>Latest alerts · ${unread} unread</h3>${
   lat.length
     ? `<div class="wrap flat"><table><thead><tr><th>Triggered</th><th>Type</th><th>Severity</th><th>Message</th></tr></thead><tbody>${lat.map((a, k) => `<tr class="cl" data-k="${k}"><td>${dt(a.triggered_at)}</td><td>${a.alert_type}</td><td><span class="pill ${a.severity === "critical" ? "cr" : a.severity === "warning" ? "wa" : "ok"}">${a.severity}</span></td><td>${esc(a.message || "—")}</td></tr>`).join("")}</tbody></table></div>`
     : '<span class="mu">No alerts.</span>'
 }</div>`;
    var ovAlerts = lat;
  } else {
    body = `<div class="card tcard"><div class="chd"><div><h3 style="margin:0 0 2px"><span style="color:${GC[S[sel][0]]}">●</span> ${sel} · ${m(sel).length} rows</h3><div class="mu">${D[sel][0]}</div></div>
      <input class="q" id="tq" placeholder="Search ${sel}…" autocomplete="off"></div>
      <div id="tb" style="margin-top:14px"></div>
      <div class="pager" style="margin-top:8px">Only ${esc(u.name)}'s rows · click a row ${sel === "location_fixes" ? "to open it on the map" : tables_loc.includes(sel) ? "to open its fix on the map" : "for the full record"}</div></div>`;
  }

  $("#view").innerHTML = `${head}${pills}${subs}<div class="ubody">${body}</div>`;
  $$("#view [data-t]").forEach((e) => (e.onclick = () => go(e.dataset.t)));
  $$("#view [data-m]").forEach((e) => (e.onclick = () => go("loc-" + ui)));
  $$("#view tr.fx").forEach((e) => (e.onclick = () => go("fix-" + e.dataset.fx)));
  $$("#view .ubody tr.cl[data-k]").forEach((e) => (e.onclick = () => drawer("alert_data", ovAlerts[+e.dataset.k])));
  if (tab !== "summary") userTableGrid(sel, m(sel));
  glidePills(ui);
}

/** Move the highlight under the active pill; when staying on the same user, animate from the previous tab. */
function glidePills(ui) {
  const box = $("#pills"),
    on = box && box.querySelector("a.on"),
    ind = box && box.querySelector(".pind");
  if (!on) return;
  const to = { x: on.offsetLeft, w: on.offsetWidth, y: on.offsetTop, h: on.offsetHeight };
  ind.style.top = to.y + "px";
  ind.style.height = to.h + "px";
  if (lastInd && lastInd.ui === ui && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    ind.style.transition = "none";
    ind.style.transform = `translateX(${lastInd.x}px)`;
    ind.style.width = lastInd.w + "px";
    void ind.offsetWidth;
    ind.style.transition = "";
  }
  ind.style.transform = `translateX(${to.x}px)`;
  ind.style.width = to.w + "px";
  lastInd = { ui, ...to };
}

/** Searchable, sortable, paged grid of one user's rows from one table. */
function userTableGrid(t, rows) {
  const cs = cols(t).filter((c) => t === "users" || c.n !== "user_id"), // owner is already known on this page
    fk = Object.fromEntries(fks(t)),
    q = { text: "", sort: null, dir: 1, page: 0, size: 10 };
  const draw = () => {
    let r = rows.filter(
      (x) =>
        !q.text ||
        cs.some((c) => !HIDE.has(c.n) && String(x[c.n] ?? "").toLowerCase().includes(q.text)) ||
        (pName(x.pet_id) || "").toLowerCase().includes(q.text),
    );
    if (q.sort)
      r = [...r].sort((a, b) => {
        const x = a[q.sort],
          y = b[q.sort];
        return (x === y ? 0 : x == null ? 1 : y == null ? -1 : x > y ? 1 : -1) * q.dir;
      });
    const pages = Math.max(1, Math.ceil(r.length / q.size));
    q.page = Math.min(q.page, pages - 1);
    const pg = r.slice(q.page * q.size, (q.page + 1) * q.size);
    $("#tb").innerHTML = `<div class="wrap flat"><table><thead><tr>${cs
      .map(
        (c) =>
          `<th data-c="${c.n}">${c.n}${c.n === "id" ? '<span class="tag">PK</span>' : ""}${fk[c.n] ? '<span class="tag">FK</span>' : ""} ${q.sort === c.n ? (q.dir > 0 ? "▲" : "▼") : ""}<small>${PT[c.ty]}</small></th>`,
      )
      .join("")}</tr></thead><tbody>${
      pg.map((x, j) => `<tr class="cl" data-j="${j}">${cs.map((c) => cell(x[c.n], c)).join("")}</tr>`).join("") ||
      `<tr><td colspan="${cs.length}">No rows for this user.</td></tr>`
    }</tbody></table></div><div class="pgr"><button class="ib" id="p1">‹ Prev</button><span>Page ${q.page + 1} of ${pages} · ${r.length} rows</span><button class="ib" id="p2">Next ›</button></div>`;
    $$("#tb th").forEach((h) => (h.onclick = () => ((q.dir = q.sort === h.dataset.c ? -q.dir : 1), (q.sort = h.dataset.c), draw())));
    $$("#tb tr.cl").forEach(
      (e) => {
        const r = pg[+e.dataset.j];
        e.onclick = () =>
          t === "location_fixes" ? go("fix-" + r.id) : "location_fix_id" in r ? go("fix-" + r.location_fix_id) : drawer(t, r);
      },
    );
    $("#p1").onclick = () => ((q.page = Math.max(0, q.page - 1)), draw());
    $("#p2").onclick = () => ((q.page = Math.min(pages - 1, q.page + 1)), draw());
  };
  $("#tq").oninput = (e) => ((q.text = e.target.value.toLowerCase()), (q.page = 0), draw());
  draw();
}
