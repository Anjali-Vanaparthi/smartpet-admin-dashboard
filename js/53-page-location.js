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
      .filter((x) => x.pet_id === f.pet_id)
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
    pa = al.filter((a) => a.pet_id === f.pet_id && a.latitude != null),
    g = gn.find((x) => x.location_fix_id === f.id),
    c = sv.find((x) => x.location_fix_id === f.id),
    n = nb.find((x) => x.location_fix_id === f.id),
    zin = zstat(f, zs),
    kx = 111320 * Math.cos((f.latitude * Math.PI) / 180),
    ky = 110540;
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
    `<div class="pgh"><div><h1 class="t">Fix #${f.id} · 🐾 ${esc(pName(f.pet_id))}</h1><div class="sub">${esc(u.name)} · ${dt(f.fix_timestamp)} · ${f.latitude}, ${f.longitude}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="ib" ${prev ? `data-fx="${prev.id}"` : "disabled"}>‹ Previous fix</button><button class="ib" ${next ? `data-fx="${next.id}"` : "disabled"}>Next fix ›</button></div></div>
 <div class="mg"><div><div class="tool"><label class="ck"><input type="checkbox" id="mo" checked> Other fixes</label><label class="ck"><input type="checkbox" id="mz" checked> Safe zones</label><label class="ck"><input type="checkbox" id="ma" checked> Alerts</label><span style="margin-left:auto;display:flex;gap:6px"><button class="ib" id="zi">＋</button><button class="ib" id="zo">－</button><button class="ib" id="zc">Centre on fix</button><button class="ib" id="zt">Full trail</button></span></div>
 <div id="mp" style="height:496px;border-radius:12px;overflow:hidden;background:var(--panel);border:1px solid var(--line)"></div>
 <div class="leg" style="margin-top:8px">${["GNSS", "SCELL", "MCELL", "WIFI"].map((x) => `<span><i style="background:${SC[x]}"></i>${x}</span>`).join("")}<span><i style="background:${col}"></i>${esc(pName(f.pet_id))} trail</span><span><i style="background:#dc2626;border-radius:2px;transform:rotate(45deg)"></i>Alert</span><span><i style="background:#16a34a;border-radius:2px"></i>Safe zone</span><span id="rd" style="margin-left:auto;font-variant-numeric:tabular-nums"></span></div>
 <div class="pager" style="margin-top:6px">Click any other point to jump to that fix. Drag to pan, scroll to zoom.</div></div>
 <div><div class="card"><h3>Fix details</h3>${row("Fix ID", f.id) + row("Pet", esc(pName(f.pet_id))) + row("User", esc(u.name)) + row("Device", f.device_id) + row("Time", dt(f.fix_timestamp)) + row("Latitude, longitude", f.latitude + ", " + f.longitude) + row("Accuracy", "± " + f.accuracy_m + " m") + row("Source", spill(f.source)) + row("Safe-zone status", zin ? `<span class="pill ok">Inside ${esc(zin)}</span>` : '<span class="pill wa">Outside safe zones</span>')}</div>
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

  const dot = (fill, scale) => ({
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: fill,
    fillOpacity: 1,
    strokeColor: col,
    strokeWeight: 2,
  });
  const diamond = (fill) => ({
    path: "M 0,-1 L 1,0 L 0,1 L -1,0 Z",
    scale: 9,
    fillColor: fill,
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 1.5,
  });

  // trail: faint full path + highlighted previous -> this -> next
  new google.maps.Polyline({
    map,
    path: seq.map(ll),
    strokeColor: col,
    strokeOpacity: 0.3,
    strokeWeight: 2,
  });
  new google.maps.Polyline({
    map,
    path: [prev, f, next].filter(Boolean).map(ll),
    strokeColor: col,
    strokeOpacity: 0.9,
    strokeWeight: 4,
  });

  // accuracy circle + the selected fix
  new google.maps.Circle({
    map,
    center: here,
    radius: f.accuracy_m,
    strokeColor: "#4f7cff",
    strokeOpacity: 0.8,
    strokeWeight: 1,
    fillColor: "#4f7cff",
    fillOpacity: 0.13,
    clickable: false,
  });
  const me = new google.maps.Marker({
    map,
    position: here,
    title: `${pName(f.pet_id)} · Fix #${f.id}`,
    icon: { ...dot(SC[f.source], 10), strokeColor: "#fff", strokeWeight: 3 },
    zIndex: 1000,
  });
  const info = new google.maps.InfoWindow({
    content: `<b>${esc(pName(f.pet_id))}</b> · ${dt(f.fix_timestamp).slice(-5)}<br>± ${f.accuracy_m} m · ${f.source}`,
  });
  info.open({ map, anchor: me });
  me.addListener("click", () => info.open({ map, anchor: me }));

  // other fixes of this pet (click to jump to that fix)
  const others = seq
    .filter((x) => x.id !== f.id)
    .map((x) => {
      const pn = x === prev || x === next,
        m = new google.maps.Marker({
          map,
          position: ll(x),
          icon: dot(SC[x.source], pn ? 7 : 5),
          title: `${pn ? (x === prev ? "Previous · " : "Next · ") : ""}Fix #${x.id} · ${x.source} · ± ${x.accuracy_m} m · ${dt(x.fix_timestamp)}`,
        });
      m.addListener("click", () => go("fix-" + x.id));
      return m;
    });

  // safe zones: circles and rectangles (green = active, grey = inactive)
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

  // alerts raised by this pet (red / amber / teal diamonds)
  const alerts = pa.map((a) => {
    const m = new google.maps.Marker({
      map,
      position: ll(a),
      icon: diamond(SVR[a.severity]),
      title: `${a.alert_type} · ${a.severity} · ${dt(a.triggered_at)}`,
    });
    return m;
  });

  // fit helpers
  const fitFix = () => {
    const b = new google.maps.Circle({
      center: here,
      radius: Math.max(f.accuracy_m * 3, 150),
    }).getBounds();
    [prev, next].filter(Boolean).forEach((x) => b.extend(ll(x)));
    map.fitBounds(b, 40);
  };
  const fitTrail = () => {
    const b = new google.maps.LatLngBounds();
    seq.forEach((x) => b.extend(ll(x)));
    map.fitBounds(b, 40);
  };

  // toolbar
  q("#zi").onclick = () => map.setZoom(map.getZoom() + 1);
  q("#zo").onclick = () => map.setZoom(map.getZoom() - 1);
  q("#zc").onclick = fitFix;
  q("#zt").onclick = fitTrail;
  q("#mo").onchange = (e) => others.forEach((m) => m.setMap(e.target.checked ? map : null));
  q("#mz").onchange = (e) => zones.forEach((m) => m.setMap(e.target.checked ? map : null));
  q("#ma").onchange = (e) => alerts.forEach((m) => m.setMap(e.target.checked ? map : null));

  // live coordinates under the cursor
  map.addListener("mousemove", (e) => {
    q("#rd").textContent = e.latLng.lat().toFixed(5) + ", " + e.latLng.lng().toFixed(5);
  });

  $$("#view [data-t]").forEach((e) => (e.onclick = () => go(e.dataset.t)));
  $$("#view [data-fx]").forEach((e) => (e.onclick = () => go("fix-" + e.dataset.fx)));
  fitFix();
}
