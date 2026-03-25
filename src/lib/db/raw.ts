import { db } from "./db";
import statements from "./statements";

type RawRow = {
  path: string;
  data: string;
  cached_at: number;
}

export function getRawCache(path: string): { data: unknown; cached_at: Date } | undefined {
  const row = db.run<RawRow>(statements.select_raw).get({path});
	if (!row) return undefined;
	return { data: JSON.parse(row.data), cached_at: new Date(row.cached_at) };
}

export function storeRawCache(path: string, data: unknown) {
  return db
  .run(statements.upsert_raw)
  .run({ path, data: JSON.stringify(data), cached_at: Date.now() });
}

