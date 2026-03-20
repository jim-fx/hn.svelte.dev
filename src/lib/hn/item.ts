import * as cache from './cache';
import { fetchItemsWithComments } from './comments';
import type { Item, User } from './types';
import { runConcurrently, withRetry } from './utils';

const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';

export type StoryType = 'top' | 'new' | 'best' | 'ask' | 'show' | 'jobs';

const STALE_MS = 5 * 60 * 1000;

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

export async function fetchRaw(path: string) {
	const url = `${HN_BASE_URL}${path}`;
	const response = await withRetry(() => fetch(url), { retries: 3, delay: 500 });
	if (!response.ok) {
		throw new Error(`HN API error ${response.status} ${response.statusText} — ${url}`);
	}
	return response.json();
}

export async function fetchListIds(list: StoryType) {
	const path = `/${list}stories.json`;
	return fetchRaw(path);
}

export async function fetchRecentPosts() {
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

	return {
		items: filtered,
		page,
		perPage,
		total: allIds.length
	};
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
