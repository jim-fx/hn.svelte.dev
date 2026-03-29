import { ITEM_STALE_MS, LIST_STALE_MS, USER_STALE_MS } from './constants';
import type { Item, User } from './types';

type CacheBase = {
	cached_at: Date;
};

export function isStale(item: CacheBase | Item | User): boolean {
	const now = Date.now();
	const cachedAt = item.cached_at.getTime();
	const cacheAge = now - cachedAt;

	const tenMinutes = 1000 * 60 * 10;

	if ('type' in item) {
		if (item.type === 'comment') {
      const created = new Date(item.time ?? 0).getTime();
			// Users are allowed to edit comments for 10 minutes
			// So if the item is older then ten minutes we refetch id only once
			if (now > created + tenMinutes && cachedAt < created + tenMinutes) {
				return true;
			}
		}
    console.log({item, cacheAge,ITEM_STALE_MS});
		return cacheAge > ITEM_STALE_MS;
	}

	if ('karma' in item) {
		return cacheAge > USER_STALE_MS;
	}

	return cacheAge > LIST_STALE_MS;
}
