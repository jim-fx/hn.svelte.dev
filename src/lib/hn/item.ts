import * as cache from './db';
import type { Item } from './types';
import { runConcurrently, withRetry } from './utils';
import { HN_BASE_URL, ITEM_STALE_MS } from './constants';
import { createLogger } from '$lib/logger';
import { fetchUser } from './user';

const logger = createLogger('hn:item');

async function fetchItemInBackground(id: number) {
	const url = `${HN_BASE_URL}/item/${id}.json`;
	try {
		const response = await fetch(url);
		if (!response.ok) return;
		const fresh = await response.json();
		cache.storeItem(fresh);
		logger.debug(`background refresh item ${id}`);
	} catch (err) {
		logger.warn(`background refresh item ${id} failed`, { error: err });
	}
}

export async function fetchItem(id: number): Promise<Item> {
	const url = `${HN_BASE_URL}/item/${id}.json`;
	const cached = cache.getItem(id);
	if (cached !== undefined) {
		const isStale = Date.now() - new Date(cached.cached_at).getTime() > ITEM_STALE_MS;
		if (isStale) fetchItemInBackground(id);
		return cached;
	}

	const response = await withRetry(() => fetch(url), { retries: 3, delay: 500 });
	if (!response.ok) {
		throw new Error(`HN API error ${response.status} ${response.statusText} — ${url}`);
	}

	const item = await response.json();
	cache.storeItem(item);
	logger.info(`fetched item ${id}`);

	if (item.by) {
		fetchUser(item.by);
	}

	return item;
}

export async function fetchItems(ids: number[]): Promise<Item[]> {
	logger.debug(`fetching ${ids.length} items`);
	return runConcurrently(
		ids.map((id) => () => fetchItem(id)),
		5
	);
}
