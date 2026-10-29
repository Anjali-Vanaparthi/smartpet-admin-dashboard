/* ===== PAGE: DASHBOARD =====
   Landing page. From top to bottom:
     hero with quick actions -> KPI cards -> directory workflow -> domain shortcuts
     -> filterable table directory -> latest alerts.
   No charts by design. */

/** Greeting that follows the time of day. */
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/** Small HTML builders used only by the dashboard. */
const dash = {
  kpi: ([label, value, color]) =>
    `<div class="card kpi" style="--k:${color}"><b data-count="${value}">${fmt(value)}</b><span>${label}</span></div>`,

  tableRow: (t) =>
    `<tr class="fx" data-t="${t}" data-d="${S[t][0]}" data-n="${(t + " " + D[t][0]).toLowerCase()}">
      <td><b>${t}</b>${PROPT.has(t) ? ' <span class="pill wa">Proposed</span>' : ""}</td>
      <td><span style="color:${GC[S[t][0]]}">●</span> ${S[t][0]}</td>
      <td style="max-width:440px">${D[t][0]}</td>
      <td class="m">${fmt(TOTAL[t])}</td><td>${cols(t).length}</td><td>${fks(t).length}</td></tr>`,

  alertRow: (a, all) => {
    const tone = a.severity === "critical" ? "cr" : a.severity === "warning" ? "wa" : "ok";
    return `<tr class="cl" data-i="${all.indexOf(a)}">
      <td>${dt(a.triggered_at)}</td>
      <td><a class="lk" data-u="${users.indexOf(a.user_id)}">${uName(a.user_id) || "—"}</a></td>
      <td>${a.alert_type}</td><td><span class="pill ${tone}">${a.severity}</span></td>
      <td>${esc(a.message || "—")}</td><td>${a.is_read ? "Yes" : "No"}</td></tr>`;
  },
};

/** Dashboard page. */
async function overview() {
  const alerts = await fetchTable("alert_data");
  const totalRows = Object.values(TOTAL).reduce((a, b) => a + b, 0);
  const latest = [...alerts].sort((a, b) => b.triggered_at - a.triggered_at).slice(0, 6);

  const kpis = [
    ["Tables", Object.keys(S).length, "#5aa2ff"],
    ["Total rows", totalRows, "#2dd4bf"],
    ["Users", TOTAL.users, "#a78bfa"],
    ["Pets", TOTAL.pets, "#fbbf24"],
  ];

  const unread = alerts.filter((a) => !a.is_read).length;
  $("#view").innerHTML = `
    <section class="hero">
      <div>
        <h1>${greeting()}, Admin</h1>
        <p>${Object.keys(S).length} tables across ${groups.length} domains. Open a user from the directory to browse their data table by table.</p>
      </div>
      <div class="hero-art" aria-hidden="true"><span></span><span></span><span></span></div>
      <div class="hero-3d" aria-hidden="true"><div data-collar data-n="44"></div></div>
    </section>

    <div class="grid kpis">${kpis.map(dash.kpi).join("")}</div>

    <div class="sect">Latest alerts · ${unread} unread</div>
    <div class="wrap"><table><thead><tr><th>Triggered</th><th>User</th><th>Type</th><th>Severity</th><th>Message</th><th>Read</th></tr></thead>
      <tbody>${latest.map((a) => dash.alertRow(a, alerts)).join("")}</tbody></table></div>

    <div class="sect">Table directory</div>
    <div class="tool">
      <div class="chips"><button class="chip-b on" data-d="">All</button>${groups.map((g) => `<button class="chip-b" data-d="${g}">${g}</button>`).join("")}</div>
      <input class="q" id="tdq" placeholder="Filter tables…" autocomplete="off">
      <span id="tdc" style="color:var(--mu)"></span>
    </div>
    <div class="wrap"><table id="tdir"><thead><tr><th>Table</th><th>Domain</th><th>Description</th><th>Rows</th><th>Columns</th><th>FKs</th></tr></thead>
      <tbody>${Object.keys(S).map(dash.tableRow).join("")}</tbody></table></div>
`;

  Collar3D.mountAll($("#view"));

  // wiring
  $$("#view [data-t]").forEach((e) => (e.onclick = () => go(e.dataset.t)));
  $$("#view tr.cl").forEach((e) => (e.onclick = () => drawer("alert_data", alerts[+e.dataset.i])));
  wireTableDirectory();
  Motion.countUp($("#view"));
}

/** Domain chips + text box filter the table directory. */
function wireTableDirectory() {
  let domain = "";
  const rows = $$("#tdir tbody tr"), input = $("#tdq"), count = $("#tdc");
  const apply = () => {
    const q = input.value.toLowerCase();
    let shown = 0;
    rows.forEach((r) => {
      const ok = (!domain || r.dataset.d === domain) && (!q || r.dataset.n.includes(q));
      r.hidden = !ok;
      if (ok) shown++;
    });
    count.textContent = `${shown} of ${rows.length} tables`;
  };
  input.oninput = apply;
  $$("#view .chip-b").forEach((b) => (b.onclick = () => {
    domain = b.dataset.d;
    $$("#view .chip-b").forEach((x) => x.classList.toggle("on", x === b));
    apply();
  }));
  apply();
}
