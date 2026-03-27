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
);

CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_by ON items(by);
CREATE INDEX IF NOT EXISTS idx_items_time ON items(time DESC);
CREATE INDEX IF NOT EXISTS idx_items_parent ON items(parent);
CREATE INDEX IF NOT EXISTS idx_items_score ON items(score DESC);

CREATE TABLE IF NOT EXISTS raw_cache (
  path        TEXT PRIMARY KEY,
  data        TEXT NOT NULL,
  cached_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  created     INTEGER,
  karma       INTEGER,
  about       TEXT,
  submitted   TEXT,            -- JSON array of integers
  cached_at   INTEGER NOT NULL -- Unix timestamp (ms) of last upsert
);

