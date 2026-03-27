import { getRawCache, storeRawCache, type RawRow } from '$lib/db';
import { fetchItemsWithComments } from './comments';
import { fetchItems } from './item';
import type { StoryType } from './types';
import { createLogger } from '$lib/logger';
import { request } from './request';
import { isStale } from './utils';

const logger = createLogger('hn:list');

export async function fetchRaw(path: string) {
	const cached = getRawCache(path);
  logger.debug("getting raw cache", {isCached: !!cached})
	if (cached) {
		if (isStale(cached)) {
      request(path).then(r => storeRawCache(path, r))
    }
		return cached;
	}

  logger.debug("fetching list", {path});
	const response = await request<RawRow>(path);
	storeRawCache(path, response);
	logger.info(`fetched raw ${path}`);
	return response;
}

export async function fetchListIds(list: StoryType) {
	const path = `/${list}stories.json`;
	logger.debug(`fetching list ids for ${list}`);
	const res = await fetchRaw(path);
  return res.data;
}

export async function fetchRecentPosts() {
	logger.debug('fetching recent posts');
	const data = await fetchRaw('/topstories.json');
	const items = await fetchItems(data.ids);
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
