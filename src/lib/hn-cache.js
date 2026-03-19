/**
 * @fileoverview SQLite-backed cache for Hacker News items.
 *
 * Uses the built-in `node:sqlite` module (Node.js >= 22.5.0).
 * The cache is append/upsert only — rows are never deleted.
 * Array fields (`kids`, `parts`) are stored as JSON text.
 * Boolean fields (`dead`, `deleted`) are stored as INTEGER (0/1).
 *
 * @module hn-cache
 */

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS items (
  -- Required
  id          INTEGER PRIMARY KEY,
  type        TEXT    NOT NULL,

  -- Optional scalar fields
  by          TEXT,
  time        INTEGER,
  text        TEXT,
  dead        INTEGER,       -- BOOLEAN stored as 0/1
  parent      INTEGER,
  poll        INTEGER,
  url         TEXT,
  score       INTEGER,
  title       TEXT,
  descendants INTEGER,
  deleted     INTEGER,       -- BOOLEAN stored as 0/1

  -- Array fields serialised as JSON
  kids        TEXT,          -- JSON array of integers
  parts       TEXT,          -- JSON array of integers

  -- Housekeeping
  cached_at   INTEGER NOT NULL  -- Unix timestamp (ms) of last upsert
)
`;

const UPSERT_SQL = `
INSERT INTO items (
  id, type, by, time, text, dead, parent, poll,
  url, score, title, descendants, deleted, kids, parts, cached_at
) VALUES (
  :id, :type, :by, :time, :text, :dead, :parent, :poll,
  :url, :score, :title, :descendants, :deleted, :kids, :parts, :cached_at
)
ON CONFLICT(id) DO UPDATE SET
  type        = excluded.type,
  by          = excluded.by,
  time        = excluded.time,
  text        = excluded.text,
  dead        = excluded.dead,
  parent      = excluded.parent,
  poll        = excluded.poll,
  url         = excluded.url,
  score       = excluded.score,
  title       = excluded.title,
  descendants = excluded.descendants,
  deleted     = excluded.deleted,
  kids        = excluded.kids,
  parts       = excluded.parts,
  cached_at   = excluded.cached_at
`;

const SELECT_SQL = `SELECT * FROM items WHERE id = :id`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Serialises an {@link HNItem} into a flat object suitable for the prepared
 * statement parameters.
 *
 * @param {import('./hn-client').HNItem} item
 * @returns {Record<string, string | number | null>}
 */
function serialise(item) {
  return {
    id:          item.id,
    type:        item.type,
    by:          item.by          ?? null,
    time:        item.time        ?? null,
    text:        item.text        ?? null,
    dead:        item.dead        ? 1 : 0,
    parent:      item.parent      ?? null,
    poll:        item.poll        ?? null,
    url:         item.url         ?? null,
    score:       item.score       ?? null,
    title:       item.title       ?? null,
    descendants: item.descendants ?? null,
    deleted:     item.deleted     ? 1 : 0,
    kids:        item.kids  ? JSON.stringify(item.kids)  : null,
    parts:       item.parts ? JSON.stringify(item.parts) : null,
    cached_at:   Date.now(),
  };
}

/**
 * Deserialises a raw SQLite row back into an {@link HNItem}.
 *
 * @param {Record<string, any>} row
 * @returns {import('./hn-client').HNItem}
 */
function deserialise(row) {
  /** @type {import('./hn-client').HNItem} */
  const item = {
    id:   row.id,
    type: row.type,
  };

  if (row.by          != null) item.by          = row.by;
  if (row.time        != null) item.time        = row.time;
  if (row.text        != null) item.text        = row.text;
  if (row.dead)                item.dead        = true;
  if (row.parent      != null) item.parent      = row.parent;
  if (row.poll        != null) item.poll        = row.poll;
  if (row.url         != null) item.url         = row.url;
  if (row.score       != null) item.score       = row.score;
  if (row.title       != null) item.title       = row.title;
  if (row.descendants != null) item.descendants = row.descendants;
  if (row.deleted)             item.deleted     = true;
  if (row.kids  != null)       item.kids        = JSON.parse(row.kids);
  if (row.parts != null)       item.parts       = JSON.parse(row.parts);

  return item;
}

// ---------------------------------------------------------------------------
// HNItemCache
// ---------------------------------------------------------------------------

/**
 * A persistent, upsert-only SQLite cache for Hacker News items.
 *
 * The database is created (including any missing parent directories) the first
 * time an {@link HNItemCache} is instantiated with a given path.
 *
 * Items are keyed by their numeric `id`. Array fields (`kids`, `parts`) are
 * round-tripped through `JSON.stringify` / `JSON.parse`. Boolean fields
 * (`dead`, `deleted`) are stored as `INTEGER` (0 / 1).
 *
 * The cache is **never cleared** — calling {@link HNItemCache#clear} is a
 * no-op by design. Items can only be added or updated via
 * {@link HNItemCache#set}.
 *
 * @example
 * import { HNItemCache } from './hn-cache.js';
 * import { HNClient }    from './hn-client.js';
 *
 * const cache  = new HNItemCache('./data/hn.db');
 * const client = new HNClient({ cache });
 *
 * const posts = await client.getRecentPosts();
 */
class HNItemCache {
  /**
   * @param {string} dbPath  Filesystem path to the SQLite database file.
   *                         Parent directories are created automatically.
   */
  constructor(dbPath) {
    // Ensure the directory exists before opening the database.
    const dir = dirname(dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    /**
     * The underlying synchronous SQLite connection.
     * @type {DatabaseSync}
     * @private
     */
    this._db = new DatabaseSync(dbPath);

    // Performance settings.
    this._db.exec("PRAGMA journal_mode = WAL");
    this._db.exec("PRAGMA synchronous  = NORMAL");

    // Ensure schema exists.
    this._db.exec(CREATE_TABLE_SQL);

    /**
     * Prepared statement for upserts.
     * @type {import('node:sqlite').StatementSync}
     * @private
     */
    this._upsert = this._db.prepare(UPSERT_SQL);

    /**
     * Prepared statement for point lookups.
     * @type {import('node:sqlite').StatementSync}
     * @private
     */
    this._select = this._db.prepare(SELECT_SQL);
  }

  // -------------------------------------------------------------------------
  // Cache interface implementation
  // -------------------------------------------------------------------------

  /**
   * Returns the cached {@link HNItem} for the given numeric `id`, or
   * `undefined` if no row exists.
   *
   * @param {number} id  The item's numeric HN id.
   * @returns {import('./hn-client').HNItem | undefined}
   */
  get(id) {
    const row = this._select.get({ id });
    return row ? deserialise(row) : undefined;
  }

  /**
   * Upserts an {@link HNItem} into the database.
   *
   * If a row with the same `id` already exists it is **updated in place**;
   * no row is ever deleted.
   *
   * @param {number} _id  Ignored — the id is taken from `item.id`.
   * @param {import('./hn-client').HNItem} item
   * @returns {void}
   */
  set(_id, item) {
    this._upsert.run(serialise(item));
  }

  /**
   * No-op. The SQLite cache is persistent and is never cleared.
   *
   * @param {number} _id
   * @returns {false}
   */
  delete(_id) {
    return false;
  }

  /**
   * No-op. The SQLite cache is intentionally never cleared.
   *
   * @returns {void}
   */
  clear() {
    // Intentionally empty — cache is append/upsert only.
  }

  // -------------------------------------------------------------------------
  // Housekeeping
  // -------------------------------------------------------------------------

  /**
   * Closes the underlying database connection.
   * Call this when you are done with the cache (e.g. on process exit).
   *
   * @returns {void}
   */
  close() {
    this._db.close();
  }
}

export { HNItemCache };
export default HNItemCache;
