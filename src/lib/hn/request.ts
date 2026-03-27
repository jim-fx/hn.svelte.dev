import * as db from '$lib/db';

export async function request(url: string) {
	const start = performance.now();
	const response = await fetch(url);
	const duration = performance.now() - start;

	// Measure size safely
	let responseSize: number | null = null;

	const sizeHeader = response.headers.get('content-length');
	if (sizeHeader) {
		responseSize = parseInt(sizeHeader, 10);
	} else {
		const buffer = await response.clone().arrayBuffer();
		responseSize = buffer.byteLength;
	}

	db.storeRequest({
		url,
		status: response.status,
		duration: Math.floor(duration),
		responseSize
	});

	if (!response.ok) {
		throw new Error(`HN API error ${response.status} ${response.statusText} — ${url}`);
	}

	return response.json();
}
