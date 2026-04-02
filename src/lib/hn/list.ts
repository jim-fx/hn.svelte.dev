import { getRawCache, storeRawCache, type RawRow } from '$lib/db';
import * as db from '$lib/db';
import type { StoryType } from './types';
import { createLogger } from '$lib/logger';
import { request } from './request';
import { isStale } from './utils';
import { fetchItemWithComments } from './comments';
import { fetchItemInBackground } from './item';

const logger = createLogger('hn:list');

export async function fetchRaw(path: string) {
	const cached = getRawCache(path);
	logger.debug('getting raw cache', { isCached: !!cached });
	if (cached) {
		if (isStale(cached)) {
			request(path).then((r) => storeRawCache(path, r));
		}
		return cached.data;
	}

	logger.debug('fetching list', { path });
	const response = await request<RawRow>(path);
	storeRawCache(path, response);
	logger.info(`fetched raw ${path}`);
	return response;
}

export async function fetchListIds(list: StoryType): Promise<number[]> {
	const path = `/${list}stories.json`;
	const res = await fetchRaw(path);
	logger.debug(`fetching list ids for '${list}'`, res);
	return res;
}

export async function fetchList(list: StoryType, page = 1, perPage = 30) {
	const start = (page - 1) * perPage;
	const end = start + perPage;

	const allIds = await fetchListIds(list);
	const pageIds = new Set(allIds.slice(start, end));
	const items = db.getItemsWithComments([...pageIds.values()]);

	// Update top_position
	if (list === 'top') {
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item?.id) {
				const position = allIds.indexOf(item.id);
				if (position === -1) continue;
				item.top_position = position + 1;
				db.upsertItem(item);
			}
		}
	}

	const missingIds = new Set<number>([...pageIds]);
	for (const item of items) {
		if (item?.id && pageIds.has(item.id)) {
			missingIds.delete(item.id);
		}
	}

	const missingIdsArray = [...missingIds.values()];
	const batchSize = 5;
	for (let i = 0; i < missingIdsArray.length; i += batchSize) {
		const batch = missingIdsArray.slice(i, i + batchSize);
		batch.forEach((id) => fetchItemWithComments(id));
	}

	const filtered = items.filter((item) => item && !item.dead && !item.deleted);
	logger.info(`fetched list ${list} page ${page}: ${filtered.length} items`);

	setTimeout(() => {
		const staleItems = filtered.filter((item): item is NonNullable<typeof item> => isStale(item));
		for (let i = 0; i < staleItems.length; i += batchSize) {
			const batch = staleItems.slice(i, i + batchSize);
			batch.forEach((item) => fetchItemInBackground(item.id));
		}
	}, 2000);

	return {
		items: filtered,
		page,
		perPage,
		total: allIds.length
	};
}
