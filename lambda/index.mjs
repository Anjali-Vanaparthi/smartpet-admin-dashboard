// Pet Tracker admin API  ·  AWS Lambda (Node.js 20) behind an API Gateway HTTP API route, e.g. GET /admin/dashboard
//
//   GET ?counts=1                          -> { success, counts: { users: 8, pets: 7, ... } }
//   GET ?table=users&limit=1000&offset=0   -> { success, table, limit, offset, returnedCount, records: [ ... ] }
//
// The dashboard calls the second form repeatedly (offset 0, 1000, 2000 ...) until a page comes back
// shorter than `limit`, so it ends up with EVERY row of every table. Read-only: no writes anywhere.
//
// Environment variables: DB_HOST, DB_PORT (5432), DB_NAME, DB_USER, DB_PASSWORD, and optionally
//   ADMIN_KEY   if set, requests must send header  x-api-key: <ADMIN_KEY>
//   COUNT_MODE  "exact" (default) or "estimate" (fast, approximate; use for tables with millions of rows)
// Needs the "pg" package in the deployment zip or in a Lambda layer:  npm install pg
// If your current Lambda already has its own database connection code, keep that and copy only the routing.
import pg from "pg";

const TABLES = [
  "users", "pets", "app_info", "health_data", "hourly_health_trends", "daily_step_goals",
  "location_fixes", "devices", "gnss_details", "serving_cells", "neighbor_cells",
  "medication", "vet_visit", "grooming", "reminder", "safe_zones", "alert_data",
];
const MAX_LIMIT = 2000;
const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,authorization,x-api-key",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};
const reply = (statusCode, body) => ({ statusCode, headers: HEADERS, body: JSON.stringify(body) });

let pool; // reused between invocations while the Lambda stays warm
const db = () =>
  (pool ??= new pg.Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "postgres",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 3,
  }));

const MISSING = "42P01"; // Postgres: relation does not exist (e.g. no "devices" table yet)

export const handler = async (event) => {
  try {
    if ((event.requestContext?.http?.method || event.httpMethod) === "OPTIONS") return reply(204, {});
    if (process.env.ADMIN_KEY) {
      const h = event.headers || {};
      if ((h["x-api-key"] || h["X-Api-Key"]) !== process.env.ADMIN_KEY)
        return reply(401, { success: false, message: "Unauthorized" });
    }
    const q = event.queryStringParameters || {};

    // ---- row counts for every table ----
    if (q.counts) {
      const counts = {};
      for (const t of TABLES) {
        try {
          const sql =
            process.env.COUNT_MODE === "estimate"
              ? `SELECT GREATEST(reltuples, 0)::bigint AS n FROM pg_class WHERE oid = to_regclass('public.${t}')`
              : `SELECT count(*)::bigint AS n FROM "${t}"`;
          const r = await db().query(sql);
          counts[t] = Number(r.rows[0]?.n || 0);
        } catch (e) {
          if (e.code !== MISSING) throw e;
          counts[t] = 0;
        }
      }
      return reply(200, { success: true, counts });
    }

    // ---- one page of one table ----
    const table = q.table;
    if (!TABLES.includes(table)) return reply(400, { success: false, message: `Unknown table "${table}"` });
    const limit = Math.min(Math.max(parseInt(q.limit, 10) || 1000, 1), MAX_LIMIT);
    const offset = Math.max(parseInt(q.offset, 10) || 0, 0);
    try {
      // table name comes from the allow-list above, never from raw input
      const r = await db().query(`SELECT * FROM "${table}" ORDER BY id LIMIT $1 OFFSET $2`, [limit, offset]);
      return reply(200, { success: true, table, limit, offset, returnedCount: r.rows.length, records: r.rows });
    } catch (e) {
      if (e.code === MISSING) return reply(200, { success: true, table, limit, offset, returnedCount: 0, records: [], missing: true });
      throw e;
    }
  } catch (e) {
    console.error(e);
    return reply(500, { success: false, message: e.message }); // CORS headers included even on errors
  }
};
