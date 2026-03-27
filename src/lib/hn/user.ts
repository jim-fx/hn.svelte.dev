import { HN_BASE_URL, USER_STALE_MS } from './constants';
import type { User } from './types';
import * as db from '$lib/db';
import { createLogger } from '$lib/logger';
import { request } from './request';

const logger = createLogger('hn:user');

async function fetchUserInBackground(username: string) {
	const url = `${HN_BASE_URL}/user/${username}.json`;
	try {
		const fresh = await request(url);
		db.storeUser(fresh);
	} catch (err) {
		logger.warn(`background refresh user ${username} failed`, { error: err });
	}
}

export async function fetchUser(username: string): Promise<User> {
	const cached = db.getUser(username);
	if (cached !== undefined) {
		const isStale = Date.now() - new Date(cached.cached_at).getTime() > USER_STALE_MS;
		if (isStale) fetchUserInBackground(username);
		return cached;
	}

	logger.debug(`fetching user ${username}`);
	const url = `${HN_BASE_URL}/user/${username}.json`;
	const user = await request(url);
	db.storeUser(user);
	return user;
}
