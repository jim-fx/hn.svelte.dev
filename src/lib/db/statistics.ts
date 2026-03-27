import { statSync } from 'fs';
import { join } from 'path';
import { DB_DIR } from '$env/static/private';
import { db } from './db';
import sqlStatements from './statements';

type DbRequest = {
	url: string;
	duration: number;
	status: number;
	responseSize: number;
};

export function storeRequest(request: DbRequest) {
	return db.run(sqlStatements.insert_request).run(request);
}

type DbQuery = {
	sql: string;
	duration: number;
};

export function storeQuery(query: DbQuery) {
	return db.run(sqlStatements.insert_query).run(query);
}

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
		topQueries: { sql: string; count: number; duration: number }[];
	};
	statisticsDbSize: string;
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function getStatistics(): Promise<Stats> {
	const stmts = db.prepare(sqlStatements.get_statistics);
	const results = stmts.all() as Record<string, unknown>[][];

	let idx = 0;
	const totals = results[idx++];
	const totalItems = Number(totals?.find((r) => r.key === 'total_items')?.value ?? 0);
	const totalUsers = Number(totals?.find((r) => r.key === 'total_users')?.value ?? 0);

	const itemsByType = results[idx++] as { type: string; count: number }[];
	const itemsByHour = results[idx++] as { hour: number; count: number }[];
	const scoreDistribution = results[idx++] as { bucket: string; count: number }[];
	const topUsers = results[idx++] as { id: string; karma: number }[];
	const topStories = results[idx++] as { id: number; title: string; score: number; by: string }[];
	const topComments = results[idx++] as {
		id: number;
		parent: number;
		text: string;
		by: string;
		score: number;
	}[];
	const rawCacheStatsArr = results[idx++] as {
		count: number;
		oldest: number | null;
		newest: number | null;
	}[];
	const rawCacheStats = rawCacheStatsArr[0] || { count: 0, oldest: null, newest: null };

	let indexedItemsCount = 0;
	let indexedUsersCount = 0;
	let itemsByTypeSearch: { type: string; count: number }[] = [];

	try {
		const searchCounts = results[idx++];
		indexedItemsCount = Number(searchCounts?.[0]?.count ?? 0);
		indexedUsersCount = Number(searchCounts?.[1]?.count ?? 0);
		itemsByTypeSearch = results[idx++] as { type: string; count: number }[];
	} catch {
		// Search DB might not exist
	}

	const fts5Tables = results[idx++] as { name: string; sql: string }[];
	const extractTokenizer = (sql: string): string => {
		const match = sql.match(/tokenize\s*=\s*'([^']+)'/i);
		return match ? match[1] : 'default';
	};
	const itemsTable = fts5Tables?.find((t) => t.name === 'items');
	const usersTable = fts5Tables?.find((t) => t.name === 'users');
	const fts5Info = {
		itemsTokenizer: itemsTable ? extractTokenizer(itemsTable.sql) : 'N/A',
		usersTokenizer: usersTable ? extractTokenizer(usersTable.sql) : 'N/A'
	};

	const commonTokens = results[idx++] as { term: string; count: number }[];

	const requestStatsCombined = results[idx++] as {
		total_requests: number;
		avg_duration: number;
		min_duration: number;
		max_duration: number;
		p95_duration: number;
	}[];
	const reqStats = requestStatsCombined?.[0];
	const requestsByStatus = results[idx++] as { status: number; count: number }[];
	const requestsByUrl = results[idx++] as { url: string; count: number; avg_duration: number }[];

	const queryStatsCombined = results[idx++] as {
		total_queries: number;
		avg_duration: number;
	}[];
	const qStats = queryStatsCombined?.[0];
	const slowQueries = results[idx++] as { sql: string; duration: number }[];
	const topQueries = results[idx++] as { sql: string; count: number; duration: number }[];

	const buckets = ['0', '1', '2-9', '10-49', '50-99', '100-499', '500-999', '1000+'];
	const scoreDistributionWithZero = buckets.map((b) => {
		const existing = scoreDistribution?.find((d) => d.bucket === b);
		return existing || { bucket: b, count: 0 };
	});

	const totalIndexed = indexedItemsCount + indexedUsersCount;
	const syncStatus = {
		totalIndexed,
		itemsPercent: totalIndexed > 0 ? (indexedItemsCount / totalIndexed) * 100 : 0,
		usersPercent: totalIndexed > 0 ? (indexedUsersCount / totalIndexed) * 100 : 0
	};

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
	} catch {}

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
	} catch {}

	let statisticsDbSize = 'N/A';
	try {
		const statStats = statSync(join(DB_DIR, 'statistics.sqlite'));
		statisticsDbSize = formatBytes(statStats.size);
	} catch {}

	return {
		totalItems,
		totalUsers,
		itemsByType: itemsByType || [],
		itemsByHour: itemsByHour || [],
		scoreDistribution: scoreDistributionWithZero,
		topUsers: topUsers || [],
		topStories: topStories || [],
		topComments: topComments || [],
		rawCacheStats,
		dbSize,
		dbMeta,
		searchDbSize,
		searchDbMeta,
		indexedItemsCount,
		indexedUsersCount,
		itemsByTypeSearch: itemsByTypeSearch || [],
		syncStatus,
		fts5Info,
		commonTokens: commonTokens || [],
		requestStats: {
			totalRequests: reqStats?.total_requests ?? 0,
			avgDuration: reqStats?.avg_duration ?? 0,
			minDuration: reqStats?.min_duration ?? 0,
			maxDuration: reqStats?.max_duration ?? 0,
			p95Duration: reqStats?.p95_duration ?? 0,
			requestsByStatus: requestsByStatus || [],
			requestsByUrl:
				requestsByUrl?.map((r) => ({ url: r.url, count: r.count, avgDuration: r.avg_duration })) ||
				[]
		},
		queryStats: {
			totalQueries: qStats?.total_queries ?? 0,
			avgDuration: qStats?.avg_duration ?? 0,
			slowQueries: slowQueries || [],
			topQueries: topQueries || []
		},
		statisticsDbSize
	};
}
