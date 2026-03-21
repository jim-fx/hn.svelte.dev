import { setupDatabase, getDatabase } from '$lib/hn/cache';
import { statSync } from 'fs';
import { join } from 'path';
import { DB_DIR } from '$env/static/private';

interface Stats {
	totalItems: number;
	itemsByType: { type: string; count: number }[];
	itemsByHour: { hour: number; count: number }[];
	scoreDistribution: { bucket: string; count: number }[];
	topUsers: { by: string; count: number }[];
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
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function load() {
	setupDatabase();
	const db = getDatabase();

	const totalItems = (db.prepare('SELECT COUNT(*) as count FROM items').get() as { count: number })
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
		SELECT by, COUNT(*) as count 
		FROM items 
		WHERE by IS NOT NULL 
		GROUP BY by 
		ORDER BY count DESC 
		LIMIT 10
	`
		)
		.all() as { by: string; count: number }[];

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

	return {
		stats: {
			totalItems,
			itemsByType,
			itemsByHour,
			scoreDistribution,
			topUsers,
			topStories,
			topComments,
			rawCacheStats,
			dbSize,
			dbMeta
		}
	} as { stats: Stats };
}
