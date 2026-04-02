import {
	ITEM_STALE_INITIAL,
	ITEM_STALE_MAX,
	ITEM_STALE_RAMP_UP,
	LIST_STALE_MS,
	USER_STALE_MS
} from './constants';
import type { Item, User } from './types';

type CacheBase = {
	cached_at: Date;
};

export function getItemStaleThreshold(item: Item): number {
	const created = item.time ? item.time * 1000 : item.cached_at.getTime();
	const now = Date.now();
	const age = now - created;

	if (age < ITEM_STALE_RAMP_UP) {
		return ITEM_STALE_INITIAL;
	}

	if (age > ITEM_STALE_MAX) {
		return ITEM_STALE_MAX;
	}

	const progress = (age - ITEM_STALE_RAMP_UP) / (ITEM_STALE_MAX - ITEM_STALE_RAMP_UP);
	return ITEM_STALE_INITIAL + progress * (ITEM_STALE_MAX - ITEM_STALE_INITIAL);
}

export function isStale(item: CacheBase | Item | User): boolean {
	const now = Date.now();
	const cachedAt = item.cached_at.getTime();
	const cacheAge = now - cachedAt;

	const tenMinutes = 1000 * 60 * 10;

	if ('type' in item) {
		if (item.type === 'comment') {
			const created = new Date(item.time ?? 0).getTime();
			if (now > created + tenMinutes && cachedAt < created + tenMinutes) {
				return true;
			}
		}
		return cacheAge > getItemStaleThreshold(item);
	}

	if ('karma' in item) {
		return cacheAge > USER_STALE_MS;
	}

	return cacheAge > LIST_STALE_MS;
}
