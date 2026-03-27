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
