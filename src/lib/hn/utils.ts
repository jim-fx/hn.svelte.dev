const TRANSIENT_ERROR_CODES = new Set([
	'ECONNRESET',
	'ETIMEDOUT',
	'ECONNREFUSED',
	'ENOTFOUND',
	'ENETUNREACH',
	'EAI_AGAIN'
]);

export function isTransientError(error: unknown): boolean {
	if (error instanceof TypeError && error.message.includes('fetch failed')) {
		return true;
	}
	if (error instanceof Error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code && TRANSIENT_ERROR_CODES.has(code)) {
			return true;
		}
	}
	return false;
}

export async function withRetry<T>(
	fn: () => Promise<T>,
	options: { retries?: number; delay?: number; backoff?: number } = {}
): Promise<T> {
	const { retries = 3, delay = 500, backoff = 2 } = options;
	let lastError: unknown;
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (attempt < retries && isTransientError(error)) {
				await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(backoff, attempt)));
			} else {
				break;
			}
		}
	}
	throw lastError;
}

export async function runConcurrently<T>(
	tasks: (() => Promise<T>)[],
	concurrency: number
): Promise<T[]> {
	if (concurrency <= 0) throw new Error('concurrency must be > 0');
	const results: T[] = new Array(tasks.length);
	let index = 0;
	async function worker() {
		while (index < tasks.length) {
			const current = index++;
			try {
				results[current] = await tasks[current]();
			} catch(e) {
				results[current] = undefined as T;
			}
		}
	}
	await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
	return results;
}
