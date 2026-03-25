import { getRawCache, storeRawCache } from './db';
import { fetchItemsWithComments } from './comments';
import { HN_BASE_URL, LIST_STALE_MS } from './constants';
import { fetchItems } from './item';
import type { StoryType } from './types';
import { withRetry } from './utils';
import { createLogger } from '$lib/logger';

const logger = createLogger('hn:list');

export async function fetchRaw(path: string) {
	const cached = getRawCache(path);
	if (cached !== undefined) {
		const isStale = Date.now() - cached.cached_at.getTime() > LIST_STALE_MS;
		if (isStale) {
			const url = `${HN_BASE_URL}${path}`;
			withRetry(() => fetch(url), { retries: 3, delay: 500 })
				.then((r) => r.json())
				.then((data) => storeRawCache(path, data))
				.catch((err) => logger.warn(`background refresh raw ${path} failed`, { error: err }));
		}
		logger.debug(`cache hit raw ${path}`);
		return cached.data as ReturnType<typeof response.json>;
	}

	const url = `${HN_BASE_URL}${path}`;
	const response = await withRetry(() => fetch(url), { retries: 3, delay: 500 });
	if (!response.ok) {
		throw new Error(`HN API error ${response.status} ${response.statusText} — ${url}`);
	}
	const data = await response.json();
	storeRawCache(path, data);
	logger.info(`fetched raw ${path}`);
	return data;
}

export async function fetchListIds(list: StoryType) {
	const path = `/${list}stories.json`;
	logger.debug(`fetching list ids for ${list}`);
	return fetchRaw(path);
}

export async function fetchRecentPosts() {
	logger.debug('fetching recent posts');
	const ids = await fetchRaw('/topstories.json');
	const items = await fetchItems(ids);
	return items.filter((item) => item !== null && !item.dead && !item.deleted);
}

export async function fetchList(list: StoryType, page = 1, perPage = 30) {
	const start = (page - 1) * perPage;
	const end = start + perPage;

	const allIds = await fetchListIds(list);
	const pageIds = allIds.slice(start, end);
	const items = await fetchItemsWithComments(pageIds);

	const filtered = items.filter((item) => item !== null && !item.dead && !item.deleted);
	logger.info(`fetched list ${list} page ${page}: ${filtered.length} items`);

	return {
		items: filtered,
		page,
		perPage,
		total: allIds.length
	};
}
