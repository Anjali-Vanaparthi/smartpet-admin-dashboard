/* ===== TABLE PAGE ===== */
/** Generic page for any table, with Data, Structure, Relationships, Indexes and DDL tabs. */
async function tableView(t) {
  const cs = cols(t),
    rows = await fetchTable(t),
    fk = Object.fromEntries(fks(t)),
    g = S[t][0],
    keys = Object.keys(S),
    i = keys.indexOf(t),
    ix = D[t][1].split(";");
  st = {
    sort: null,
    dir: 1,
    q: "",
    page: 0,
    size: 10,
    tab: "data",
    user: pendUser || "",
    pet: "",
    group: t !== "users" && cs.some((c) => c.n === "user_id"),
  };
  pendUser = null;
  const pv = keys[i - 1],
    nx = keys[i + 1],
    hasU = cs.some((c) => c.n === "user_id"),
    hasP = cs.some((c) => c.n === "pet_id");
  $("#view").innerHTML =
    `<div class="pgh"><div><h1 class="t"><span style="color:${GC[g]}">●</span> ${t}</h1><div class="sub">${D[t][0]}</div></div><div><span class="pill nt">${g} domain</span> ${PROPT.has(t) ? '<span class="pill wa">Proposed table</span>' : PROPC[t] ? '<span class="pill wa">Proposed columns</span>' : ""}</div></div>
 <div class="strip"><div><b>${fmt(TOTAL[t])}</b><span>Rows</span></div><div><b>${cs.length}</b><span>Columns</span></div><div><b>${fks(t).length}</b><span>Foreign keys</span></div><div><b>${refBy(t).length}</b><span>Referenced by</span></div><div><b>${ix.length}</b><span>Indexes / constraints</span></div><div><b>${TRG.has(t) ? 1 : 0}</b><span>Triggers</span></div></div>
 <div class="tabs">${[
   ["data", "Data"],
   ["structure", "Structure"],
   ["relations", "Relationships"],
   ["indexes", "Indexes & constraints"],
   ["ddl", "SQL (DDL)"],
 ]
   .map(([k, l]) => `<button data-k="${k}">${l}</button>`)
   .join("")}</div>
 <div id="tab"></div>`;
  const links = (a) =>
    a
      .map(
        (f) =>
          `<div class="row"><a class="lk" data-t="${f[0]}">${f[0]}</a><span>${f[1]}</span></div>`,
      )
      .join("") || '<span style="color:var(--mu)">None</span>';
  const filt = () => {
    let r = rows.filter(
      (x) =>
        (!st.user || x.user_id === st.user) &&
        (!st.pet || x.pet_id === st.pet) &&
        (!st.q ||
          cs.some(
            (c) =>
              !HIDE.has(c.n) &&
              String(x[c.n] ?? "")
                .toLowerCase()
                .includes(st.q.toLowerCase()),
          ) ||
          (uName(x.user_id) || "").toLowerCase().includes(st.q.toLowerCase()) ||
          (pName(x.pet_id) || "").toLowerCase().includes(st.q.toLowerCase())),
    );
    if (st.sort)
      r = [...r].sort((a, b) => {
        const x = a[st.sort],
          y = b[st.sort];
        return (x === y ? 0 : x == null ? 1 : y == null ? -1 : x > y ? 1 : -1) * st.dir;
      });
    if (st.group && hasU)
      r = [...r].sort((a, b) =>
        (uName(a.user_id) || "~").localeCompare(uName(b.user_id) || "~"),
      );
    return r;
  };
  function drawRows() {
    const r = filt(),
      P = st.size,
      pages = Math.max(1, Math.ceil(r.length / P));
    st.page = Math.min(st.page, pages - 1);
    const pg = r.slice(st.page * P, st.page * P + P);
    $("#tb").innerHTML =
      `<div class="wrap"><table><thead><tr>${cs.map((c) => `<th data-c="${c.n}">${c.n}${c.n === "id" ? '<span class="tag">PK</span>' : ""}${fk[c.n] ? '<span class="tag">FK</span>' : ""}${(PROPC[t] || []).includes(c.n) ? '<span class="tag" style="background:#fef3c7;color:#b45309">NEW</span>' : ""} ${st.sort === c.n ? (st.dir > 0 ? "▲" : "▼") : ""}<small>${PT[c.ty]}</small></th>`).join("")}</tr></thead><tbody>${
        pg
          .map((x, j) => {
            const gh =
              st.group && hasU && (j === 0 || x.user_id !== pg[j - 1].user_id)
                ? `<tr class="gh"><td colspan="${cs.length}">👤 ${uName(x.user_id) ? `<a class="lk" data-u="${users.indexOf(x.user_id)}"><b>${uName(x.user_id)}</b></a>` : "<b>No user linked</b>"} <span style="color:var(--mu)">· ${(U.find((u) => u.id === x.user_id) || {}).email || ""} · ${r.filter((y) => y.user_id === x.user_id).length} rows</span></td></tr>`
                : "";
            return (
              gh +
              `<tr class="cl" data-j="${j}">${cs.map((c) => cell(x[c.n], c)).join("")}</tr>`
            );
          })
          .join("") || `<tr><td colspan="${cs.length}">No matching rows</td></tr>`
      }</tbody></table></div>
  <div class="pager"><button class="ib" id="p1">‹ Prev</button><span>Page ${st.page + 1} of ${pages} · ${r.length} sample rows shown</span><button class="ib" id="p2">Next ›</button></div>`;
    $$("#tb th").forEach(
      (h) =>
        (h.onclick = () => {
          st.dir = st.sort === h.dataset.c ? -st.dir : 1;
          st.sort = h.dataset.c;
          drawRows();
        }),
    );
    $$("#tb tr.cl").forEach((e) => (e.onclick = () => drawer(t, pg[+e.dataset.j])));
    $("#p1").onclick = () => {
      st.page = Math.max(0, st.page - 1);
      drawRows();
    };
    $("#p2").onclick = () => {
      st.page = Math.min(pages - 1, st.page + 1);
      drawRows();
    };
  }
  const tabs = {
    data() {
      $("#tab").innerHTML =
        `<div class="tool"><input class="q" id="q" placeholder="Search ${t}…" value="${esc(st.q)}">${hasU ? `<select id="su"><option value="">All users</option>${U.map((u) => `<option value="${u.id}" ${st.user === u.id ? "selected" : ""}>${u.name}</option>`).join("")}</select>` : ""}${hasP ? `<select id="sp"><option value="">All pets</option>${pets.map((p, i) => `<option value="${p}" ${st.pet === p ? "selected" : ""}>${petName[p]} · ${uName(petOwner[p])}</option>`).join("")}</select>` : ""}${hasU && t !== "users" ? `<label class="ck"><input type="checkbox" id="sg" ${st.group ? "checked" : ""}> Group by user</label>` : ""}<select id="sz">${[10, 25, 50].map((n) => `<option ${n === st.size ? "selected" : ""}>${n}</option>`).join("")}</select><span style="color:var(--mu)">rows per page · click a row for full record</span><button class="ib" id="cp" style="margin-left:auto">Copy CSV</button></div><div id="tb"></div>`;
      $("#q").oninput = (e) => {
        st.q = e.target.value;
        st.page = 0;
        drawRows();
      };
      const bind = (id, k, f) => {
        const e = $(id);
        if (e)
          e.onchange = (ev) => {
            st[k] = f(ev.target);
            st.page = 0;
            drawRows();
          };
      };
      bind("#su", "user", (e) => e.value);
      bind("#sp", "pet", (e) => e.value);
      bind("#sg", "group", (e) => e.checked);
      $("#sz").onchange = (e) => {
        st.size = +e.target.value;
        st.page = 0;
        drawRows();
      };
      $("#cp").onclick = () => {
        const csv = [
          cs.map((c) => c.n).join(","),
          ...filt().map((r) =>
            cs.map((c) => (HIDE.has(c.n) ? "" : JSON.stringify(r[c.n] ?? ""))).join(","),
          ),
        ].join("\n");
        const done = () => toast("CSV copied to clipboard");
        try {
          navigator.clipboard.writeText(csv).then(done, () => {
            throw 0;
          });
        } catch (e) {
          const a = document.createElement("textarea");
          a.value = csv;
          document.body.appendChild(a);
          a.select();
          try {
            document.execCommand("copy");
            done();
          } catch (_) {
            toast("Copy not permitted here");
          }
          a.remove();
        }
      };
      drawRows();
    },
    structure() {
      $("#tab").innerHTML =
        `<div class="wrap"><table><thead><tr><th>#</th><th>Column</th><th>PostgreSQL type</th><th>Role</th><th>Nulls</th><th>Distinct</th><th>Sample value</th></tr></thead><tbody>${cs
          .map((c, j) => {
            const v = rows.map((r) => r[c.n]),
              nn = v.filter((x) => x == null).length,
              s = v.find((x) => x != null),
              role =
                c.n === "id"
                  ? '<span class="pill ok">Primary key</span>'
                  : fk[c.n]
                    ? `<span class="pill nt">FK → ${fk[c.n]}</span>`
                    : c.n === "goal_met"
                      ? '<span class="pill nt">Generated</span>'
                      : "—";
            return `<tr><td>${j + 1}</td><td><b>${c.n}</b></td><td class="m">${PT[c.ty]}</td><td>${role}</td><td>${Math.round((nn / v.length) * 100)}%</td><td>${new Set(v).size}</td><td class="m">${HIDE.has(c.n) ? "masked" : s == null ? "—" : esc(c.ty === "ts" ? dt(s) : String(s).slice(0, 40))}</td></tr>`;
          })
          .join(
            "",
          )}</tbody></table></div><div class="pager">Null % and distinct counts are computed from the ${rows.length}-row sample.</div>`;
    },
    relations() {
      $("#tab").innerHTML =
        `<div class="grid two"><div class="card"><h3>This table references</h3>${
          fks(t)
            .map(
              (f) =>
                `<div class="row"><span>${t}.${f[0]}</span><a class="lk" data-t="${f[1]}">${f[1]}.id →</a></div>`,
            )
            .join("") || '<span style="color:var(--mu)">Nothing: this is a root table.</span>'
        }</div><div class="card"><h3>Referenced by</h3>${links(refBy(t))}</div></div>`;
      $$("#tab [data-t]").forEach((e) => (e.onclick = () => go(e.dataset.t)));
    },
    indexes() {
      $("#tab").innerHTML =
        `<div class="grid two"><div class="card"><h3>Indexes &amp; constraints</h3>${ix
          .map((x) => {
            const [k, ...r] = x.split(" ");
            return `<div class="row"><span><span class="tag" style="margin:0 8px 0 0">${k}</span>${esc(r.join(" "))}</span></div>`;
          })
          .join(
            "",
          )}</div><div class="card"><h3>Triggers</h3>${TRG.has(t) ? `<div class="row"><span>trg_${t.replace("users", "users")}_updated</span><span>BEFORE UPDATE → set_updated_at()</span></div>` : '<span style="color:var(--mu)">No triggers defined.</span>'}<h3 style="margin-top:18px">Foreign keys</h3>${
          fks(t)
            .map(
              (f) =>
                `<div class="row"><span>${t}_${f[0]}_fkey</span><span>${f[0]} → ${f[1]}(id) · ${f[0] === "pet_id" ? "ON DELETE SET NULL" : "ON DELETE CASCADE"}</span></div>`,
            )
            .join("") || '<span style="color:var(--mu)">None</span>'
        }</div></div>`;
    },
    ddl() {
      $("#tab").innerHTML = `<pre>${esc(
        `CREATE TABLE public.${t} (\n` +
          cs
            .map((c) => `  ${c.n} ${PT[c.ty]}${c.n === "id" ? " PRIMARY KEY" : ""}`)
            .concat(
              fks(t).map((f) => `  FOREIGN KEY (${f[0]}) REFERENCES public.${f[1]}(id)`),
            )
            .join(",\n") +
          "\n);",
      )}</pre><div class="pager">Reconstructed from the column list; defaults and exact constraint options are omitted. Use your original dump for the authoritative DDL.</div>`;
    },
  };
  const show = (k) => {
    st.tab = k;
    $$(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.k === k));
    tabs[k]();
    Motion.replay($("#tab")); // fade the new tab in
  };
  $$(".tabs button").forEach((b) => (b.onclick = () => show(b.dataset.k)));
  show("data");
}
