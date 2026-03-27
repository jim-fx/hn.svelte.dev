import { dev } from "$app/environment";
import { Worker } from "node:worker_threads";
import {existsSync} from "fs";
function getWorker(): Worker{
  try {
    const u = new URL(dev ? "./queue_backend.ts":"./queue_backend.js", import.meta.url);
    if(existsSync(u)){
      return new Worker(u);
    }
  }  catch { }
  console.log("Failed to create worker")
  return {on: () => undefined} as unknown as Worker;
}

const worker = getWorker();

function cleanup() {
	worker.terminate();
}

process.on('exit', cleanup);
process.on('SIGINT', () => {
	cleanup();
	process.exit(0);
});
process.on('SIGTERM', () => {
	cleanup();
	process.exit(0);
});

type FetchResult<T> =
	| { data: T; httpStatus: number; durationMs: number; sizeBytes: number; error?: undefined }
	| { error: Error; httpStatus: number; durationMs: number; sizeBytes: number; data?: undefined };

const pending = new Map<string, { resolve: (v: any) => void }>();

worker.on('message', (msg) => {
	const entry = pending.get(msg.url);
	if (!entry) return;
	pending.delete(msg.url);
	entry.resolve(msg);
});

export function fetch<T>(url: string, priority: 'high' | 'low' = 'high'): Promise<FetchResult<T>> {
	return new Promise((resolve) => {
		pending.set(url, { resolve });
		worker.postMessage({
			type: 'fetch',
			url,
			priority
		});
	});
}
