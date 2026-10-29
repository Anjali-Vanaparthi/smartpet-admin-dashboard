/* ===== HELPERS ===== */
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)],
  esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m],
    );
const fmt = (n) => n.toLocaleString("en-US"),
  go = (t) => {
    location.hash = t;
    document.body.classList.remove("open");
  };
const dt = (v) => {
  const d = new Date(v);
  return v == null || isNaN(d) ? "—" : d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
};
/** Show a short message at the bottom of the screen. */
function toast(m) {
  const e = $("#toast");
  e.textContent = m;
  e.classList.add("o");
  setTimeout(() => e.classList.remove("o"), 1800);
}
/** Render one table cell: user/pet names as links, pills for flags, masked secrets. */
function cell(v, c) {
  if (v === null || v === undefined) return `<td class="n">NULL</td>`;
  if (c.n === "user_id" && uName(v))
    return `<td title="${v}"><a class="lk" data-u="${users.indexOf(v)}">${uName(v)}</a></td>`;
  if (c.n === "pet_id" && pName(v)) return `<td title="${v}">🐾 ${pName(v)}</td>`;
  if (HIDE.has(c.n)) return `<td class="m">••••••••</td>`;
  if (c.ty === "bool") return `<td><span class="pill ${v ? "ok" : "nt"}">${v}</span></td>`;
  if (c.ty === "ts") return `<td title="${new Date(v).toISOString()}">${dt(v)}</td>`;
  if (c.ty === "uuid") return `<td class="m" title="${v}">${String(v).slice(0, 8)}…</td>`;
  if (c.n === "severity")
    return `<td><span class="pill ${v === "critical" ? "cr" : v === "warning" ? "wa" : "ok"}">${v}</span></td>`;
  return `<td title="${esc(v)}"${typeof v === "number" ? ' class="m"' : ""}>${esc(v)}</td>`;
}
/** Open the right-hand drawer with every field of one row. */
function drawer(t, r) {
  const cs = cols(t),
    fk = Object.fromEntries(fks(t));
  $("#drt").textContent = t + " · record";
  $("#drb").innerHTML = cs
    .map((c) => {
      let v = r[c.n],
        s =
          v == null
            ? "NULL"
            : HIDE.has(c.n)
              ? "•••• masked ••••"
              : c.n === "user_id" && uName(v)
                ? uName(v) + " · " + v
                : c.n === "pet_id" && pName(v)
                  ? pName(v) + " · " + v
                  : c.ty === "ts"
                    ? dt(v) + " (" + new Date(v).toISOString() + ")"
                    : String(v);
      return `<div class="row"><span>${c.n} · ${PT[c.ty]}${c.n === "id" ? " · PK" : ""}${fk[c.n] ? " · FK→" + fk[c.n] : ""}</span><span>${esc(s)}</span></div>`;
    })
    .join("");
  if (t === "users")
    $("#drb").insertAdjacentHTML(
      "afterbegin",
      `<div style="padding:12px 0"><button class="ib" onclick="go('user-${users.indexOf(r.id)}')">Open full user page →</button></div>`,
    );
  $("#dr").classList.add("o");
}
