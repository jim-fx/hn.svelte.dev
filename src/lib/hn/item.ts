import * as db from '$lib/db';
import type { Item } from './types';
import { isStale } from './utils';
import { createLogger } from '$lib/logger';
import { fetchUserInBackground } from './user';
import { request } from './request';

const logger = createLogger('hn:item');

export async function fetchItemInBackground(id: number) {
	try {
		const fresh = await request<Item>(`/item/${id}.json`, 'low');
		db.upsertItem(fresh);
	} catch (err) {
		logger.warn(`background refresh item ${id} failed`, { error: err });
	}
}

export async function fetchItem(id: number): Promise<Item> {
	const url = `/item/${id}.json`;
	const cached = db.getItem(id);
	if (cached) {
    const stale = isStale(cached);
		if (stale) fetchItemInBackground(id);
		return cached;
	}
	const item = await request<Item>(url);
	db.upsertItem(item);
	logger.info(`fetched '${item.type}' ${id}`);
	if (item.by) fetchUserInBackground(item.by);
	return item;
}

export async function fetchItems(ids: number[]): Promise<Item[]> {
	return Promise.all(ids.map((id) => fetchItem(id)));
}
