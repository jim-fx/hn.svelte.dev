import * as cache from './cache';
import type { Item, User } from './types';
import { runConcurrently, withRetry } from './utils';
import { HN_BASE_URL, STALE_MS } from './constants';

async function fetchItemInBackground(id: number) {
	const url = `${HN_BASE_URL}/item/${id}.json`;
	try {
		const response = await fetch(url);
		if (!response.ok) return;
		const fresh = await response.json();
		cache.storeItem(fresh);
	} catch {}
}

export async function fetchItem(id: number): Promise<Item> {
	const url = `${HN_BASE_URL}/item/${id}.json`;
	const cached = cache.getItem(id);
	if (cached !== undefined) {
		const isStale = Date.now() - new Date(cached.cached_at).getTime() > STALE_MS;
		if (isStale) fetchItemInBackground(id);
		return cached;
	}

	const response = await withRetry(() => fetch(url), { retries: 3, delay: 500 });
	if (!response.ok) {
		throw new Error(`HN API error ${response.status} ${response.statusText} — ${url}`);
	}

	const item = await response.json();
	cache.storeItem(item);
	return item;
}

export async function fetchItems(ids: number[]): Promise<Item[]> {
	return runConcurrently(
		ids.map((id) => () => fetchItem(id)),
		5
	);
}




export async function fetchUser(username: string) {
	const url = `${HN_BASE_URL}/user/${username}.json`;
	const response = await withRetry(() => fetch(url), { retries: 3, delay: 500 });

	if (!response.ok) {
		throw new Error(`HN API error ${response.status} ${response.statusText} — ${url}`);
	}

	const user = await response.json();
	return user as User;
}
