import type { User } from '$lib/hn/types';
import type { SQLInputValue, SQLOutputValue } from 'node:sqlite';
import { db } from './db';

function serialiseUser(user: User): Record<string, SQLInputValue> {
	return {
		name: user.id ?? user.name,
		created: user.created,
		karma: user.karma ?? null,
		about: user.about ?? null,
		submitted: user.submitted ? JSON.stringify(user.submitted) : null,
		cached_at: Date.now(),
		first_cached_at: Date.now()
	};
}

function deserialiseUser(row: Record<string, SQLOutputValue | undefined>): User {
	return {
		id: row.id as number,
		name: row.name as string,
		created: (row.created as number) ?? 0,
		karma: (row.karma as number) ?? 0,
		about: row.about as string | undefined,
		submitted: row.submitted ? JSON.parse(row.submitted as string) : undefined,
		cached_at: new Date(row.cached_at as number)
	};
}
export function getUser(name: string) {
	const row = db.run('select_user').get({ name });
	return row ? deserialiseUser(row) : undefined;
}

export function storeUser(user: User) {
	return db.run('upsert_user').run(serialiseUser(user));
}
