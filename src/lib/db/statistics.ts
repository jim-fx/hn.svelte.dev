import { IS_COMPRESSED } from './constants';
import { db } from './db';
import {stat} from "node:fs/promises"

type DbRequest = {
	url: string;
	duration: number;
	status: number;
	responseSize: number;
};

export function storeRequest(request: DbRequest) {
	return db.run("insert_request").run(request);
}

type DbQuery = {
	sql: string;
	duration: number;
};

export function storeQuery(query: DbQuery) {
	return db.run("insert_query").run(query);
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function getSize(){
  try {
    const url = new URL(db.path);
    console.log(db.path);
    const stats = await stat(url.pathname);
    console.log(url.pathname)
    return formatBytes(stats.size);
  } catch{
    return null
  }
}

export async function getStatistics() {
	const { data } = db
    .run("get_statistics")
    .get();
  return {
    is_compressed: IS_COMPRESSED,
    size: await getSize(),
    db: JSON.parse(data as string)
  }
}
