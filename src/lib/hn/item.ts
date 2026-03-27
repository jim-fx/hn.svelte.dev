import * as db from '$lib/db';
import type { Item } from './types';
import { isStale, runConcurrently } from './utils';
import { HN_BASE_URL } from './constants';
import { createLogger } from '$lib/logger';
import { fetchUser } from './user';
import { request } from './request';

const logger = createLogger('hn:item');

async function fetchItemInBackground(id: number) {
	const url = `${HN_BASE_URL}/item/${id}.json`;
	try {
		const fresh = await request(url);
		db.storeItem(fresh);
		logger.debug(`background refresh item ${id}`);
	} catch (err) {
		logger.warn(`background refresh item ${id} failed`, { error: err });
	}
}

export async function fetchItem(id: number): Promise<Item> {
	const url = `${HN_BASE_URL}/item/${id}.json`;
	const cached = db.getItem(id);
	if (cached) {
		if (isStale(cached)) fetchItemInBackground(id);
		return cached;
	}

	const item = await request(url);
	db.storeItem(item);

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
