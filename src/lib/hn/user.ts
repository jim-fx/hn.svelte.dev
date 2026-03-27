import type { User } from './types';
import * as db from '$lib/db';
import { createLogger } from '$lib/logger';
import { request } from './request';
import { isStale } from './utils';

const logger = createLogger('hn:user');

async function fetchUserInBackground(username: string) {
	const url = `/user/${username}.json`;
	try {
		const fresh = await request<User>(url,"low");
		db.storeUser(fresh);
	} catch (err) {
		logger.warn(`background refresh user ${username} failed`, { error: err });
	}
}

export async function fetchUser(username: string): Promise<User> {
	const cached = db.getUser(username);
	if (cached) {
		if (isStale(cached)) fetchUserInBackground(username);
		return cached;
	}

	logger.debug(`fetching user ${username}`);
	const user = await request<User>(`/user/${username}.json`);
	db.storeUser(user);

	return user;
}
