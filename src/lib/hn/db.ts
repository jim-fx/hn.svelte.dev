import { existsSync, mkdirSync } from 'fs';
import { DB_DIR } from '$env/static/private';
import {
	DatabaseSync,
	type StatementSync,
	type SQLOutputValue,
	type SQLInputValue
} from 'node:sqlite';
import { join, resolve } from 'path';
import type { Item, User } from './types';

import { createLogger } from '$lib/logger';
import { sqlStatements } from './statements';
const SELECT_ITEM_SQL = `SELECT * FROM items WHERE id = :id`;
const UPSERT_RAW_SQL = `INSERT INTO raw_cache (path, data, cached_at) VALUES (:path, :data, :cached_at) ON CONFLICT(path) DO UPDATE SET data = excluded.data, cached_at = excluded.cached_at`;
const SELECT_RAW_SQL = `SELECT * FROM raw_cache WHERE path = :path`;
const SELECT_USER_SQL = `SELECT * FROM users WHERE id = :id`;

type ExtendedDatabase = DatabaseSync & {
	execSafe: (statement: string) => void;
	prepareSafe: (statement: string) => StatementSync;
};
const dbs: Record<string, ExtendedDatabase> = {};
type DatabaseName = 'hn.sqlite' | 'search.sqlite';
function getDatabase(dbName: DatabaseName): ExtendedDatabase {
	const dataDir = DB_DIR ?? resolve('./data');
	const logger = createLogger('db:' + dbName);
	if (!(dbName in dbs)) {
		if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
		dbs[dbName] = new DatabaseSync(join(DB_DIR, dbName)) as ExtendedDatabase;
		dbs[dbName].prepareSafe = function (statement: string) {
			try {
				const prepared = dbs[dbName].prepare(statement);
				logger.debug(`prepared statement`, { dbName, statement });
				return prepared;
			} catch (error) {
				logger.error(`Failed to prepare statement`, { statement, error });
				throw error;
			}
		};
		dbs[dbName].execSafe = function (statement: string) {
			try {
				const result = dbs[dbName].exec(statement);
				logger.debug(`executed statement`, { dbName, statement });
				return result;
			} catch (error) {
				logger.error(`Failed to execute statement`, { statement, error });
				throw error;
			}
		};
	}
	return dbs[dbName];
}

function serialise(item: Item): Record<string, SQLInputValue> {
	return {
		id: item.id,
		type: item.type ?? null,
		by: item.by ?? null,
		time: item.time ?? null,
		text: item.text ?? null,
		dead: item.dead ? 1 : 0,
		parent: item.parent ?? null,
		poll: "poll" in item ? item.poll as SQLInputValue : null,
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

function serialiseUser(user: User): Record<string, SQLInputValue> {
	return {
		id: user.id,
		created: user.created ?? null,
		karma: user.karma ?? null,
		about: user.about ?? null,
		submitted: user.submitted ? JSON.stringify(user.submitted) : null,
		cached_at: Date.now()
	};
}

function deserialiseUser(row: Record<string, SQLOutputValue | undefined>): User {
	return {
		id: row.id as string,
		created: (row.created as number) ?? 0,
		karma: (row.karma as number) ?? 0,
		about: row.about as string | undefined,
		submitted: row.submitted ? JSON.parse(row.submitted as string) : undefined,
		cached_at: new Date(row.cached_at as number)
	};
}

export const statements = {} as {
	upsertItem: StatementSync;
	selectItem: StatementSync;
	upsertRaw: StatementSync;
	selectRaw: StatementSync;
	upsertUser: StatementSync;
	selectUser: StatementSync;

	// Search Statements
	searchStory: StatementSync;
	searchStoryLike: StatementSync;
	searchUser: StatementSync;
	searchUserLike: StatementSync;
	searchUserAbout: StatementSync;
	searchUserAboutLike: StatementSync;
	searchStoryBody: StatementSync;
	searchStoryBodyLike: StatementSync;
	searchComment: StatementSync;
	searchCommentLike: StatementSync;
};

let setup = false;
export { getDatabase };
export function setupDatabase() {
	if (setup) return;
	setup = true;
	const db = getDatabase('hn.sqlite');
	db.execSafe('PRAGMA journal_mode = WAL');
	db.execSafe('PRAGMA synchronous  = NORMAL');

	db.execSafe(sqlStatements.setup_hn);
	db.execSafe(`
		CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
		CREATE INDEX IF NOT EXISTS idx_items_by ON items(by);
		CREATE INDEX IF NOT EXISTS idx_items_time ON items(time DESC);
		CREATE INDEX IF NOT EXISTS idx_items_parent ON items(parent);
		CREATE INDEX IF NOT EXISTS idx_items_score ON items(score DESC);
	`);

	statements.upsertItem = db.prepareSafe(sqlStatements.upsert_item);
	statements.selectItem = db.prepareSafe(SELECT_ITEM_SQL);
	statements.upsertRaw = db.prepareSafe(UPSERT_RAW_SQL);
	statements.selectRaw = db.prepareSafe(SELECT_RAW_SQL);
	statements.upsertUser = db.prepareSafe(sqlStatements.upsert_user);
	statements.selectUser = db.prepareSafe(SELECT_USER_SQL);

	const searchDb = getDatabase('search.sqlite');
	searchDb.execSafe('PRAGMA journal_mode = WAL');
	searchDb.execSafe('PRAGMA synchronous  = NORMAL');
	searchDb.execSafe(sqlStatements.setup_search);

	db.execSafe(`ATTACH DATABASE '${searchDb.location()}' AS search`);
	db.execSafe(sqlStatements.sync_search);
	db.execSafe(sqlStatements.sync_users);

  statements.searchStoryLike = db.prepareSafe(sqlStatements.search_story_like);
	statements.searchStory = db.prepareSafe(sqlStatements.search_story);
	statements.searchUser = db.prepareSafe(sqlStatements.search_user);
	statements.searchUserLike = db.prepareSafe(sqlStatements.search_user_like);
	statements.searchUserAbout = db.prepareSafe(sqlStatements.search_user_about);
	statements.searchUserAboutLike = db.prepareSafe(sqlStatements.search_user_about_like);
	statements.searchStoryBody = db.prepareSafe(sqlStatements.search_story_body);
	statements.searchStoryBodyLike = db.prepareSafe(sqlStatements.search_story_body_like);
	statements.searchComment = db.prepareSafe(sqlStatements.search_comment);
	statements.searchCommentLike = db.prepareSafe(sqlStatements.search_comment_like);
}

export function getItem(id: number) {
	const row = statements.selectItem.get({ id });
	return row ? deserialise(row) : undefined;
}

export function storeItem(item: Item) {
	if (!item) return;
	return statements.upsertItem.run(serialise(item));
}

export function getRawCache(path: string): { data: unknown; cached_at: Date } | undefined {
	const row = statements.selectRaw.get({ path }) as
		| { path: string; data: string; cached_at: number }
		| undefined;
	if (!row) return undefined;
	return { data: JSON.parse(row.data), cached_at: new Date(row.cached_at) };
}

export function storeRawCache(path: string, data: unknown) {
	return statements.upsertRaw.run({ path, data: JSON.stringify(data), cached_at: Date.now() });
}

export function getUser(id: string) {
	const row = statements.selectUser.get({ id });
	return row ? deserialiseUser(row) : undefined;
}

export function storeUser(user: User) {
	if (!user) return;
	return statements.upsertUser.run(serialiseUser(user));
}
