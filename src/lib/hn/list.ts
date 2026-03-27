import { getRawCache, storeRawCache } from '$lib/db';
import { fetchItemsWithComments } from './comments';
import { HN_BASE_URL } from './constants';
import { fetchItems } from './item';
import type { StoryType } from './types';
import { createLogger } from '$lib/logger';
import { request } from './request';
import { isStale } from './utils';

const logger = createLogger('hn:list');

async function fetchInBackground(path: string) {
	const url = `${HN_BASE_URL}${path}`;
	const data = await request(url);
	storeRawCache(path, data);
}

export async function fetchRaw(path: string) {
	const cached = getRawCache(path);
	if (cached) {
		if (isStale(cached)) fetchInBackground(`${HN_BASE_URL}${path}`);
		return cached;
	}

	const response = await request(`${HN_BASE_URL}${path}`);
	storeRawCache(path, response);
	logger.info(`fetched raw ${path}`);
	return response;
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

	const filtered = items.filter((item) => item && !item.dead && !item.deleted);
	logger.info(`fetched list ${list} page ${page}: ${filtered.length} items`);

	return {
		items: filtered,
		page,
		perPage,
		total: allIds.length
	};
}
