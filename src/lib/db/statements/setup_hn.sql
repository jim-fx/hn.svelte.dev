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

-- Setup item indices
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_by ON items(by);
CREATE INDEX IF NOT EXISTS idx_items_time ON items(time DESC);
CREATE INDEX IF NOT EXISTS idx_items_parent ON items(parent);
CREATE INDEX IF NOT EXISTS idx_items_score ON items(score DESC);

-- Setup Full Text Search Tables
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  title,
  text,
  type,
  by,
  content       = 'items',
  tokenize      = 'trigram remove_diacritics 1',
  content_rowid = 'id'
);

CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, title, text, type, by)
  VALUES (new.id, new.title, new.text, new.type, new.by);
END;
CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, title, text, type, by)
  VALUES ('delete', old.id, old.title, old.text, old.type, old.by);
END;
CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, title, text, type, by)
  VALUES ('delete', old.id, old.title, old.text, old.type, old.by);

  INSERT INTO items_fts(rowid, title, text, type, by)
  VALUES (new.id, new.title, new.text, new.type, new.by);
END;

-- Virtual table to read the search tokens
CREATE VIRTUAL TABLE IF NOT EXISTS items_tokens USING fts5vocab(items_fts, 'row');

-- Raw Cache
CREATE TABLE IF NOT EXISTS raw_cache (
  path        TEXT PRIMARY KEY,
  data        TEXT NOT NULL,
  cached_at   INTEGER NOT NULL
);

-- Tables
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  created     INTEGER NOT NULL,
  karma       INTEGER,
  about       TEXT,
  submitted   TEXT NOT NULL,    -- JSON array of integers
  cached_at   INTEGER NOT NULL,  -- Unix timestamp (ms) of last upsert
);

-- User full text search
CREATE VIRTUAL TABLE IF NOT EXISTS users_fts USING fts5(
  name,
  about,
  content       = 'users',
  content_rowid = 'id',
  tokenize      = 'trigram remove_diacritics 1'
);

-- Keep the fts table in sync
CREATE TRIGGER IF NOT EXISTS users_ai AFTER INSERT ON users BEGIN
  INSERT INTO users_fts(rowid, name, about)
  VALUES (new.id, new.name, new.about);
END;
CREATE TRIGGER IF NOT EXISTS users_ad AFTER DELETE ON users BEGIN
  INSERT INTO users_fts(users_fts, rowid, name, about)
  VALUES ('delete', old.id, old.name, old.about);
END;
CREATE TRIGGER IF NOT EXISTS users_au AFTER UPDATE ON users BEGIN
  INSERT INTO users_fts(users_fts, rowid, name, about)
  VALUES ('delete', old.id, old.name, old.about);
  INSERT INTO users_fts(rowid, name, about)
  VALUES (new.id, new.name, new.about);
END;
