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
	const promises = ids
		.slice(0, PAGE_SIZE)
		.map((id) => globalThis.fetch(`${BASE_URL}/item/${id}.json`).then((r) => r.json()));
	const items = await Promise.all(promises);
	console.log({items})
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

	const promises = ids.map(async (id) => {
		const cacheKey = `comment:${id}`;

		// Try to get comment from cache
		const cached = getFromCache(cacheKey);
		if (cached) {
			return cached;
		}

		try {
			const response = await fetch(`${BASE_URL}/item/${id}.json`);
			const comment = await response.json();
			const transformed = transformComment(comment);
			console.log({ transformed });

			// Recursively fetch children if depth allows
			if (transformed?.kids?.length && depth < maxDepth - 1) {
				transformed.comments = await fetchCommentsRecursive(transformed.kids, depth + 1, maxDepth);
			} else {
				transformed.comments = [];
			}

			// Cache the comment
			setCache(cacheKey, transformed);

			return transformed;
		} catch (error) {
			// Return null for failed fetches
			return null;
		}
	});

	const comments = await Promise.all(promises);
	return comments.filter(Boolean);
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
		setCache(cacheKey, ids);
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
