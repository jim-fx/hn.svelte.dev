import type { User } from "$lib/hn/types";
import type { SQLInputValue, SQLOutputValue } from "node:sqlite";
import sqlStatements from "./statements";
import { db } from "./db";

function serialiseUser(user: User): Record<string, SQLInputValue> {
	return {
		id: user.id,
		created: user.created ?? null,
		karma: user.karma ?? null,
		about: user.about ?? null,
		submitted: user.submitted ? JSON.stringify(user.submitted) : null,
		cached_at: Date.now()
	};
}

function deserialiseUser(row: Record<string, SQLOutputValue | undefined>): User {
	return {
		id: row.id as string,
		created: (row.created as number) ?? 0,
		karma: (row.karma as number) ?? 0,
		about: row.about as string | undefined,
		submitted: row.submitted ? JSON.parse(row.submitted as string) : undefined,
		cached_at: new Date(row.cached_at as number)
	};
}
export function getUser(id: string) {
  const row = db.run(sqlStatements.select_user).get({id});
	return row ? deserialiseUser(row) : undefined;
}

export function storeUser(user: User) {
	return db.run(sqlStatements.upsert_user).run(serialiseUser(user));
}
