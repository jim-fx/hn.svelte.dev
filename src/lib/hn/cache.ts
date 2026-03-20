import { existsSync, mkdirSync } from 'fs';
import { DB_DIR } from '$env/static/private';
import {
	DatabaseSync,
	type StatementSync,
	type SQLOutputValue,
	type SQLInputValue
} from 'node:sqlite';
import { join, resolve } from 'path';
import type { Item } from './types';

let database: DatabaseSync | null = null;

function getDatabase(): DatabaseSync {
	if (!database) {
		const dir = resolve('./data');
		if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
		database = new DatabaseSync(join(DB_DIR, 'hn.sqlite'));
	}
	return database;
}

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

function serialise(item: Item): Record<string, SQLInputValue> {
	return {
		id: item.id,
		type: item.type ?? null,
		by: item.by ?? null,
		time: item.time ?? null,
		text: item.text ?? null,
		dead: item.dead ? 1 : 0,
		parent: item.parent ?? null,
		poll: item.poll ?? null,
		url: item.url ?? null,
		score: item.score ?? null,
		title: item.title ?? null,
		descendants: item.descendants ?? null,
		deleted: item.deleted ? 1 : 0,
		kids: item.kids ? JSON.stringify(item.kids) : null,
		parts: item.parts ? JSON.stringify(item.parts) : null,
		cached_at: Date.now()
	};
}

function deserialise(row: Record<string, SQLOutputValue | undefined>) {
	const item: Record<string, unknown> = {
		id: row.id,
		type: row.type,
		cached_at: new Date(row.cached_at as number)
	};

	if (row.by != null) item.by = row.by;
	if (row.time != null) item.time = row.time;
	if (row.text != null) item.text = row.text;
	if (row.dead) item.dead = true;
	if (row.parent != null) item.parent = row.parent;
	if (row.poll != null) item.poll = row.poll;
	if (row.url != null) item.url = row.url;
	if (row.score != null) item.score = row.score;
	if (row.title != null) item.title = row.title;
	if (row.descendants != null) item.descendants = row.descendants;
	if (row.deleted) item.deleted = true;
	if (row.kids != null) item.kids = JSON.parse(row.kids as string);
	if (row.parts != null) item.parts = JSON.parse(row.parts as string);

	return item as Item;
}

let upsertStatement: StatementSync;
let selectStatement: StatementSync;

let setup = false;
export function setupDatabase() {
	if (setup) return;
	setup = true;
	const db = getDatabase();
	// Performance settings.
	db.exec('PRAGMA journal_mode = WAL');
	db.exec('PRAGMA synchronous  = NORMAL');

	// Ensure schema exists.
	db.exec(CREATE_TABLE_SQL);

	upsertStatement = db.prepare(UPSERT_SQL);
	selectStatement = db.prepare(SELECT_SQL);
	console.log('[db] setup tables');
}

export function getItem(id: number) {
	const row = selectStatement.get({ id });
	return row ? deserialise(row) : undefined;
}

export function storeItem(item: Item) {
	return upsertStatement.run(serialise(item));
}
