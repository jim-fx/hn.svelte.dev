import { ITEM_STALE_MS, LIST_STALE_MS, USER_STALE_MS } from './constants';
import type { Item, User } from './types';

export async function runConcurrently<T>(
	tasks: (() => Promise<T>)[],
	concurrency: number
): Promise<T[]> {
	if (concurrency <= 0) throw new Error('concurrency must be > 0');
	const results: T[] = new Array(tasks.length);
	let index = 0;
	async function worker() {
		while (index < tasks.length) {
			const current = index++;
			try {
				results[current] = await tasks[current]();
			} catch (e) {
				results[current] = undefined as T;
			}
		}
	}
	await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
	return results;
}

type CacheBase = {
	cached_at: Date;
};

export function isStale(item: CacheBase | Item | User): boolean {
	const now = Date.now();
	const cachedAt = item.cached_at.getTime();
	const cacheAge = now - cachedAt;

	const tenMinutes = 1000 * 60 * 10;

	if ('type' in item) {
		const created = new Date(item.time ?? 0).getTime();
		if (item.type === 'comment') {
			// Users are allowed to edit comments for 10 minutes
			// So if the item is older then ten minutes we refetch id only once
			if (now > created + tenMinutes && cachedAt < created + tenMinutes) {
				return true;
			}
		}
		return cacheAge > ITEM_STALE_MS;
	}

	if ('karma' in item) {
		return cacheAge > USER_STALE_MS;
	}

	return cacheAge > LIST_STALE_MS;
}
