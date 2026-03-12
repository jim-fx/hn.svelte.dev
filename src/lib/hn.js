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
	return n;
}

/**
 * Transform Firebase API response to match frontend expectations
 * @param {any} item
 * @returns {any}
 */
function transformItem(item) {
	if (!item) return null;

	const domain = item.url ? new URL(item.url).hostname.replace('www.', '') : undefined;

	const timeDiff = Date.now() / 1000 - item.time;
	const minutes = Math.floor(timeDiff / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	let time_ago;
	if (days > 0) time_ago = `${plural(days)} day${days > 1 ? 's' : ''} ago`;
	else if (hours > 0) time_ago = `${plural(hours)} hour${hours > 1 ? 's' : ''} ago`;
	else if (minutes > 0) time_ago = `${plural(minutes)} minute${minutes > 1 ? 's' : ''} ago`;
	else time_ago = 'just now';

	return {
		...item,
		domain,
		user: item.by,
		points: item.score ?? 0,
		comments_count: item.descendants ?? 0,
		time_ago,
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

	const timeDiff = Date.now() / 1000 - comment.time;
	const minutes = Math.floor(timeDiff / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	let time_ago;
	if (days > 0) time_ago = `${days} day${days > 1 ? 's' : ''} ago`;
	else if (hours > 0) time_ago = `${hours} hour${hours > 1 ? 's' : ''} ago`;
	else if (minutes > 0) time_ago = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
	else time_ago = 'just now';

	return {
		...comment,
		user: comment.by,
		time_ago,
		content: comment.text ? `<p>${comment.text}</p>` : ''
	};
}

/**
 * @param {number[]} ids
 * @param {typeof fetch} fetch
 * @returns {Promise<any[]>}
 */
export async function fetchItems(ids, fetch) {
	if (!ids?.length) return [];
	const promises = ids
		.slice(0, PAGE_SIZE)
		.map((id) => fetch(`${BASE_URL}/item/${id}.json`).then((r) => r.json()));
	const items = await Promise.all(promises);
	return items.map(transformItem);
}

/**
 * @param {number[]} ids
 * @param {typeof fetch} fetch
 * @returns {Promise<any[]>}
 */
export async function fetchComments(ids, fetch) {
	if (!ids?.length) return [];
	const promises = ids.map((id) => fetch(`${BASE_URL}/item/${id}.json`).then((r) => r.json()));
	const comments = await Promise.all(promises);
	const transformed = comments.map(transformComment);

	// Recursively fetch children
	for (const comment of transformed) {
		if (comment?.kids?.length) {
			comment.comments = await fetchComments(comment.kids, fetch);
		} else {
			comment.comments = [];
		}
	}

	return transformed;
}

/**
 * @param {string} list
 * @param {number} page
 * @param {typeof fetch} fetch
 * @returns {Promise<{list: string, page: number, items: any[]}>}
 */
export async function fetchList(list, page, fetch) {
	const listName = listMap[list] || 'topstories';

	const ids = await fetch(`${BASE_URL}/${listName}.json`).then((r) => r.json());
	const start = (page - 1) * PAGE_SIZE;
	const pageIds = ids.slice(start, start + PAGE_SIZE);
	const items = await fetchItems(pageIds, fetch);

	return { list, page, items };
}

/**
 * @param {string|number} id
 * @param {typeof fetch} fetch
 * @returns {Promise<any>}
 */
export async function fetchItem(id, fetch) {
	const item = await fetch(`${BASE_URL}/item/${id}.json`).then((r) => r.json());
	const transformed = transformItem(item);

	// Fetch comments if there are kids
	if (transformed?.kids?.length) {
		transformed.comments = await fetchComments(transformed.kids, fetch);
	} else {
		transformed.comments = [];
	}

	return transformed;
}

/**
 * @param {string} name
 * @param {typeof fetch} fetch
 * @returns {Promise<any>}
 */
export async function fetchUser(name, fetch) {
	return fetch(`${BASE_URL}/user/${name}.json`).then((r) => r.json());
}
