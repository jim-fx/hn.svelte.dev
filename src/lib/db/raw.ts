import type { SQLInputValue } from "node:sqlite";
import { db } from "./db";
import statements from "./statements";

type RawRow = {
  path: string;
  data: string;
  cached_at: Date;
}

function deserializeRow(row:Record<string, SQLInputValue>){
  return { path: row.path as string, data: JSON.parse(row.data as string), cached_at: new Date(row.cached_at as number) }
}

export function getRawCache(path: string): { data: unknown; cached_at: Date } | undefined {
  return db
    .run<RawRow>(statements.select_raw, { deserialize: deserializeRow })
    .get({path});
}

export function storeRawCache(path: string, data: unknown) {
  return db
  .run(statements.upsert_raw)
  .run({ path, data: JSON.stringify(data), cached_at: Date.now() });
}

