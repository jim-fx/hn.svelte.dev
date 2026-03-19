import { HNItemCache } from './hn-cache.js';
import { HNClient } from './hn-client.js';

export const cache = new HNItemCache('./data/hn.db');
export const client = new HNClient({ cache });

/**
 * @param {string} list
 * @param {number} page
 */
export async function fetchList(list, page) {
	const result = await client.getList(list, page);

	/** @type {any[]} */
	const items = result.items.map((item) => {
		const url = item.url ?? '';
		const domain = url ? new URL(url).hostname.replace(/^www\./, '') : undefined;
		const timeSeconds = item.time ?? 0;
		const timeAgo = timeAgoString(Date.now() / 1000 - timeSeconds);

		return {
			...item,
			id: String(item.id),
			time_ago: timeAgo,
			points: item.score ?? 0,
			user: item.by ?? '',
			comments_count: item.descendants ?? 0,
			domain
		};
	});

	return { list, items, page: result.page, perPage: result.perPage, total: result.total };
}

/**
 * @param {number} seconds
 */
function timeAgoString(seconds) {
	if (seconds < 60) return `${Math.floor(seconds)} seconds ago`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
	if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
	if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
	return `${Math.floor(seconds / 2592000)} months ago`;
}

/**
 * @typedef {Object} TransformedComment
 * @property {string} id
 * @property {string} user
 * @property {string} time_ago
 * @property {string} content
 * @property {TransformedComment[]} comments
 */

/**
 * @param {any[]} comments
 * @returns {TransformedComment[]}
 */
function transformComments(comments) {
	return comments.map((c) => ({
		id: String(c.id),
		user: c.by ?? '',
		time_ago: timeAgoString(Date.now() / 1000 - (c.time ?? 0)),
		content: c.text ?? '',
		comments: transformComments(c.replies ?? [])
	}));
}

/**
 * @param {string|number} id
 */
export async function fetchItem(id) {
	const { post, comments } = await client.getCommentsTree(id);

	const url = post.url ?? '';
	const domain = url ? new URL(url).hostname.replace(/^www\./, '') : undefined;
	const timeSeconds = post.time ?? 0;
	const timeAgo = timeAgoString(Date.now() / 1000 - timeSeconds);

	return {
		...post,
		id: String(post.id),
		title: post.title ?? '',
		url,
		domain,
		points: post.score ?? 0,
		user: post.by ?? '',
		time_ago: timeAgo,
		content: post.text ?? '',
		comments: transformComments(comments)
	};
}

/**
 * @param {string} name
 */
export async function fetchUser(name) {
	const user = await client.getUser(name);
	return {
		...user,
		created_ago: timeAgoString(Date.now() / 1000 - user.created)
	};
}
