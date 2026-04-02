import { parentPort } from 'node:worker_threads';

export const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';
const MAX_CONCURRENT = 10;

if (!parentPort) {
	throw new Error('Must be run as worker');
}
console.log('[fetch_worker] initialized ' + Date.now());

const queues = {
	high: [] as Array<{ url: string }>,
	low: [] as Array<{ url: string }>
};

let queueClean = false;
let totalItems = 0;
setInterval(() => {
	if (queues.high.length || queues.low.length) {
		console.info(
			`[fetch_worker] queue size low=${queues.low.length} high=${queues.high.length} total_requests=${totalItems}`
		);
		if (queueClean) {
			queueClean = false;
		}
	} else {
		if (!queueClean) {
			queueClean = true;
			console.log(`[fetch_worker] queue is finished total_items=${totalItems}`);
		}
	}
}, 1000);

let active = 0;

parentPort.on('message', (msg) => {
	const queue = msg.priority === 'low' ? queues.low : queues.high;
	queue.push({ url: msg.url });
	processQueue();
});

function processQueue() {
	if (active >= MAX_CONCURRENT) return;

  const isHigh = queues.high[0] !== undefined;
	const job = queues.high.shift() ?? queues.low.shift();
	if (!job) return;

	active++;
	handleFetch(job, isHigh);
}

async function handleFetch(job: { url: string },isHigh: boolean) {
	const start = performance.now();
	try {
		const res = await fetch(job.url);
		const raw = await res.text();
		const sizeBytes = new TextEncoder().encode(raw).length;
		const data = res.ok ? JSON.parse(raw) : undefined;
		console.log(`[fetch_worker:${isHigh?"high":"low"}] fetched ${job.url.replace(HN_BASE_URL, '')}`);
		parentPort!.postMessage({
			url: job.url,
			data,
			httpStatus: res.status,
			durationMs: performance.now() - start,
			sizeBytes,
			error: res.ok ? undefined : new Error(`HTTP ${res.status}`),
      __meta: {
        high: queues.high.length,
        low: queues.low.length
      }
		});
	} catch (err: any) {
		parentPort!.postMessage({
			url: job.url,
			data: undefined,
			httpStatus: 0,
			durationMs: performance.now() - start,
			sizeBytes: 0,
			error: err instanceof Error ? err : new Error(String(err)),
      __meta: {
        high: queues.high.length,
        low: queues.low.length
      }
		});
	} finally {
		active--;
		totalItems++;
		setTimeout(() => processQueue(), 200);
	}
}
