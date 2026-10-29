/* ===== CONFIG  ·  the only file you need to edit =====
   This console is plain HTML + CSS + JS (no server of its own). It signs in with the fixed
   credentials below and then reads data straight from your existing AWS Lambda API. */
const CONFIG = {
  /* 1) >>> PUT YOUR API ADDRESS HERE <<<  (Lambda Function URL or API Gateway URL, no trailing slash).
        After any change here, run  python3 build.py  and reopen dist/db-admin.html. */
  API_BASE: "https://7u69s5sssg.execute-api.ap-south-2.amazonaws.com/admin/dashboard",

  /* 2) Static sign-in (checked in the browser, so anyone who views the page source can read it). */
  LOGIN: { email: "admin@pettracker.app", password: "admin123" },
  SHOW_LOGIN_HINT: true, // show these credentials on the login card (set false to hide)

  /* 2b) YOUR API returns every table in ONE response:
          { success, tables: { users: { records: [...] }, pets: { records: [...] }, ... } }
        so leave ALL_IN_ONE on. ALL_PATH is what comes after API_BASE for that one request
        ("" = API_BASE itself; add e.g. "?limit=500" if your API supports a row limit).
        Set ALL_IN_ONE: false only if your API has one URL per table (then TABLE_URL below is used). */
  ALL_IN_ONE: false, // false = ask for one table at a time, in pages, so EVERY row is loaded (needs the paged Lambda in /lambda)
  ALL_PATH: "",

  /* 3) (only when ALL_IN_ONE is false) How to ask your API for one table. t is the table name, e.g. "users", "location_fixes".
        Return what comes AFTER API_BASE. Examples:
          (t) => "/" + t                          ->  GET {API_BASE}/users
          (t) => "/" + t.replace(/_/g, "-")       ->  GET {API_BASE}/location-fixes
          (t) => "?table=" + t                    ->  GET {API_BASE}?table=users          */
  TABLE_URL: (t) => "?table=" + t, // -> GET {API_BASE}?table=users&limit=1000&offset=0

  /* 4) Extra request headers. If you set ADMIN_KEY in the Lambda, put the same value here:
          HEADERS: { "x-api-key": "the-same-long-random-string" }
        (any custom header makes the browser send a CORS "preflight" first). */
  HEADERS: {},

  /* 5) Paging. These match the pet-tracker Lambda (2000 rows per request, newest first).
        Set PAGING: null if your API returns a whole table in one request. */
  PAGING: { limit: "limit", offset: "offset" },
  PAGE_SIZE: 1000,
  MAX_ROWS: 200000, // safety cap per table (the console filters and sorts in the browser)

  /* 6) Row counts for the dashboard. COUNTS_URL (optional) -> {users: 1284, ...}. Without it,
        the console loads every table once in the background and counts the rows. */
  COUNTS_URL: "?counts=1", // -> {counts:{users:8, ...}}  exact row totals in one small request
  PRELOAD_ALL: true,

  /* 7) Live updates. The dashboard re-reads your API every REFRESH_SECONDS seconds and redraws the
        page only when something changed (new or edited rows). Use 0 to turn automatic refresh off.
        The Refresh button in the top bar always works. */
  REFRESH_SECONDS: 30,
};
