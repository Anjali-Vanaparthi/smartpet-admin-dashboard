/**
 * PET TRACKER · DATABASE ADMIN
 * ---------------------------------------------------------------
 * Single-file admin dashboard. Read top to bottom, or search for the
 * "=====" banner comments to jump between sections:
 *
 *   SCHEMA METADATA        tables, columns, relationships, descriptions
 *   CONFIG / DATA ADAPTER  AWS endpoint + fetchTable() (js/05-config.js, js/20-api.js)
 *   HELPERS                formatting, table cells, workflow bar, record drawer
 *   SIDEBAR / SEARCH       left navigation and global search
 *   ROUTER                 hash routing and breadcrumbs
 *   OVERVIEW               dashboard
 *   TABLE PAGE             data / structure / relationships / indexes / DDL tabs
 *   USERS                  user directory and user profile
 *   LOCATION DETAILS & MAP location list and per-fix map
 *   BOOT
 *
 * Directory workflow (each step links to the next):
 *   Overview -> Users -> User profile -> Location details -> Map view
 *
 * Routes (URL hash):
 *   #overview  #accounts  #user-<n>  #loc-<n>  #fix-<id>
 *   #<table_name>
 *
 * Data: set API_BASE in js/05-config.js. Everything reads through fetchTable().
 */
