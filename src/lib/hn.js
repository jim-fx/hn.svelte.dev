import { getFromCache, setCache } from './cache.js';

const BASE_URL = 'https://hacker-news.firebaseio.com/v0';

/** @type {Record<string, string>} */
const listMap = {
	top: 'topstories',
	new: 'newstories',
	show: 'showstories',
	ask: 'askstories',
	jobs: 'jobstories',
	best: 'beststories'
};

const PAGE_SIZE = 30;
const LIST_CACHE_TTL = 60 * 1000; // 60 seconds for list IDs
const ITEM_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for individual items

// Batch fetching configuration
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 50; // Small delay between batches to avoid rate limiting
const REQUEST_TIMEOUT_MS = 5000; // 5 second timeout per request

/**
 * Fetch with timeout and error handling
 * @param {string} url
 * @param {number} timeout
 * @returns {Promise<any>}
 */
async function fetchWithTimeout(url, timeout = REQUEST_TIMEOUT_MS) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, { signal: controller.signal });
		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		return response.json();
	} catch (error) {
		clearTimeout(timeoutId);
		throw error;
	}
}

/**
 * Fetch items in batches to avoid overwhelming the API
 * @param {number[]} ids
 * @param {number} batchSize
 * @returns {Promise<any[]>}
 */
async function fetchInBatches(ids, batchSize = BATCH_SIZE) {
	const results = [];

	for (let i = 0; i < ids.length; i += batchSize) {
		const batch = ids.slice(i, i + batchSize);

		// Fetch current batch in parallel
		const batchPromises = batch.map((id) =>
			fetchWithTimeout(`${BASE_URL}/item/${id}.json`).catch((error) => {
				console.error(
					`Failed to fetch item ${id}:`,
					error instanceof Error ? error.message : String(error)
				);
				return null; // Return null for failed fetches
			})
		);

		const batchResults = await Promise.all(batchPromises);
		results.push(...batchResults.filter((result) => result !== null));

		// Small delay between batches to avoid rate limiting
		if (i + batchSize < ids.length) {
			await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
		}
	}

	return results;
}

/**
 * @param {number} n
 * @returns {string}
 */
function plural(n) {
	if (n === 1) return 'a';
	return String(n);
}

/**
 * Convert a timestamp (seconds) into a relative time string
 * @param {number} timestamp
 * @returns {string}
 */
function formatTimeAgo(timestamp) {
	const createdDate = new Date(timestamp * 1000);
	const now = new Date();

	let years = now.getFullYear() - createdDate.getFullYear();
	let months = now.getMonth() - createdDate.getMonth();
	let days = now.getDate() - createdDate.getDate();
	let hours = now.getHours() - createdDate.getHours();
	let minutes = now.getMinutes() - createdDate.getMinutes();

	if (minutes < 0) {
		minutes += 60;
		hours--;
	}
	if (hours < 0) {
		hours += 24;
		days--;
	}
	if (days < 0) {
		const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
		days += prevMonth.getDate();
		months--;
	}
	if (months < 0) {
		months += 12;
		years--;
	}

	if (years > 0) return `${plural(years)} year${years > 1 ? 's' : ''} ago`;
	if (months > 0) return `${plural(months)} month${months > 1 ? 's' : ''} ago`;
	if (days > 0) return `${plural(days)} day${days > 1 ? 's' : ''} ago`;
	if (hours > 0) return `${plural(hours)} hour${hours > 1 ? 's' : ''} ago`;
	if (minutes > 0) return `${plural(minutes)} minute${minutes > 1 ? 's' : ''} ago`;

	return 'just now';
}

/**
 * Transform Firebase API response to match frontend expectations
 * @param {any} item
 * @returns {any}
 */
function transformItem(item) {
	if (!item) return null;

	const domain = item.url ? new URL(item.url).hostname.replace('www.', '') : undefined;

	return {
		...item,
		domain,
		user: item.by,
		points: item.score ?? 0,
		comments_count: item.descendants ?? 0,
		time_ago: formatTimeAgo(item.time),
		content: item.text ? `<p>${item.text}</p>` : ''
	};
}

/**
 * Transform a comment to match frontend expectations
 * @param {any} comment
 * @returns {any}
 */
function transformComment(comment) {
	if (!comment) return null;

	return {
		...comment,
		user: comment.by,
		time_ago: formatTimeAgo(comment.time),
		content: comment.text ? `<p>${comment.text}</p>` : ''
	};
}

/**
 * Transform a user to match frontend expectations
 * @param {any} user
 * @returns {any}
 */
function transformUser(user) {
	if (!user) return null;

	return {
		...user,
		created_ago: formatTimeAgo(user.created)
	};
}

/**
 * @param {number[]} ids
 * @returns {Promise<any[]>}
 */
export async function fetchItems(ids) {
	if (!ids?.length) return [];

	const limitedIds = ids.slice(0, PAGE_SIZE);
	const items = await fetchInBatches(limitedIds);
	return items.map(transformItem);
}

/**
 * @param {number[]} ids
 * @returns {Promise<any[]>}
 */
export async function fetchComments(ids) {
	if (!ids?.length) return [];

	// Limit the depth of comments to prevent excessive recursion
	// and reduce server load
	const MAX_DEPTH = 3;

	return fetchCommentsRecursive(ids, 0, MAX_DEPTH);
}

/**
 * Recursive comment fetching with depth limit
 * @param {number[]} ids
 * @param {number} depth
 * @param {number} maxDepth
 * @returns {Promise<any[]>}
 */
async function fetchCommentsRecursive(ids, depth, maxDepth) {
	if (!ids?.length || depth >= maxDepth) {
		return [];
	}

	// Limit concurrent comment fetches to avoid overwhelming the API
	const CONCURRENT_COMMENTS = 5;
	const limitedIds = ids.slice(0, 200); // Max 200 comments per level

	const comments = [];

	// Process comments in chunks to control concurrency
	for (let i = 0; i < limitedIds.length; i += CONCURRENT_COMMENTS) {
		const chunk = limitedIds.slice(i, i + CONCURRENT_COMMENTS);

		const chunkPromises = chunk.map(async (id) => {
			const cacheKey = `comment:${id}`;

			// Try to get comment from cache
			const cached = getFromCache(cacheKey);
			if (cached) {
				return cached;
			}

			try {
				const comment = await fetchWithTimeout(`${BASE_URL}/item/${id}.json`);
				const transformed = transformComment(comment);

				if (!transformed) return null;

				// Recursively fetch children if depth allows
				if (transformed?.kids?.length && depth < maxDepth - 1) {
					transformed.comments = await fetchCommentsRecursive(
						transformed.kids,
						depth + 1,
						maxDepth
					);
				} else {
					transformed.comments = [];
				}

				// Cache the comment
				setCache(cacheKey, transformed, ITEM_CACHE_TTL);

				return transformed;
			} catch (error) {
				// Log error but continue with other comments
				console.error(
					`Failed to fetch comment ${id}:`,
					error instanceof Error ? error.message : String(error)
				);
				return null;
			}
		});

		const chunkComments = await Promise.all(chunkPromises);
		comments.push(...chunkComments.filter(Boolean));
	}

	return comments;
}

/**
 * @param {string} list
 * @param {number} page
 * @returns {Promise<{list: string, page: number, items: any[]}>}
 */
export async function fetchList(list, page) {
	const listName = listMap[list] || 'topstories';
	const cacheKey = `list:${listName}`;

	// Try to get IDs from cache
	let ids = getFromCache(cacheKey);

	if (!ids) {
		// Fetch fresh data
		const response = await fetch(`${BASE_URL}/${listName}.json`);
		ids = await response.json();
		setCache(cacheKey, ids, LIST_CACHE_TTL);
	}

	const start = (page - 1) * PAGE_SIZE;
	const pageIds = ids.slice(start, start + PAGE_SIZE);
	const items = await fetchItems(pageIds);

	return { list, page, items };
}

/**
 * @param {string|number} id
 * @returns {Promise<any>}
 */
export async function fetchItem(id) {
	const cacheKey = `item:${id}`;

	// Try to get item from cache
	const cached = getFromCache(cacheKey);
	if (cached) {
		return cached;
	}

	const item = await fetch(`${BASE_URL}/item/${id}.json`).then((r) => r.json());
	const transformed = transformItem(item);

	if (!transformed) return null;

	// Fetch comments if there are kids
	if (transformed?.kids?.length) {
		transformed.comments = await fetchComments(transformed.kids);
	} else {
		transformed.comments = [];
	}

	// Cache the transformed item
	setCache(cacheKey, transformed);

	return transformed;
}

/**
 * @param {string} name
 * @returns {Promise<any>}
 */
export async function fetchUser(name) {
	const cacheKey = `user:${name}`;

	// Try to get user from cache
	const cached = getFromCache(cacheKey);
	if (cached) {
		return cached;
	}

	const user = await fetch(`${BASE_URL}/user/${name}.json`).then((r) => r.json());
	const transformed = transformUser(user);

	// Cache the transformed user
	setCache(cacheKey, transformed);

	return transformed;
}
