import * as db from '$lib/db';
import { HN_BASE_URL } from './constants';
import { fetch } from './queue';

export async function request<T = unknown>(path: string, priority: 'high' | 'low' = 'high') {
	const response = await fetch<T>(`${HN_BASE_URL}${path}`, priority);

	db.storeRequest({
		url: path,
		status: response.httpStatus,
		duration: Math.floor(response.durationMs),
		responseSize: response.sizeBytes
	});

	if (response.error) {
		throw new Error(`HN API error ${response.httpStatus} ${response.error.message} — ${path}`);
	}

	return response.data;
}
