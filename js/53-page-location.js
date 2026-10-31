/* ===== LOCATION DETAILS & MAP ===== */
const MC = ["#5aa2ff", "#fb7185", "#2dd4bf", "#fbbf24", "#a78bfa", "#f472b6"],
  SC = new Proxy({ GNSS: "#5aa2ff", SCELL: "#2dd4bf", MCELL: "#a78bfa", LTE: "#2dd4bf", WIFI: "#fbbf24" }, { get: (o, k) => o[k] || "#94a3b8" }),
  SVR = { info: "#2dd4bf", warning: "#fbbf24", critical: "#fb7185" };
const GP = (la, lo) => [(lo - 78.45) * 106200, -(la - 17.4) * 110540],
  mdist = (a, b) => {
    const p = GP(a.latitude, a.longitude),
      q = GP(b.latitude, b.longitude);
    return Math.hypot(p[0] - q[0], p[1] - q[1]);
  };
const inZone = (f, z) => {
  const [a, b] = GP(f.latitude, f.longitude),
    [c, d] = GP(z.latitude, z.longitude);
  return z.shape === "rectangle"
    ? Math.abs(a - c) <= z.half_width_meters && Math.abs(b - d) <= z.half_height_meters
    : Math.hypot(a - c, b - d) <= z.radius_m;
};
const zstat = (f, zs) => {
  const ins = zs.filter((z) => z.user_id === f.user_id && z.is_active && inZone(f, z));
  return ins.length ? [...new Set(ins.map((z) => z.name))].join(", ") : null;
};
/* one colour per location source, used by pins, routes, the status line and the legend */
const srcCol = () => "#1a73e8", // every source (GNSS, SCELL, MCELL, Wi-Fi) uses the same blue; the source is named in the cards
 
  SRC_ORDER = ["GNSS", "SCELL", "MCELL", "WIFI"];
const spill = (x) =>
  `<span class="pill" style="background:${SC[x]}22;color:${SC[x]}">${x}</span>`;

/* Step 1: every location detail for one user */
/** Step 3: every location fix for one user, with filters and safe-zone status. */
async function locPage(u, i) {
  const [lf, zs, pr0] = await Promise.all(
      ["location_fixes", "safe_zones", "pets"].map(fetchTable),
    ),
    pr = pr0.filter((p) => p.user_id === u.id);
  const all = lf
      .filter((f) => f.user_id === u.id)
      .sort((a, b) => b.fix_timestamp - a.fix_timestamp),
    pcol = (id) =>
      MC[
        Math.max(
          0,
          pr.findIndex((p) => p.id === id),
        ) % MC.length
      ],
    n1 = all.length || 1;
  const zp = (f) => {
      const z = zstat(f, zs);
      return z
        ? `<span class="pill ok">Inside ${esc(z)}</span>`
        : '<span class="pill wa">Outside safe zones</span>';
    },
    v = { pet: "", src: "", zone: "", page: 0, size: 10 };
  $("#view").innerHTML =
    `<div class="pgh"><div><h1 class="t">Location details · ${u.name}</h1><div class="sub">Every position reported by this user's pets. Click any row to see it on the map.</div></div></div>
 <div class="strip"><div><b>${all.length}</b><span>Location fixes</span></div><div><b>${pr.length}</b><span>Pets tracked</span></div><div><b>${all.length ? dt(all[0].fix_timestamp) : "—"}</b><span>Last fix</span></div><div><b>${Math.round((all.filter((f) => f.source === "GNSS").length / n1) * 100)}%</b><span>GNSS share</span></div><div><b>${(all.reduce((a, f) => a + f.accuracy_m, 0) / n1).toFixed(1)} m</b><span>Avg accuracy</span></div><div><b>${all.filter((f) => !zstat(f, zs)).length}</b><span>Outside safe zones</span></div></div>
 <div class="card" style="margin-top:14px"><h3>Latest position per pet</h3><div class="grid three">${pr
   .map((p) => {
     const l = all.find((f) => f.pet_id === p.id);
     return l
 ? `<div class="card" style="box-shadow:none;cursor:pointer;border-left:4px solid ${pcol(p.id)}" data-fx="${l.id}"><b>🐾 ${esc(p.name)}</b><div style="color:var(--mu);font-size:12.5px;margin:2px 0 8px">${dt(l.fix_timestamp)} · ${l.latitude}, ${l.longitude}</div><div class="leg">${spill(l.source)}<span>± ${l.accuracy_m} m</span></div><div style="margin-top:8px">${zp(l)}</div><div style="margin-top:8px"><a class="lk">View on map →</a></div></div>`
 : "";
   })
   .join("")}</div></div>
 <div class="tool" style="margin-top:16px"><select id="lp"><option value="">All pets</option>${pr.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select><select id="ls"><option value="">All sources</option><option>GNSS</option><option>SCELL</option><option>MCELL</option><option>WIFI</option></select><select id="lz"><option value="">All zone status</option><option value="in">Inside a safe zone</option><option value="out">Outside safe zones</option></select><select id="lsz"><option>10</option><option>25</option><option>50</option></select><span style="color:var(--mu)">rows per page · newest first</span></div><div id="ll"></div>`;
  const draw = () => {
    const r = all.filter(
        (f) =>
          (!v.pet || f.pet_id === v.pet) &&
          (!v.src || f.source === v.src) &&
          (!v.zone || (v.zone === "in") === !!zstat(f, zs)),
      ),
      pages = Math.max(1, Math.ceil(r.length / v.size));
    v.page = Math.min(v.page, pages - 1);
    $("#ll").innerHTML =
      `<div class="wrap"><table><thead><tr><th>Time</th><th>Pet</th><th>Device</th><th>Source</th><th>Latitude</th><th>Longitude</th><th>Accuracy</th><th>Safe-zone status</th><th></th></tr></thead><tbody>${
        r
          .slice(v.page * v.size, v.page * v.size + v.size)
          .map(
            (f) =>
              `<tr class="fx" data-fx="${f.id}"><td>${dt(f.fix_timestamp)}</td><td><b style="color:${pcol(f.pet_id)}">●</b> ${esc(pName(f.pet_id) || "—")}</td><td class="m">${f.device_id}</td><td>${spill(f.source)}</td><td class="m">${f.latitude}</td><td class="m">${f.longitude}</td><td>± ${f.accuracy_m} m</td><td>${zp(f)}</td><td><a class="lk">View on map →</a></td></tr>`,
          )
          .join("") || '<tr><td colspan="9">No fixes match these filters</td></tr>'
      }</tbody></table></div><div class="pager"><button class="ib" id="lp1">‹ Prev</button><span>Page ${v.page + 1} of ${pages} · ${r.length} fixes</span><button class="ib" id="lp2">Next ›</button></div>`;
    $$("#ll tr.fx").forEach((e) => (e.onclick = () => go("fix-" + e.dataset.fx)));
    $("#lp1").onclick = () => {
      v.page = Math.max(0, v.page - 1);
      draw();
    };
    $("#lp2").onclick = () => {
      v.page = Math.min(pages - 1, v.page + 1);
      draw();
    };
  };
  $$("#view [data-t]").forEach((e) => (e.onclick = () => go(e.dataset.t)));
  $$("#view .card[data-fx]").forEach((e) => (e.onclick = () => go("fix-" + e.dataset.fx)));
  const bind = (id, k) =>
    ($(id).onchange = (e) => {
      v[k] = k === "size" ? +e.target.value : e.target.value;
      v.page = 0;
      draw();
    });
  bind("#lp", "pet");
  bind("#ls", "src");
  bind("#lz", "zone");
  bind("#lsz", "size");
  draw();
}

/* remembered across pages: plot the fixes of ALL devices of this user (default) or only the device of the fix you opened */
let FIX_ALL_DEVICES = true;

/* Step 2: one location shown on the map */
/** Step 4: one location fix on the map, with movement and signal data. */
async function fixPage(f, u, i) {
  const [lf, gn, sv, nb, zs, al, pr] = await Promise.all(
    [
      "location_fixes",
      "gnss_details",
      "serving_cells",
      "neighbor_cells",
      "safe_zones",
      "alert_data",
      "pets",
    ].map(fetchTable),
  );
  const seq = lf
  //     .filter((x) => x.pet_id === f.pet_id)
      .filter((x) => x.user_id === f.user_id && (FIX_ALL_DEVICES || x.device_id === f.device_id))
      .sort((a, b) => a.fix_timestamp - b.fix_timestamp),
    k = seq.findIndex((x) => x.id === f.id),
    prev = seq[k - 1],
    next = seq[k + 1],
    myp = pr.filter((p) => p.user_id === u.id),
    col =
      MC[
        Math.max(
          0,
          myp.findIndex((p) => p.id === f.pet_id),
        ) % MC.length
      ],
    zn = zs.filter((z) => z.user_id === u.id),
    pa = al.filter((a) => a.user_id === f.user_id && (!f.pet_id || a.pet_id === f.pet_id) && a.latitude != null),
    g = gn.find((x) => x.location_fix_id === f.id),
    c = sv.find((x) => x.location_fix_id === f.id),
    n = nb.find((x) => x.location_fix_id === f.id),
    zin = zstat(f, zs),
    kx = 111320 * Math.cos((f.latitude * Math.PI) / 180),
    ky = 110540;
  const who = pName(f.pet_id) || f.device_id; // pet can be null, use the device name
  const dkey = (t) => {
      const d = new Date(t);
      return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    },
    dk = dkey(f.fix_timestamp),
    dayFixes = seq.filter((x) => dkey(x.fix_timestamp) === dk),
    days = [...new Set(seq.map((x) => dkey(x.fix_timestamp)))],
    di = days.indexOf(dk),
    firstOf = (k) => seq.find((x) => dkey(x.fix_timestamp) === k),
    prevDay = di > 0 ? firstOf(days[di - 1]) : null,
    nextDay = di < days.length - 1 ? firstOf(days[di + 1]) : null,
    dayLabel = new Date(f.fix_timestamp).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    // one entry per day that has data: the day picker in the page header
    dayList = days.map((k) => {
      const list = seq.filter((x) => dkey(x.fix_timestamp) === k);
      return {
        k,
        id: list[0].id,
        n: list.length,
        mix: SRC_ORDER.concat([...new Set(list.map((x) => x.source))].filter((s) => s && !SRC_ORDER.includes(s)))
          .map((s) => [s, list.filter((x) => x.source === s).length])
          .filter((a) => a[1])
          .map((a) => a[1] + " " + a[0])
          .join(" · "),
        label: new Date(list[0].fix_timestamp).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
      };
    }),
    // fixes from this user's OTHER devices on the same day (they are left out unless "All devices" is ticked)
    devCount = new Set(lf.filter((x) => x.user_id === f.user_id).map((x) => x.device_id)).size,
    moreToday = FIX_ALL_DEVICES
      ? 0
      : lf.filter((x) => x.user_id === f.user_id && x.device_id !== f.device_id && dkey(x.fix_timestamp) === dk).length;
  // latest fix of the day = the "current location", shown as plain text above the map at all times
  const lastFx = dayFixes[dayFixes.length - 1] || f,
    lastCol = srcCol(lastFx.source),
    srcList = SRC_ORDER.concat([...new Set(dayFixes.map((x) => x.source))].filter((s) => s && !SRC_ORDER.includes(s))).filter((s) => dayFixes.some((x) => x.source === s));
  const row = (a, b) => `<div class="row"><span>${a}</span><span>${b ?? "—"}</span></div>`,
    hd = (t) => `<h3 style="margin:14px 0 2px">${t}</h3>`;
  const mv = (o, label) => {
    if (!o) return row(label, "none (end of trail)");
    const d = mdist(o, f),
      t = Math.abs(f.fix_timestamp - o.fix_timestamp) / 1000;
    return row(
      label,
      `${Math.round(d)} m · ${Math.round(t / 60)} min · ${((d / t) * 3.6).toFixed(1)} km/h`,
    );
  };
  $("#view").innerHTML =
    `<div class="pgh"><div><h1 class="t">Fix #${f.id} · 🐾 ${esc(who)}</h1><div class="sub">${esc(u.name)} · ${dt(f.fix_timestamp)} · ${f.latitude}, ${f.longitude}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="ib" ${prevDay ? `data-fx="${prevDay.id}"` : "disabled"}>‹ Previous day</button><span style="font-size:13px;color:var(--mu);text-align:center"><select id="dsel" title="Jump to any day that has location data">${dayList.map((d) => `<option value="${d.id}" ${d.k === dk ? "selected" : ""}>${d.label} · ${d.n} fix${d.n === 1 ? "" : "es"}${d.mix ? " (" + d.mix + ")" : ""}</option>`).join("")}</select><br>day ${di + 1} of ${days.length}</span><button class="ib" ${nextDay ? `data-fx="${nextDay.id}"` : "disabled"}>Next day ›</button></div></div>
<div class="mg"><div><div class="tool"><label class="ck"><input type="checkbox" id="mo" checked> Other fixes</label><label class="ck"><input type="checkbox" id="mz" checked> Safe zones</label><label class="ck"><input type="checkbox" id="ma" checked> Alerts</label><label class="ck"><input type="checkbox" id="mg" checked> Routes</label>${devCount > 1 ? `<label class="ck" title="Untick to plot only ${esc(f.device_id || "this device")}"><input type="checkbox" id="md" ${FIX_ALL_DEVICES ? "checked" : ""}> All devices (${devCount})</label>` : ""}<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap"><button class="ib" id="zi">＋</button><button class="ib" id="zo">－</button><button class="ib" id="zc">Centre on fix</button><button class="ib" id="zt">Fit whole day</button><select id="zsrc" title="Show one source only (GNSS, SCELL, MCELL), joined by its own route"><option value="">All sources</option>${srcList.map((s) => `<option value="${s}">${s} only (${dayFixes.filter((x) => x.source === s).length})</option>`).join("")}</select></span></div>
 <div id="cs" style="width:fit-content;max-width:100%;margin:0 0 6px;font-size:13px;line-height:1.5;color:var(--tx)"><b style="color:${lastCol}">● Current location</b> · ${esc(lastFx.device_id || "Unknown Device")} · ${dt(lastFx.fix_timestamp)} · ± ${lastFx.accuracy_m} m · ${esc(lastFx.source || "Unknown")}</div>
 <div id="gi" class="mu" style="width:fit-content;max-width:100%;margin:0 0 8px"></div>
 <div id="mp" style="height:496px;border-radius:12px;overflow:hidden;background:var(--panel);border:1px solid var(--line)"></div>
 <div class="leg" style="margin-top:8px"><span><i style="background:#1a73e8;border-radius:50% 50% 50% 0;transform:rotate(-45deg)"></i>Fix (GNSS, SCELL, MCELL)</span><span><i style="background:#1a73e8;height:3px;border-radius:2px;width:16px"></i>Route in time order</span><span><i style="background:#dc2626;border-radius:2px;transform:rotate(45deg)"></i>Alert</span><span><i style="background:#16a34a;border-radius:2px"></i>Safe zone</span><span id="rd" style="margin-left:auto;font-variant-numeric:tabular-nums"></span></div>
 <div class="pager" style="margin-top:6px">Hover a pin for details, click it to open that fix. Drag to pan, scroll to zoom.</div></div>
 <div><div class="card"><h3>Fix details</h3>${row("Fix ID", f.id) + row("Pet", esc(who)) + row("User", esc(u.name)) + row("Device", f.device_id) + row("Time", dt(f.fix_timestamp)) + row("Latitude, longitude", f.latitude + ", " + f.longitude) + row("Accuracy", "± " + f.accuracy_m + " m") + row("Source", spill(f.source)) + row("Safe-zone status", zin ? `<span class="pill ok">Inside ${esc(zin)}</span>` : '<span class="pill wa">Outside safe zones</span>')}</div>
 <div class="card" style="margin-top:14px"><h3>Movement · fix ${k + 1} of ${seq.length}</h3>${mv(prev, "From previous fix") + mv(next, "To next fix")}</div>
 <div class="card" style="margin-top:14px"><h3>Signal &amp; cell data</h3>${f.source === "GNSS" && g ? row("Altitude", g.altitude_m + " m") + row("Speed", g.speed) + row("Heading", g.heading_deg + "°") + row("Satellites", g.satellites_used + " used / " + g.satellites_tracked + " tracked") : row("GNSS", "not used, fix came from " + f.source)}${c ? hd("Serving cell") + row("MCC / MNC", c.mcc + " / " + c.mnc) + row("TAC / ECI", c.tac + " / " + c.eci) + row("PCI / EARFCN", c.pci + " / " + c.earfcn) + row("RSRP / RSRQ", c.rsrp + " dBm / " + c.rsrq + " dB") : ""}${n ? hd("Neighbour cell") + row("PCI / EARFCN", n.pci + " / " + n.earfcn) + row("RSRP / RSRQ", n.rsrp + " dBm / " + n.rsrq + " dB") : ""}</div></div></div>`;
  const q = (x) => document.querySelector("#view " + x);

  /* ---------- Google Maps ---------- */
  const showMsg = (html) =>
    (q("#mp").innerHTML =
      `<div style="height:100%;display:grid;place-items:center;text-align:center;padding:24px;color:var(--mu);font-size:14px;line-height:1.6">${html}</div>`);

  // Google calls this global if the API key is wrong, restricted, or billing is off.
  window.gm_authFailure = () =>
    showMsg(
      "<b>Google Maps rejected the API key.</b><br>Check the key, its allowed websites (HTTP referrers) and that billing and the Maps JavaScript API are enabled.",
    );

  // The Maps script is loaded async from index.template.html, so wait for it (max ~8 s).
  const mapsReady = () =>
    new Promise((ok, no) => {
      let n = 0;
      const t = setInterval(() => {
        if (window.google && google.maps && google.maps.Map) {
          clearInterval(t);
          ok();
        } else if (++n > 80) {
          clearInterval(t);
          no();
        }
      }, 100);
    });

  try {
    await mapsReady();
  } catch {
    showMsg(
      "<b>Google Maps did not load.</b><br>Add your key to the script tag in <code>index.template.html</code> and run <code>python3 build.py</code>.",
    );
    $$("#view [data-t]").forEach((e) => (e.onclick = () => go(e.dataset.t)));
    $$("#view [data-fx]").forEach((e) => (e.onclick = () => go("fix-" + e.dataset.fx)));
    return;
  }

  const ll = (x) => ({ lat: x.latitude, lng: x.longitude });
  const here = ll(f);
  const map = new google.maps.Map(q("#mp"), {
    center: here,
    zoom: 17,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: false, // we have our own + / - buttons in the toolbar
    gestureHandling: "greedy", // wheel zooms, drag pans, no ctrl-key needed
  });

  /* ---------- colours: one blue for every source ---------- */
  const pal = () => ["#1a73e8", "#0b4fb3", "#5b9cf5"]; // [main, dark, light] - the same for every source
  const pin = (sel, scale, src) => {
    const [pc, pd, pl] = pal(src);
    return {
      path: "M0,0 C-4,-10 -12,-14 -12,-24 A12,12 0 1,1 12,-24 C12,-14 4,-10 0,0 Z",
      scale,
      fillColor: sel ? pc : pl,
      fillOpacity: 1,
      strokeColor: sel ? "#fff" : pd,
      strokeWeight: sel ? 2 : 1.2,
      labelOrigin: new google.maps.Point(0, -24),
    };
  };
  const diamond = (fill) => ({
    path: "M 0,-1 L 1,0 L 0,1 L -1,0 Z",
    scale: 9,
    fillColor: fill,
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 1.5,
  });
  // straight-line distance in metres between two fixes
  const hav = (a, b) => {
    const rad = Math.PI / 180,
      dLa = (b.latitude - a.latitude) * rad,
      dLo = (b.longitude - a.longitude) * rad,
      s = Math.sin(dLa / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLo / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(s));
  };

  /* ---------- numbering: time order over the whole day, or within one source when a source filter is chosen ---------- */
  const deviceName0 = f.device_id || "this device";
  const allNo = new Map(dayFixes.map((x, i) => [x.id, i + 1]));
  const srcNo = new Map();
  srcList.forEach((sc) => dayFixes.filter((x) => x.source === sc).forEach((x, i) => srcNo.set(x.id, i + 1)));
  let only = ""; // "" = all sources, otherwise "GNSS" / "SCELL" / "MCELL" ...
  const noOf = (x) => (only && srcNo.has(x.id) ? srcNo.get(x.id) : allNo.get(x.id));
  // fixes at the same spot (same position to ~1 m) share ONE pin, labelled with all their numbers (e.g. "2,3")
  const gkey = (x) => x.latitude.toFixed(5) + "," + x.longitude.toFixed(5);
  const groups = new Map();
  dayFixes.forEach((x) => groups.set(gkey(x), [...(groups.get(gkey(x)) || []), x]));
  const members = (x) => groups.get(gkey(x));
  const shown = (x) => !only || x.source === only;
  const lab = (x, size, always) => {
    if (!always && dayFixes.length > 40) return null;
    const nums = members(x).filter(shown).map(noOf);
    if (nums.length < 2) return { text: String(noOf(x)), color: "#fff", fontSize: size, fontWeight: "700" };
    const text = nums.length === 2 ? nums.join(",") : nums[0] + "–" + nums[nums.length - 1];
    return { text, color: "#fff", fontSize: "10px", fontWeight: "700" };
  };

  /* ---------- every source gets the same treatment: its fixes of the day joined by one white-edged line
     in the source colour, with Google-navigation chevrons showing the direction of travel ---------- */
  const navIcon = () => ({ path: "M 0,-1.2 L 0.95,0.9 L 0,0.35 L -0.95,0.9 Z", scale: 7, fillColor: "#fff", fillOpacity: 1, strokeColor: "#0b4fb3", strokeWeight: 1.2 });
  const routes = []; // { s: "" for the whole-day route through every fix, or a source name, line, casing }
  const stat = {}; // fix count + route length in metres, for "" (whole day) and each source
  ["", ...srcList].forEach((sc) => {
    const fx = sc ? dayFixes.filter((x) => x.source === sc) : dayFixes;
    stat[sc] = { n: fx.length, m: 0 };
    [...new Set(fx.map((x) => x.device_id))].forEach((d) => {
      const l = fx.filter((x) => x.device_id === d); // already in time order
      stat[sc].m += l.reduce((t, x, k) => (k ? t + hav(l[k - 1], x) : t), 0);
      if (l.length < 2) return; // one fix has nothing to connect
      const path = l.map(ll);
      const casing = new google.maps.Polyline({ map, path, strokeColor: "#fff", strokeOpacity: 1, strokeWeight: 8, zIndex: 1, clickable: false });
      const line = new google.maps.Polyline({ map, path, strokeColor: "#1a73e8", strokeOpacity: 1, strokeWeight: 5, zIndex: 2, icons: [{ icon: navIcon(), offset: "50%", repeat: "90px" }] });
      routes.push({ s: sc, line, casing });
    });
  });
  // with "All sources" the one route through every fix (1 -> 2 -> 3 ... whatever the source) is shown; a source filter shows that source's own route
  const routeShown = (r) => (only ? r.s === only : r.s === "");
  const fmtM = (m) => (m >= 1000 ? (m / 1000).toFixed(2) + " km" : Math.round(m) + " m");
  q("#gi").innerHTML =
    (srcList.length > 1 ? `<b>Whole day</b> ${stat[""].n} fixes · ${fmtM(stat[""].m)} route &nbsp;&nbsp;` : "") +
    (srcList
      .map((sc) => `<b style="color:${srcCol(sc)}">${esc(sc)}</b> ${stat[sc].n} fix${stat[sc].n === 1 ? "" : "es"}${stat[sc].n > 1 ? " · " + fmtM(stat[sc].m) + " route" : ""}`)
      .join(" &nbsp;|&nbsp; ") || "No fixes on this day") +
    (dayFixes.length < 2
      ? `. Only ${dayFixes.length} fix is stored for ${esc(deviceName0)} on this day, so there is nothing to connect. Pick another day above${moreToday ? " or tick All devices" : ""}.`
      : "");

  /* ---------- accuracy ring of the selected fix, in its source colour ---------- */
  const ring = pal(f.source)[0];
  new google.maps.Circle({
    map,
    center: here,
    radius: f.accuracy_m,
    strokeColor: ring,
    strokeOpacity: 0.8,
    strokeWeight: 1,
    fillColor: ring,
    fillOpacity: 0.13,
    clickable: false,
  });

  /* ---------- hover card: our own small tooltip, shown ONLY while the mouse is over a pin.
     It sizes itself to its text (no empty header area like Google's InfoWindow) and never stays open. ---------- */
  const mpEl = q("#mp");
  mpEl.style.position = "relative";
  const tip = document.createElement("div");
  tip.style.cssText =
    "position:absolute;display:none;z-index:5;pointer-events:none;width:max-content;box-sizing:border-box;" +
    "background:#fff;color:#000;font:13px/1.5 Arial,sans-serif;padding:6px 10px;border-radius:8px;white-space:nowrap;" +
    "box-shadow:0 2px 10px rgba(0,0,0,.3)";
  mpEl.appendChild(tip);
  let px = 0,
    py = 0; // pointer position inside the map box
  const place = () => {
    const w = tip.offsetWidth,
      h = tip.offsetHeight;
    let x = px + 14,
      y = py - h - 14; // above and to the right of the pointer
    if (x + w > mpEl.clientWidth - 4) x = px - w - 14;
    if (y < 4) y = py + 18;
    tip.style.left = Math.max(4, x) + "px";
    tip.style.top = y + "px";
  };
  const hideTip = () => (tip.style.display = "none");
  mpEl.addEventListener("mousemove", (e) => {
    const r = mpEl.getBoundingClientRect();
    px = e.clientX - r.left;
    py = e.clientY - r.top;
    if (tip.style.display !== "none") place();
  });
  mpEl.addEventListener("mouseleave", hideTip);
  map.addListener("dragstart", hideTip);
  map.addListener("zoom_changed", hideTip);
  const hover = (marker, lift, html) => {
    marker.addListener("mouseover", () => {
      tip.innerHTML = typeof html === "function" ? html() : html;
      tip.style.display = "block";
      place();
    });
    marker.addListener("mouseout", hideTip);
  };

  const deviceName = f.device_id || "Unknown Device";
  const last = dayFixes[dayFixes.length - 1]; // latest fix of the day = current location
  const fixHtml = (x) =>
    `<div style="font-weight:700;color:${pal(x.source)[0]}">● ${x.id === last.id ? "Current location" : "Fix #" + noOf(x)}</div>` +
    `<div style="font-weight:700">${esc(x.device_id || deviceName)} · ${dt(x.fix_timestamp)}</div>` +
    `<div style="color:#333">± ${x.accuracy_m} m · ${esc(x.source || "Unknown")}</div>`;

  // card for a pin: one fix, or every fix that sits on the same spot
  const groupHtml = (x) => {
    const m = members(x).filter(shown);
    if (m.length < 2) return fixHtml(x);
    return (
      `<div style="font-weight:700">${m.length} fixes at this spot</div>` +
      m
        .map(
          (y) =>
            `<div style="margin-top:3px"><b style="color:${pal(y.source)[0]}">● #${noOf(y)}${y.id === last.id ? " · Current location" : ""}</b> · ${esc(y.device_id || deviceName)} · ${dt(y.fix_timestamp)} · ± ${y.accuracy_m} m · ${esc(y.source || "Unknown")}</div>`,
        )
        .join("")
    );
  };

  /* ---------- the selected fix ---------- */
  const me = new google.maps.Marker({
    map,
    position: here,
    icon: pin(true, 1.4, f.source),
    label: lab(f, "12px", true),
    zIndex: 1000,
  });
  hover(me, 24 * 1.4 + 6, () => groupHtml(f));

  /* ---------- every other fix of the same day: hover = card, click = open that fix ---------- */
  const others = [],
    otherFix = new Map();
  dayFixes.forEach((x) => {
    const mem = members(x);
    if (mem.some((y) => y.id === f.id) || mem[0].id !== x.id) return; // already drawn by the selected pin, or by the first fix on this spot
    const scale = dayFixes.length <= 40 ? 0.9 : 0.6;
    const src = SRC_ORDER.find((sc) => mem.some((y) => y.source === sc)) || x.source;
    const m = new google.maps.Marker({ map, position: ll(x), icon: pin(false, scale, src), label: lab(x, "10px") });
    hover(m, 24 * scale + 6, () => groupHtml(x));
    m.addListener("click", () => go("fix-" + mem[mem.length - 1].id)); // opens the newest fix on this spot
    others.push(m);
    otherFix.set(m, x);
  });

  /* ---------- safe zones: circles and rectangles (green = active, grey = inactive) ---------- */
  const zones = zn.map((z) => {
    const act = z.is_active,
      style = {
        map,
        strokeColor: act ? "#16a34a" : "#64748b",
        strokeWeight: 1.5,
        fillColor: act ? "#16a34a" : "#64748b",
        fillOpacity: act ? 0.08 : 0.05,
        clickable: false,
      };
    if (z.shape === "rectangle") {
      const dLat = z.half_height_meters / 110540,
        dLng = z.half_width_meters / (111320 * Math.cos((z.latitude * Math.PI) / 180));
      return new google.maps.Rectangle({
        ...style,
        bounds: {
          north: z.latitude + dLat,
          south: z.latitude - dLat,
          east: z.longitude + dLng,
          west: z.longitude - dLng,
        },
      });
    }
    return new google.maps.Circle({ ...style, center: ll(z), radius: z.radius_m });
  });

  /* ---------- alerts raised by this pet (red / amber / teal diamonds), card on hover ---------- */
  const alerts = pa.filter((a) => dkey(a.triggered_at) === dk).map((a) => {
    const m = new google.maps.Marker({ map, position: ll(a), icon: diamond(SVR[a.severity]) });
    hover(m, 9 + 6, `<div style="font-weight:700;color:${SVR[a.severity]}">◆ ${esc(a.alert_type)}</div><div>${esc(a.severity)} · ${dt(a.triggered_at)}</div>`);
    return m;
  });

  /* ---------- what is visible: checkboxes + source filter ---------- */
  const on = { o: true, g: true };
  const applyVis = () => {
    others.forEach((m) => {
      const x = otherFix.get(m);
      m.setMap(on.o && members(x).some(shown) ? map : null);
      m.setLabel(lab(x, "10px"));
    });
    me.setLabel(lab(f, "12px", true));
    routes.forEach((r) => {
      const m = on.g && routeShown(r) ? map : null;
      r.line.setMap(m);
      r.casing.setMap(m);
    });
    hideTip();
  };

  /* ---------- fit helpers ---------- */
  const fitFix = () => {
    const b = new google.maps.Circle({
      center: here,
      radius: Math.max(f.accuracy_m * 3, 150),
    }).getBounds();
    [prev, next].filter(Boolean).forEach((x) => b.extend(ll(x)));
    map.fitBounds(b, 40);
  };
  const fitList = (list) => {
    if (list.length < 2) {
      map.setCenter(list.length ? ll(list[0]) : here);
      map.setZoom(17);
      return;
    }
    const b = new google.maps.LatLngBounds();
    list.forEach((x) => b.extend(ll(x)));
    map.fitBounds(b, 50);
  };
  const fitTrail = () => fitList(dayFixes);

  /* ---------- toolbar ---------- */
  q("#zi").onclick = () => map.setZoom(map.getZoom() + 1);
  q("#zo").onclick = () => map.setZoom(map.getZoom() - 1);
  q("#zc").onclick = fitFix;
  q("#zt").onclick = fitTrail;
  q("#mo").onchange = (e) => {
    on.o = e.target.checked;
    applyVis();
  };
  q("#mg").onchange = (e) => {
    on.g = e.target.checked;
    applyVis();
  };
  q("#mz").onchange = (e) => zones.forEach((m) => m.setMap(e.target.checked ? map : null));
  q("#ma").onchange = (e) => alerts.forEach((m) => m.setMap(e.target.checked ? map : null));

  // source filter: hide the other sources, number this source's fixes 1..n, show its route and zoom to it
  q("#zsrc").onchange = (e) => {
    only = e.target.value;
    routes.forEach((r) => {
      r.line.setOptions({ strokeWeight: only ? 6 : 5 });
      r.casing.setOptions({ strokeWeight: only ? 9 : 8 });
    });
    if (only) {
      on.g = true;
      q("#mg").checked = true;
    }
    applyVis();
    only ? fitList(dayFixes.filter((x) => x.source === only)) : fitTrail();
  };

  // day picker + "All devices"
  q("#dsel").onchange = (e) => go("fix-" + e.target.value);
  if (q("#md")) {
    q("#md").onchange = (e) => {
      FIX_ALL_DEVICES = e.target.checked;
      fixPage(f, u, i); // redraw with the other devices included (or removed)
    };
  }

  // live coordinates under the cursor
  map.addListener("mousemove", (e) => {
    q("#rd").textContent = e.latLng.lat().toFixed(5) + ", " + e.latLng.lng().toFixed(5);
  });

  $$("#view [data-t]").forEach((e) => (e.onclick = () => go(e.dataset.t)));
  $$("#view [data-fx]").forEach((e) => (e.onclick = () => go("fix-" + e.dataset.fx)));
  fitTrail(); // open on the whole day
}
