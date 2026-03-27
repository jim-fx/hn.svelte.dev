import WorkerClass from "./queue_backend.ts?nodeWorker";
const worker = WorkerClass();

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
