import { setupDatabase, getDatabase } from '$lib/hn/db';
import { statSync } from 'fs';
import { join } from 'path';
import { DB_DIR } from '$env/static/private';

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
	commonTokens: { token: string; count: number }[];
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function load() {
	setupDatabase();
	const db = getDatabase('hn.sqlite');

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
		.prepare(
			`
		SELECT type, COUNT(*) as count FROM items GROUP BY type ORDER BY count DESC
	`
		)
		.all() as { type: string; count: number }[];

	const itemsByHour = db
		.prepare(
			`
		SELECT 
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
				WHEN score < 10 THEN '0-9'
				WHEN score < 50 THEN '10-49'
				WHEN score < 100 THEN '50-99'
				WHEN score < 500 THEN '100-499'
				WHEN score < 1000 THEN '500-999'
				ELSE '1000+'
			END as bucket,
			COUNT(*) as count
		FROM items
		WHERE score IS NOT NULL
		GROUP BY bucket
		ORDER BY 
			CASE bucket
				WHEN '0-9' THEN 1
				WHEN '10-49' THEN 2
				WHEN '50-99' THEN 3
				WHEN '100-499' THEN 4
				WHEN '500-999' THEN 5
				WHEN '1000+' THEN 6
			END
	`
		)
		.all() as { bucket: string; count: number }[];

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

		const searchDb = getDatabase('search.sqlite');
		const searchMeta = searchDb
			.prepare('PRAGMA page_count; PRAGMA page_size; PRAGMA freelist_count;')
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
			const searchDb = getDatabase('search.sqlite');
			return (searchDb.prepare('SELECT COUNT(*) as count FROM items').get() as { count: number })
				.count;
		} catch {
			return 0;
		}
	})();

	const indexedUsersCount = (() => {
		try {
			const searchDb = getDatabase('search.sqlite');
			return (searchDb.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number })
				.count;
		} catch {
			return 0;
		}
	})();

	const itemsByTypeSearch = (() => {
		try {
			const searchDb = getDatabase('search.sqlite');
			return searchDb
				.prepare('SELECT type, COUNT(*) as count FROM items GROUP BY type ORDER BY count DESC')
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
			const searchDb = getDatabase('search.sqlite');
			const tables = searchDb
				.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%config'")
				.all() as { name: string }[];
			const tableNames = tables.map((t) => t.name);
			let itemsTokenizer = 'trigram';
			let usersTokenizer = 'default';
			if (!tableNames.includes('items_config')) {
				itemsTokenizer = 'trigram (inferred)';
			}
			if (!tableNames.includes('users_config')) {
				usersTokenizer = 'default (inferred)';
			}
			return { itemsTokenizer, usersTokenizer };
		} catch {
			return { itemsTokenizer: 'N/A', usersTokenizer: 'N/A' };
		}
	})();

	const commonTokens = (() => {
		try {
			const db = getDatabase('hn.sqlite');

			const tokenMap = new Map<string, number>();
			const batchSize = 5000;
			let offset = 0;

			while (true) {
				const items = db
					.prepare(
						`SELECT id, title, text FROM items WHERE deleted IS NOT 1 AND (title IS NOT NULL OR text IS NOT NULL) LIMIT ? OFFSET ?`
					)
					.all(batchSize, offset) as { id: number; title: string | null; text: string | null }[];

				if (items.length === 0) break;

				for (const item of items) {
					const text = ((item.title ?? '') + ' ' + (item.text ?? '')).toLowerCase();
					const words = text
						.split(/[\s\n\r\t.,;:!?()[\]{}"'<>"\\/]+/)
						.filter((w) => w.length > 2 && /^[a-z0-9]+$/.test(w));
					for (const word of words) {
						tokenMap.set(word, (tokenMap.get(word) ?? 0) + 1);
					}
				}

				offset += batchSize;
			}

			const sorted = [...tokenMap.entries()]
				.sort((a, b) => b[1] - a[1])
				.slice(0, 20)
				.map(([token, count]) => ({ token, count }));

			return sorted;
		} catch (e) {
			console.error('Error computing tokens:', e);
			return [];
		}
	})();

	return {
		stats: {
			totalItems,
			totalUsers,
			itemsByType,
			itemsByHour,
			scoreDistribution,
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
			commonTokens
		}
	} as { stats: Stats };
}
