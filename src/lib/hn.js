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
	return items.map(transformItem);
}

/**
 * @param {number[]} ids
 * @returns {Promise<any[]>}
 */
export async function fetchComments(ids) {
	if (!ids?.length) return [];
	const promises = ids.map((id) => fetch(`${BASE_URL}/item/${id}.json`).then((r) => r.json()));
	const comments = await Promise.all(promises);
	const transformed = comments.map(transformComment);

	// Recursively fetch children
	for (const comment of transformed) {
		if (comment?.kids?.length) {
			comment.comments = await fetchComments(comment.kids);
		} else {
			comment.comments = [];
		}
	}

	return transformed;
}

/**
 * @param {string} list
 * @param {number} page
 * @returns {Promise<{list: string, page: number, items: any[]}>}
 */
export async function fetchList(list, page) {
	const listName = listMap[list] || 'topstories';

	const ids = await fetch(`${BASE_URL}/${listName}.json`).then((r) => r.json());
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
	const item = await fetch(`${BASE_URL}/item/${id}.json`).then((r) => r.json());
	const transformed = transformItem(item);

	// Fetch comments if there are kids
	if (transformed?.kids?.length) {
		transformed.comments = await fetchComments(transformed.kids);
	} else {
		transformed.comments = [];
	}

	return transformed;
}

/**
 * @param {string} name
 * @returns {Promise<any>}
 */
export async function fetchUser(name) {
	const user = await fetch(`${BASE_URL}/user/${name}.json`).then((r) => r.json());
	return transformUser(user);
}
