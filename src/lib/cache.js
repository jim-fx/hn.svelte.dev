import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

// SQLite cache setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cacheDbPath = join(__dirname, '../../.svelte-kit/cache.db');

// Create database directory if it doesn't exist
const cacheDir = dirname(cacheDbPath);
if (!existsSync(cacheDir)) {
	mkdirSync(cacheDir, { recursive: true });
}

// Initialize SQLite database
const db = new DatabaseSync(cacheDbPath);

// Enable WAL mode for better concurrent access
db.exec('PRAGMA journal_mode = WAL');

// Create cache table if it doesn't exist
db.exec(`
	CREATE TABLE IF NOT EXISTS cache (
		key TEXT PRIMARY KEY,
		data TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL,
		expires_at INTEGER
	)
`);

/**
 * Get cached data if available and not expired
 * @param {string} key
 * @returns {any | null}
 */
export function getFromCache(key) {
	try {
		const stmt = db.prepare('SELECT data, expires_at FROM cache WHERE key = ?');
		const result = stmt.get(key);

		if (
			result &&
			typeof result === 'object' &&
			'data' in result &&
			typeof result.data === 'string'
		) {
			const expiresAt = result.expires_at;
			if (expiresAt && Date.now() > Number(expiresAt)) {
				return null;
			}
			return JSON.parse(result.data);
		}
	} catch (error) {
		console.error('Cache read error:', error);
	}

	return null;
}

/**
 * Set data in cache
 * @param {string} key
 * @param {any} data
 * @param {number} ttlMs - Time to live in milliseconds (optional)
 */
export function setCache(key, data, ttlMs = 0) {
	try {
		const now = Date.now();
		const expiresAt = ttlMs ? now + ttlMs : null;
		const serializedData = JSON.stringify(data);

		const stmt = db.prepare(`
			INSERT OR REPLACE INTO cache (key, data, created_at, updated_at, expires_at)
			VALUES (?, ?, COALESCE((SELECT created_at FROM cache WHERE key = ?), ?), ?, ?)
		`);

		stmt.run(key, serializedData, key, now, now, expiresAt);
	} catch (error) {
		console.error('Cache write error:', error);
	}
}

/**
 * Clear all cached data
 */
export function clearCache() {
	try {
		db.exec('DELETE FROM cache');
	} catch (error) {
		console.error('Cache clear error:', error);
	}
}

/**
 * Get cache statistics
 * @returns {{ count: number, size: number }}
 */
export function getCacheStats() {
	try {
		const countStmt = db.prepare('SELECT COUNT(*) as count FROM cache');
		const countResult = countStmt.get();

		const sizeStmt = db.prepare('SELECT SUM(LENGTH(data)) as size FROM cache');
		const sizeResult = sizeStmt.get();

		const count =
			typeof countResult === 'object' && countResult && 'count' in countResult
				? Number(countResult.count)
				: 0;

		const size =
			typeof sizeResult === 'object' && sizeResult && 'size' in sizeResult
				? Number(sizeResult.size)
				: 0;

		return {
			count,
			size
		};
	} catch (error) {
		console.error('Cache stats error:', error);
		return { count: 0, size: 0 };
	}
}
