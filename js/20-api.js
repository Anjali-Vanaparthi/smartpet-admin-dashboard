/* ===== DATA ADAPTER  ·  reads from your AWS Lambda API =====
   fetchTable(t) is the single data-access point the pages use. It accepts many response shapes
   (a plain array, or {rows|data|items|Items|results|records: [...]}) and camelCase or snake_case
   column names. Data.init() loads users and pets right after sign-in. */

const users = [], // user ids, in directory order (route #user-<n> is an index into this list)
  pets = [], // pet ids
  U = []; // {id, name, email, mobile, addr}
const petName = {}, // pet id -> pet name
  petOwner = {}; // pet id -> owner user id
let pendUser = null; // set by the user page to pre-filter a table view

const uName = (id) => (U.find((u) => u.id === id) || {}).name,
  pName = (id) => petName[id] ?? null;

const API = {
  /** Why did fetch() fail? A "no-cors" request still succeeds when the server is reachable, so
      it tells "the API answered but the browser blocked it (CORS / error without CORS headers)"
      apart from "the browser cannot connect at all (wrong address, offline, blocked)". */
  async diagnose(url) {
    const where = location.protocol === "file:" ? 'this file (origin "null")' : location.origin;
    let reachable = true;
    try { await fetch(url, { mode: "no-cors", cache: "no-store" }); } catch { reachable = false; }
    if (!reachable)
      return `The browser could not connect to ${new URL(url).host}.\n` +
        `• Check API_BASE for typos (region, stage name, route).\n` +
        `• Open ${url} in a new tab. If that fails too, the URL or route is wrong, or you are offline / behind a VPN / an ad-blocker is blocking it.`;
    return `The API is reachable, but the browser blocked its answer for ${where}. That is almost always CORS:\n` +
      `1. Make sure the Lambda sends  Access-Control-Allow-Origin: *  on EVERY response (including errors), or enable CORS on the API Gateway route (allow origin *, method GET).\n` +
      `2. If the response is very large (over ~6 MB) or takes over ~29 s, Lambda/API Gateway fails and returns an error WITHOUT CORS headers, which looks exactly like this. Try adding a row limit, e.g. ALL_PATH: "?limit=500".\n` +
      `3. Open ${url} in a new tab: if it shows JSON, the data is fine and it is (1) or (2); if it shows an error message, that message is the real problem. Browser DevTools > Network shows the status code.`;
  },
  async get(path) {
    if (!CONFIG.API_BASE) throw new Error("API_BASE is not set. Edit js/05-config.js.");
    const url = CONFIG.API_BASE + path;
    let res;
    try {
      res = await fetch(url, { headers: CONFIG.HEADERS, cache: "no-store" }); // no-store: never reuse an older answer that lacked CORS headers
    } catch {
      throw new Error(await API.diagnose(url));
    }
    if (res.status === 401 || res.status === 403) throw new Error("The API refused the request (" + res.status + "). Check HEADERS / API key and the authorizer on the route.");
    if (res.status === 404) throw new Error(`${url} returned 404. The route does not exist: check API_BASE, ALL_PATH and the stage name.`);
    if (!res.ok) {
      let m = ""; try { m = (await res.text()).slice(0, 300); } catch {}
      throw new Error(`${path || "API"} returned ${res.status}.${m ? "\nAPI says: " + m : ""}\nOpen CloudWatch > Logs for the Lambda to see the error.`);
    }
    try { return await res.json(); } catch { throw new Error("The API answered with something that is not JSON. Open " + url + " in a new tab to see what it returns."); }
  },
};

const CACHE = {};
const snake = (k) => k.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

/** Find the array of rows inside whatever the API returned. */
function extractRows(d) {
  if (typeof d === "string") {
    try { d = JSON.parse(d); } catch { return []; }
  }
  if (Array.isArray(d)) return d;
  if (d && typeof d === "object") {
    for (const k of ["rows", "data", "items", "Items", "results", "records", "body"]) {
      if (d[k] != null) { const r = extractRows(d[k]); if (r.length || Array.isArray(d[k])) return r; }
    }
    const first = Object.values(d).find(Array.isArray);
    if (first) return first;
  }
  return [];
}

/** Make API values match what the pages expect: snake_case keys, timestamps as epoch ms, numbers as numbers. */
function normalize(t, rows) {
  const cs = cols(t);
  return rows.map((raw) => {
    const r = {};
    for (const k of Object.keys(raw)) r[snake(k)] = raw[k];
    for (const c of cs) {
      const v = r[c.n];
      if (v == null) continue;
      if (c.ty === "ts" && typeof v === "string") r[c.n] = Date.parse(v);
      else if (c.ty === "ts" && typeof v === "number" && v < 1e11) r[c.n] = v * 1000; // epoch seconds
      else if ((c.ty === "int" || c.ty === "num") && typeof v === "string") r[c.n] = Number(v);
      else if (c.ty === "json" && typeof v === "object") r[c.n] = JSON.stringify(v); // jsonb arrives as an object
      else if (c.ty === "date" && typeof v === "string" && v[10] === "T") r[c.n] = v.slice(0, 10); // 2026-10-28T00:00:00.000Z -> 2026-10-28
    }
    return r;
  });
}

/* ---- all-in-one mode: ONE request returns every table as { tables: { name: { records: [...] } } } ---- */
let ALL = null,
  FALLBACK = null; // set when the API answers a per-table request with the all-in-one shape
function fetchAll() {
  if (!ALL) {
    ALL = API.get(CONFIG.ALL_PATH).then((d) => {
      if (d && d.success === false) throw new Error(d.message || "The API reported an error.");
      if (!d || typeof d.tables !== "object") throw new Error('The API response has no "tables" section.');
      Data.truncated = Object.keys(d.tables).filter((k) => d.tables[k] && d.tables[k].truncated);
      return d;
    });
    ALL.catch(() => (ALL = null)); // do not cache failures, so Retry works
  }
  return ALL;
}
async function fromAll(t) {
  const x = ((await fetchAll()).tables || {})[t];
  const rows = x && Array.isArray(x.records) ? x.records : [];
  if (t in TOTAL) TOTAL[t] = rows.length;
  return normalize(t, rows);
}

/* A cheap fingerprint of each table (row count + newest timestamp) so a refresh can tell if anything changed. */
const SIG = {};
const SIGKEYS = ["updated_at", "created_at", "fix_timestamp", "timestamp", "triggered_at", "hour_timestamp"];
const sigOf = (rows) => {
  let m = 0;
  for (const r of rows) for (const k of SIGKEYS) if (typeof r[k] === "number" && r[k] > m) m = r[k];
  return rows.length + "|" + m;
};
/** THE data-access point. Returns an array of row objects for one table (cached until the next refresh). */
function fetchTable(t) {
  const p = fetchTableRaw(t);
  p.then((rows) => (SIG[t] = sigOf(rows)), () => {});
  return p;
}
function fetchTableRaw(t) {
  if (CACHE[t]) return CACHE[t];
  if (CONFIG.ALL_IN_ONE) {
    const p = fromAll(t);
    CACHE[t] = p;
    p.catch(() => delete CACHE[t]);
    return p;
  }
  const p = (async () => {
    let all = [];
    const sep = CONFIG.TABLE_URL(t).includes("?") ? "&" : "?";
    while (all.length < CONFIG.MAX_ROWS) {
      const q = CONFIG.PAGING
        ? `${sep}${CONFIG.PAGING.limit}=${CONFIG.PAGE_SIZE}&${CONFIG.PAGING.offset}=${all.length}`
        : "";
      const d = FALLBACK || (await API.get(CONFIG.TABLE_URL(t) + q));
      if (d && d.tables && typeof d.tables === "object") {
        // older Lambda that ignores ?table= and returns every table: remember it, take this table's rows, stop
        FALLBACK = d;
        all = ((d.tables[t] || {}).records) || [];
        break;
      }
      if (d && d.success === false) throw new Error(d.message || "The API reported an error.");
      const rows = extractRows(d);
      all = all.concat(rows);
      if (d && d.truncated) Data.truncated.push(t);
      if (!CONFIG.PAGING || rows.length < CONFIG.PAGE_SIZE) break;
    }
    if (t in TOTAL && !Data.hasCounts) TOTAL[t] = all.length;
    return normalize(t, all);
  })();
  CACHE[t] = p;
  p.catch(() => delete CACHE[t]); // do not cache failures, so Retry works
  return p;
}

const Data = {
  ready: false,
  hasCounts: false,
  truncated: [], // tables the API cut off at its own row limit
  /** Load users, pets and (optionally) row counts. Call after sign-in, before the first route(). */
  async init() {
    const [ur, pr, counts] = await Promise.all([
      fetchTable("users"),
      fetchTable("pets"),
      CONFIG.COUNTS_URL ? API.get(CONFIG.COUNTS_URL).catch(() => null) : null,
    ]);
    if (CONFIG.ALL_IN_ONE) {
      const d = await fetchAll(); // counts for the dashboard come from the same single response
      Object.keys(TOTAL).forEach((t) => (TOTAL[t] = ((d.tables[t] || {}).records || []).length));
    }
    const cn = counts && typeof counts === "object" ? counts.counts || counts : null;
    this.hasCounts = !!cn && Object.keys(TOTAL).some((t) => cn[t] != null && !Number.isNaN(Number(cn[t])));
    if (this.hasCounts) Object.keys(TOTAL).forEach((t) => cn[t] != null && (TOTAL[t] = Number(cn[t])));
    users.length = pets.length = U.length = 0;
    ur.forEach((r) => {
      users.push(r.id);
      U.push({
        id: r.id,
        name: r.display_name || r.name || r.full_name || r.email || String(r.id),
        email: r.email || "",
        mobile: r.mobile || r.phone || "",
        addr: r.address || "",
      });
    });
    pr.forEach((r) => { pets.push(r.id); petName[r.id] = r.name; petOwner[r.id] = r.user_id; });
    this.ready = true;
  },
  /** Load every other table once, in the background, so the dashboard counts fill in. */
  preload(done) {
    if (!CONFIG.PRELOAD_ALL || this.hasCounts || CONFIG.ALL_IN_ONE) return;
    Promise.allSettled(Object.keys(S).map(fetchTable)).then(done);
  },
  updatedAt: 0,
  busy: false,
  /** Re-read the API: users, pets, counts and every table you have opened. Resolves true if anything changed. */
  async refresh() {
    if (this.busy) return false;
    this.busy = true;
    try {
      const loaded = Object.keys(SIG),
        before = JSON.stringify(SIG) + JSON.stringify(TOTAL);
      ALL = FALLBACK = null;
      Object.keys(CACHE).forEach((k) => delete CACHE[k]);
      this.truncated = [];
      await this.init();
      await Promise.all(loaded.map((t) => fetchTable(t)));
      this.updatedAt = Date.now();
      return before !== JSON.stringify(SIG) + JSON.stringify(TOTAL);
    } finally {
      this.busy = false;
    }
  },
  /** Forget everything (used on sign-out). */
  reset() {
    this.ready = this.hasCounts = false;
    ALL = FALLBACK = null;
    Object.keys(SIG).forEach((k) => delete SIG[k]);
    Object.keys(CACHE).forEach((k) => delete CACHE[k]);
    Object.keys(TOTAL).forEach((k) => (TOTAL[k] = 0));
    users.length = pets.length = U.length = 0;
    Object.keys(petName).forEach((k) => { delete petName[k]; delete petOwner[k]; });
  },
};
