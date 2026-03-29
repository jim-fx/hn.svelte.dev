import type { SQLInputValue } from 'node:sqlite';
import { db } from './db';

export type RawRow = ReturnType<typeof deserializeRow>;
function deserializeRow(row: Record<string, SQLInputValue>) {
	return {
		path: row.path as string,
		data: JSON.parse(row.data as string),
		cached_at: new Date(row.cached_at as number)
	};
}

export function getRawCache(path: string) {
	return db.run<RawRow>('select_raw', { deserialize: deserializeRow }).get({ path });
}

export function storeRawCache(path: string, data: unknown) {
	return db.run('upsert_raw').run({ path, data: JSON.stringify(data), cached_at: Date.now() });
}
