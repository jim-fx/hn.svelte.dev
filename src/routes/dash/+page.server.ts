import { statSync } from 'fs';
import { join } from 'path';
import { DB_DIR } from '$env/static/private';
import { db } from '$lib/db';

interface Stats {
	totalItems: number;
	totalUsers: number;
	itemsByType: { type: string; count: number }[];
	itemsByHour: { hour: number; count: number }[];
	scoreDistribution: { bucket: string; count: number }[];
	topUsers: { id: string; karma: number }[];
	topStories: { id: number; title: string; score: number; by: string }[];
	topComments: { id: number; text: string; by: string; score: number }[];
	rawCacheStats: { count: number; oldest: number | null; newest: number | null };
	dbSize: string;
	dbMeta: {
		pageCount: number;
		pageSize: number;
		freeListPages: number;
		schemaVersion: number;
	};
	searchDbSize: string;
	searchDbMeta: {
		pageCount: number;
		pageSize: number;
		freeListPages: number;
	};
	indexedItemsCount: number;
	indexedUsersCount: number;
	itemsByTypeSearch: { type: string; count: number }[];
	syncStatus: {
		totalIndexed: number;
		itemsPercent: number;
		usersPercent: number;
	};
	fts5Info: {
		itemsTokenizer: string;
		usersTokenizer: string;
	};
	commonTokens: { term: string; count: number }[];
	requestStats: {
		totalRequests: number;
		avgDuration: number;
		minDuration: number;
		maxDuration: number;
		p95Duration: number;
		requestsByStatus: { status: number; count: number }[];
		requestsByUrl: { url: string; count: number; avgDuration: number }[];
	};
	queryStats: {
		totalQueries: number;
		avgDuration: number;
		slowQueries: { sql: string; duration: number }[];
		topQueries: { sql: string; count: number }[];
	};
	statisticsDbSize: string;
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function load() {
	const totalItems = (db.prepare('SELECT COUNT(*) as count FROM items').get() as { count: number })
		.count;

	const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number })
		.count;

	const dbPath = join(DB_DIR, 'hn.sqlite');
	let dbSize = 'N/A';
	let dbMeta = { pageCount: 0, pageSize: 0, freeListPages: 0, schemaVersion: 0 };

	try {
		const stats = statSync(dbPath);
		dbSize = formatBytes(stats.size);

		const meta = db
			.prepare('PRAGMA page_count; PRAGMA page_size; PRAGMA freelist_count; PRAGMA user_version;')
			.all() as {
			page_count: number;
			page_size: number;
			freelist_count: number;
			user_version: number;
		}[];
		dbMeta = {
			pageCount: meta[0]?.page_count ?? 0,
			pageSize: meta[1]?.page_size ?? 0,
			freeListPages: meta[2]?.freelist_count ?? 0,
			schemaVersion: meta[3]?.user_version ?? 0
		};
	} catch {
		// File might not exist yet
	}

	const itemsByType = db
		.prepare(`SELECT type, COUNT(*) as count FROM items GROUP BY type ORDER BY count DESC`)
		.all() as { type: string; count: number }[];

	const itemsByHour = db
		.prepare(
			`SELECT 
			CAST(strftime('%H', datetime(cached_at / 1000, 'unixepoch', 'localtime')) AS INTEGER) as hour,
			COUNT(*) as count
		FROM items
		GROUP BY hour
		ORDER BY hour
	`
		)
		.all() as { hour: number; count: number }[];

	const scoreDistribution = db
		.prepare(
			`
		SELECT 
			CASE 
				WHEN score = 0 THEN '0'
				WHEN score = 1 THEN '1'
				WHEN score < 10 THEN '2-9'
				WHEN score < 50 THEN '10-49'
				WHEN score < 100 THEN '50-99'
				WHEN score < 500 THEN '100-499'
				WHEN score < 1000 THEN '500-999'
				ELSE '1000+'
			END as bucket,
			COUNT(*) as count
		FROM items
		WHERE score IS NOT NULL AND type = 'story'
		GROUP BY bucket
		ORDER BY 
			CASE bucket
				WHEN '0' THEN 1
				WHEN '1' THEN 2
				WHEN '2-9' THEN 3
				WHEN '10-49' THEN 4
				WHEN '50-99' THEN 5
				WHEN '100-499' THEN 6
				WHEN '500-999' THEN 7
				WHEN '1000+' THEN 8
			END
	`
		)
		.all() as { bucket: string; count: number }[];

	const buckets = ['0', '1', '2-9', '10-49', '50-99', '100-499', '500-999', '1000+'];
	const scoreDistributionWithZero = buckets.map((b) => {
		const existing = scoreDistribution.find((d) => d.bucket === b);
		return existing || { bucket: b, count: 0 };
	});

	const topUsers = db
		.prepare(
			`
		SELECT id, karma 
		FROM users 
		ORDER BY karma DESC 
		LIMIT 10
	`
		)
		.all() as { id: string; karma: number }[];

	const topStories = db
		.prepare(
			`
		SELECT id, title, score, by 
		FROM items 
		WHERE type = 'story' AND score IS NOT NULL AND deleted != 1 AND dead != 1
		ORDER BY score DESC 
		LIMIT 10
	`
		)
		.all() as { id: number; title: string; score: number; by: string }[];

	const topComments = db
		.prepare(
			`
		SELECT id, parent, text, by, score 
		FROM items 
		WHERE type = 'comment' AND text IS NOT NULL AND deleted != 1 AND dead != 1
		ORDER BY score DESC NULLS LAST
		LIMIT 10
	`
		)
		.all() as { id: number; parent: number; text: string; by: string; score: number }[];

	const rawCacheStats = db
		.prepare(
			`
		SELECT 
			COUNT(*) as count,
			MIN(cached_at) as oldest,
			MAX(cached_at) as newest
		FROM raw_cache
	`
		)
		.get() as { count: number; oldest: number | null; newest: number | null };

	// Search database stats
	const searchDbPath = join(DB_DIR, 'search.sqlite');
	let searchDbSize = 'N/A';
	let searchDbMeta = { pageCount: 0, pageSize: 0, freeListPages: 0 };

	try {
		const searchStats = statSync(searchDbPath);
		searchDbSize = formatBytes(searchStats.size);

		const searchMeta = db
			.prepare('PRAGMA search.page_count; PRAGMA search.page_size; PRAGMA search.freelist_count;')
			.all() as {
			page_count: number;
			page_size: number;
			freelist_count: number;
		}[];
		searchDbMeta = {
			pageCount: searchMeta[0]?.page_count ?? 0,
			pageSize: searchMeta[1]?.page_size ?? 0,
			freeListPages: searchMeta[2]?.freelist_count ?? 0
		};
	} catch {
		// File might not exist yet
	}

	const indexedItemsCount = (() => {
		try {
			return (db.prepare('SELECT COUNT(*) as count FROM search.items').get() as { count: number })
				.count;
		} catch {
			return 0;
		}
	})();

	const indexedUsersCount = (() => {
		try {
			return (db.prepare('SELECT COUNT(*) as count FROM search.users').get() as { count: number })
				.count;
		} catch {
			return 0;
		}
	})();

	const itemsByTypeSearch = (() => {
		try {
			return db
				.prepare(
					'SELECT type, COUNT(*) as count FROM search.items GROUP BY type ORDER BY count DESC'
				)
				.all() as { type: string; count: number }[];
		} catch {
			return [];
		}
	})();

	const totalIndexed = indexedItemsCount + indexedUsersCount;
	const syncStatus = {
		totalIndexed,
		itemsPercent: totalIndexed > 0 ? (indexedItemsCount / totalIndexed) * 100 : 0,
		usersPercent: totalIndexed > 0 ? (indexedUsersCount / totalIndexed) * 100 : 0
	};

	const fts5Info = (() => {
		try {
			const tables = db
				.prepare(
					`SELECT name, sql FROM search.sqlite_master WHERE type='table' AND sql LIKE 'CREATE VIRTUAL TABLE%'`
				)
				.all() as { name: string; sql: string }[];

			const extractTokenizer = (sql: string): string => {
				const match = sql.match(/tokenize\s*=\s*'([^']+)'/i);
				return match ? match[1] : 'default';
			};

			const itemsTable = tables.find((t) => t.name === 'items');
			const usersTable = tables.find((t) => t.name === 'users');

			const itemsTokenizer = itemsTable ? extractTokenizer(itemsTable.sql) : 'N/A';
			const usersTokenizer = usersTable ? extractTokenizer(usersTable.sql) : 'N/A';

			return { itemsTokenizer, usersTokenizer };
		} catch (e) {
			console.error('Error fetching FTS5 info:', e);
			return { itemsTokenizer: 'N/A', usersTokenizer: 'N/A' };
		}
	})();

	const commonTokens = db
		.prepare(
			`
    SELECT term, cnt AS count
    FROM search.items_tokens
    ORDER BY cnt DESC
    LIMIT 20;
  `
		)
		.all() as { term: string; count: number }[];

	const requestStats = (() => {
		try {
			const totalRequests = (
				db.prepare('SELECT COUNT(*) as count FROM statistics.requests').get() as { count: number }
			).count;
			const durationStats = db
				.prepare(
					`
				SELECT MIN(duration) as min, MAX(duration) as max, AVG(duration) as avg, 
				       (SELECT duration FROM statistics.requests ORDER BY duration DESC LIMIT 1 OFFSET 5) as p95
				FROM statistics.requests
			`
				)
				.get() as { min: number; max: number; avg: number; p95: number };
			const avgDuration = durationStats.avg ?? 0;
			const requestsByStatus = db
				.prepare(
					`
				SELECT status, COUNT(*) as count
				FROM statistics.requests
				GROUP BY status
				ORDER BY count DESC
			`
				)
				.all() as { status: number; count: number }[];
			const requestsByUrl = db
				.prepare(
					`
				SELECT url, COUNT(*) as count, AVG(duration) as avgDuration
				FROM statistics.requests
				GROUP BY url
				ORDER BY count DESC
				LIMIT 10
			`
				)
				.all() as { url: string; count: number; avgDuration: number }[];
			return {
				totalRequests,
				avgDuration,
				minDuration: durationStats.min,
				maxDuration: durationStats.max,
				p95Duration: durationStats.p95,
				requestsByStatus,
				requestsByUrl
			};
		} catch {
			return {
				totalRequests: 0,
				avgDuration: 0,
				minDuration: 0,
				maxDuration: 0,
				p95Duration: 0,
				requestsByStatus: [],
				requestsByUrl: []
			};
		}
	})();

	const queryStats = (() => {
		try {
			const totalQueries = (
				db.prepare('SELECT COUNT(*) as count FROM statistics.queries').get() as { count: number }
			).count;
			const avgDuration =
				(
					db.prepare('SELECT AVG(duration) as avg FROM statistics.queries').get() as {
						avg: number | null;
					}
				).avg ?? 0;
			const slowQueries = db
				.prepare(
					`
				SELECT sql, duration
				FROM statistics.queries
				ORDER BY duration DESC
				LIMIT 10
			`
				)
				.all() as { sql: string; duration: number }[];
			const topQueries = db
				.prepare(
					`
				SELECT sql, COUNT(*) as count
				FROM statistics.queries
				GROUP BY sql
				ORDER BY count DESC
				LIMIT 10
			`
				)
				.all() as { sql: string; count: number }[];
			return { totalQueries, avgDuration, slowQueries, topQueries };
		} catch (e) {
			return { totalQueries: 0, avgDuration: 0, slowQueries: [], topQueries: [] };
		}
	})();

	let statisticsDbSize = 'N/A';
	try {
		const statStats = statSync(join(DB_DIR, 'statistics.sqlite'));
		statisticsDbSize = formatBytes(statStats.size);
	} catch {}

	return {
		stats: {
			totalItems,
			totalUsers,
			itemsByType,
			itemsByHour,
			scoreDistribution: scoreDistributionWithZero,
			topUsers,
			topStories,
			topComments,
			rawCacheStats,
			dbSize,
			dbMeta,
			searchDbSize,
			searchDbMeta,
			indexedItemsCount,
			indexedUsersCount,
			itemsByTypeSearch,
			syncStatus,
			fts5Info,
			commonTokens,
			requestStats,
			queryStats,
			statisticsDbSize
		}
	} as { stats: Stats };
}
