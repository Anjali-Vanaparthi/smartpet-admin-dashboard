# Pet Tracker · Database Admin

Single-page admin dashboard for the pet-tracker PostgreSQL database.
Reads live data from your AWS Lambda API (see "Connect to your AWS API").

## Project layout

```
pet-tracker-admin/
├── index.template.html      static page markup (sidebar, top bar, drawer, dialogs)
├── build.py                 bundles everything into dist/db-admin.html
├── img/                     images embedded into the build (login-dog.jpg)
├── css/                     styles, loaded in filename order
│   ├── 00-tokens-base.css       colour variables (light/dark), reset, typography
│   ├── 10-sidebar.css           left navigation
│   ├── 11-topbar.css            breadcrumbs, search, buttons
│   ├── 12-page.css              content frame and headings
│   ├── 20-components.css        grid, cards, KPIs, pills, tabs, tables, rows
│   ├── 30-workflow.css          directory workflow bar + step cards
│   ├── 32-location-map.css      map layout
│   ├── 33-drawer-toast.css      record drawer, toast
│   ├── 40-motion.css            animations, hero, chips, menus, dialogs
│   ├── 90-responsive.css        tablet / mobile
│   ├── 94-login.css             sign-in screen (illustrated, parallax, tilting card)
│   ├── 96-theme.css             blue theme overrides: surfaces, nav, pills
│   ├── 97-animation.css         aurora background, entrances, spotlight, ripple
│   ├── 98-professional.css      calmer top bar and spacing
│   └── 99-3d.css                3D layer: tilt, extruded tiles, pressable buttons, smart collar, scene
├── js/                      scripts, loaded in filename order (later files use earlier ones)
│   ├── 00-header.js             overview comment
│   ├── 10-schema.js             tables, columns, relationships, descriptions
│   ├── 05-config.js             AWS endpoint and API paths   <- set API_BASE here
│   ├── 20-api.js                fetchTable() + user/pet lookups, loaded after sign-in
│   ├── 30-helpers.js            formatting, table cells, workflow bar, record drawer
│   ├── 35-motion.js             progress bar, count-up, recent pages, shortcuts
│   ├── 36-fx.js                 pointer spotlight, ripple, 3D tilt, parallax
│   ├── 37-3d.js                 rotating 3D collar + floating background scene
│   ├── 38-auth.js               static sign-in (credentials in 05-config.js)
│   ├── 40-sidebar-search.js     sidebar + global search
│   ├── 41-router.js             hash router + breadcrumbs
│   ├── 50-page-dashboard.js     dashboard
│   ├── 51-page-table.js         any table: data / structure / relationships / indexes / DDL
│   ├── 52-page-users.js         user directory + user profile
│   ├── 53-page-location.js      location list (step 3) + fix map (step 4)
│   └── 90-boot.js               event wiring and first render
└── dist/db-admin.html       build output (single self-contained file)
```

## Build

    python3 build.py

## Directory workflow

Dashboard -> User directory -> User profile -> Location details -> Map view

## Routes (URL hash)

`#overview` `#accounts` `#user-<n>` `#loc-<n>` `#fix-<id>` `#<table_name>`

## Connect to your AWS API

This is a static site: plain HTML, CSS and JS. It has no server of its own. After `python3 build.py`
just open `dist/db-admin.html` in a browser, or upload that one file to S3 / any static host.

Everything you need to edit is in `js/05-config.js`:

1. `API_BASE`: your Lambda API address (Function URL or API Gateway URL, no trailing slash).
2. `TABLE_URL`: how a table name becomes a URL, for example `(t) => "/" + t`.
3. `LOGIN`: the fixed email and password for the sign-in page (checked in the browser).
4. Optional: `HEADERS` (an API key), `PAGING`, `COUNTS_URL`.

Each table should come back as a JSON array, or an object holding one (`rows`, `data`, `items`,
`Items`, `results`, `records`). camelCase and snake_case column names both work (names are in
`js/10-schema.js`). Your API must allow browser requests (CORS: `Access-Control-Allow-Origin`).

## If the page says "Could not load data"

The message now says which of two things is wrong:

- **"could not connect"**: wrong address, offline, VPN or ad-blocker. Open the API address in a new tab.
- **"reachable, but the browser blocked its answer"**: CORS. The Lambda must send
  `Access-Control-Allow-Origin: *` on every response, including errors, or CORS must be enabled on the
  API Gateway route. Very large responses (over about 6 MB) or ones slower than about 29 s fail inside
  AWS and come back without CORS headers, so they look the same. Try `ALL_PATH: "?limit=500"`.

Node.js Lambda response headers:

```js
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
return { statusCode: 200, headers, body: JSON.stringify(result) };   // also add headers to error returns
```

## Loading every row (paged mode)

`js/05-config.js` now has `ALL_IN_ONE: false`: the page asks for one table at a time, 1000 rows per request
(`?table=users&limit=1000&offset=0`), and keeps going until it has every row (cap: `MAX_ROWS`).
Exact row totals come from `?counts=1`. The Lambda that answers these calls is in `lambda/` (see its README).
If your API still returns everything in one response, the page detects that and falls back to it automatically.

## Live updates

The page re-reads the API every `REFRESH_SECONDS` (default 30, in `js/05-config.js`) and redraws only
when rows were added or edited. It pauses while you type, have a record drawer open, or the tab is hidden.
The **Refresh** button in the top bar reloads immediately; "Updated hh:mm:ss" shows the last successful read.
