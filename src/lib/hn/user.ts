import { HN_BASE_URL, USER_STALE_MS } from './constants';
import type { User } from './types';
import { withRetry } from './utils';
import * as cache from './db';
import { createLogger } from '$lib/logger';

const logger = createLogger('hn:user');

async function fetchUserInBackground(username: string) {
	const url = `${HN_BASE_URL}/user/${username}.json`;
	try {
		const response = await fetch(url);
		if (!response.ok) return;
		const fresh = await response.json();
		cache.storeUser(fresh);
	} catch (err) {
		logger.warn(`background refresh user ${username} failed`, { error: err });
	}
}

export async function fetchUser(username: string): Promise<User> {
	const cached = cache.getUser(username);
	if (cached !== undefined) {
		const isStale = Date.now() - new Date(cached.cached_at).getTime() > USER_STALE_MS;
		if (isStale) fetchUserInBackground(username);
		return cached;
	}

	logger.debug(`fetching user ${username}`);
	const url = `${HN_BASE_URL}/user/${username}.json`;
	const response = await withRetry(() => fetch(url), { retries: 3, delay: 500 });

	if (!response.ok) {
		logger.error('failed to fetch user', response.status);
		throw new Error(`HN API error ${response.status} ${response.statusText} — ${url}`);
	}

	const user = await response.json();
	cache.storeUser(user);
	return user;
}
