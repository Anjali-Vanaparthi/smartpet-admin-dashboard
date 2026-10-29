# Paged Lambda for the Pet Tracker admin

`index.mjs` replaces (or is merged into) the Lambda behind `/admin/dashboard`.
It lets the dashboard load **every row** of every table, 1000 rows per request.

1. Lambda > your function > Code: paste `index.mjs` (rename the handler file to `index.mjs`, runtime Node.js 20).
   Add the `pg` package (zip with `npm install pg`, or a layer). Keep your existing DB environment variables,
   or rename them in the `db()` function.
2. Configuration > General configuration: Timeout 30 s, Memory 512 MB or more.
3. API Gateway stays as it is (same route, GET). CORS: keep your allowed origins.
4. In the dashboard's `js/05-config.js` the defaults already match (`ALL_IN_ONE: false`,
   `TABLE_URL: (t) => "?table=" + t`, `COUNTS_URL: "?counts=1"`). Run `python3 build.py`.

Test in a browser tab:
- `.../admin/dashboard?counts=1`
- `.../admin/dashboard?table=users&limit=5`

Tables with millions of rows: set `COUNT_MODE=estimate`, and lower `MAX_ROWS` in `js/05-config.js`
(the browser keeps every loaded row in memory; tens of thousands per table is comfortable).
