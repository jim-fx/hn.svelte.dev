import * as db from '$lib/db';
import type { Item } from './types';
import { isStale } from './utils';
import { createLogger } from '$lib/logger';
import { fetchUser } from './user';
import { request } from './request';

const logger = createLogger('hn:item');

export async function fetchItemInBackground(id: number) {
	try {
		const fresh = await request<Item>(`/item/${id}.json`,"low");
		db.storeItem(fresh);
		logger.debug(`background refresh '${fresh.type}' ${id}`);
	} catch (err) {
		logger.warn(`background refresh item ${id} failed`, { error: err });
	}
}

export async function fetchItem(id: number): Promise<Item> {
  const url = `/item/${id}.json`;
  const cached = db.getItem(id);
  if (cached) {
    if (isStale(cached)) fetchItemInBackground(id);
    return cached;
  }
  const item = await request<Item>(url);
  db.storeItem(item);
  logger.info(`fetched '${item.type}' ${id}`);
  if (item.by) fetchUser(item.by);
  return item;
}

export async function fetchItems(ids: number[]): Promise<Item[]> {
  return Promise.all(ids.map(id => fetchItem(id)));
}
