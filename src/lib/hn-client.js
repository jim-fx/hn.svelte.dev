/**
 * @fileoverview Hacker News API client with pluggable item cache.
 * @see https://github.com/HackerNews/API
 */

const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';

// ---------------------------------------------------------------------------
// Cache interface
// ---------------------------------------------------------------------------

/**
 * A generic item cache interface keyed by numeric HN item IDs.
 * Implement this to plug in any caching backend.
 *
 * The built-in implementation is {@link HNItemCache} in `hn-cache.js`.
 * A plain `Map` also satisfies this interface for in-memory caching.
 *
 * @interface ItemCache
 */

/**
 * Returns the cached {@link HNItem} for `id`, or `undefined` if not present.
 *
 * @function
 * @name ItemCache#get
 * @param {number} id
 * @returns {HNItem | undefined}
 */

/**
 * Stores `item` under `id`.
 *
 * @function
 * @name ItemCache#set
 * @param {number} id
 * @param {HNItem} item
 * @returns {void}
 */

/**
 * Removes the entry for `id`. Returns `true` if an entry existed.
 * May be a no-op for persistent caches.
 *
 * @function
 * @name ItemCache#delete
 * @param {number} id
 * @returns {boolean}
 */

/**
 * Removes all cached entries.
 * May be a no-op for persistent caches.
 *
 * @function
 * @name ItemCache#clear
 * @returns {void}
 */

// ---------------------------------------------------------------------------
// Built-in no-op cache
// ---------------------------------------------------------------------------

/**
 * A no-op cache that never stores anything. Used as the default when no cache
 * is provided.
 *
 * @implements {ItemCache}
 */
class NoopCache {
	/** @param {number} _id @returns {undefined} */
	get(_id) {
		return undefined;
	}
	/** @param {number} _id @param {HNItem} _item @returns {void} */
	set(_id, _item) {}
	/** @param {number} _id @returns {false} */
	delete(_id) {
		return false;
	}
	/** @returns {void} */
	clear() {}
}

// ---------------------------------------------------------------------------
// HN data types
// ---------------------------------------------------------------------------

/**
 * @typedef {"story" | "comment" | "job" | "poll" | "pollopt"} ItemType
 */

/**
 * A Hacker News item (story, comment, job, poll, or pollopt).
 *
 * @typedef {Object} HNItem
 * @property {number}    id            - The item's unique id.
 * @property {ItemType}  type          - The type of the item.
 * @property {string}    [by]          - Username of the author.
 * @property {number}    [time]        - Creation time in Unix seconds.
 * @property {string}    [text]        - HTML text body (comments, polls, etc.).
 * @property {boolean}   [dead]        - `true` if the item is dead.
 * @property {number}    [parent]      - Parent item ID (comments).
 * @property {number}    [poll]        - Associated poll ID (pollopts).
 * @property {number[]}  [kids]        - Ranked IDs of direct child comments.
 * @property {string}    [url]         - URL for story items.
 * @property {number}    [score]       - Upvote score.
 * @property {string}    [title]       - Title (stories, polls, jobs).
 * @property {number[]}  [parts]       - Related pollopt IDs (polls).
 * @property {number}    [descendants] - Total comment count (stories/polls).
 * @property {boolean}   [deleted]     - `true` if the item is deleted.
 */

/**
 * A post with its resolved top-level comments.
 *
 * @typedef {Object} PostWithComments
 * @property {HNItem}   post     - The story item.
 * @property {HNItem[]} comments - Resolved direct child comments, excluding
 *                                 dead and deleted items.
 */

// ---------------------------------------------------------------------------
// Client options
// ---------------------------------------------------------------------------

/**
 * Options accepted by {@link HNClient}.
 *
 * @typedef {Object} HNClientOptions
 * @property {ItemCache} [cache]
 *   An item cache keyed by numeric HN IDs.
 *   Pass an {@link HNItemCache} (from `hn-cache.js`) for SQLite persistence,
 *   a `Map` for in-memory caching, or omit for no caching.
 * @property {number} [maxConcurrent=10]
 *   Maximum simultaneous in-flight requests for batch fetches.
 * @property {number} [recentPostsCount=30]
 *   Number of posts returned by {@link HNClient#getRecentPosts} (max 500).
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Runs `tasks` (thunks returning Promises) with at most `limit` concurrent
 * executions and returns their settled results in the original order.
 * Failed tasks resolve to `null`.
 *
 * @template T
 * @param {Array<() => Promise<T>>} tasks
 * @param {number} limit
 * @returns {Promise<Array<T | null>>}
 */
async function pLimit(tasks, limit) {
	const results = new Array(tasks.length).fill(null);
	let nextIndex = 0;

	async function worker() {
		while (nextIndex < tasks.length) {
			const i = nextIndex++;
			try {
				results[i] = await tasks[i]();
			} catch {
				results[i] = null;
			}
		}
	}

	await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
	return results;
}

// ---------------------------------------------------------------------------
// HNClient
// ---------------------------------------------------------------------------

/**
 * A lightweight Hacker News API client with optional pluggable item caching.
 *
 * Items are cached by their numeric ID. When using {@link HNItemCache} the
 * cache is a persistent SQLite database that survives process restarts.
 *
 * @example
 * // No caching
 * const client = new HNClient();
 *
 * @example
 * // Persistent SQLite cache
 * import { HNItemCache } from './hn-cache.js';
 * const client = new HNClient({ cache: new HNItemCache('./data/hn.db') });
 *
 * @example
 * // Lightweight in-memory Map cache
 * const client = new HNClient({ cache: new Map() });
 *
 * @example
 * // Fetch recent front-page posts
 * const posts = await client.getRecentPosts();
 * console.log(posts[0].title);
 *
 * @example
 * // Fetch a single post with its top-level comments
 * const { post, comments } = await client.getCommentsForPost(8863);
 * console.log(`"${post.title}" — ${comments.length} comments`);
 */
class HNClient {
	/**
	 * @param {HNClientOptions} [options={}]
	 */
	constructor(options = {}) {
		const { cache, maxConcurrent = 10, recentPostsCount = 30 } = options;

		/**
		 * Underlying item cache.
		 * @type {ItemCache}
		 * @private
		 */
		this._cache = cache ?? new NoopCache();

		/**
		 * Max simultaneous fetch requests for batch operations.
		 * @type {number}
		 * @private
		 */
		this._maxConcurrent = maxConcurrent;

		/**
		 * Number of posts to return from {@link HNClient#getRecentPosts}.
		 * @type {number}
		 * @private
		 */
		this._recentPostsCount = Math.min(recentPostsCount, 500);
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	/**
	 * Fetches a single item from the HN API and upserts it into the cache.
	 * Returns the cached value immediately if one exists.
	 *
	 * @private
	 * @param {number} id
	 * @returns {Promise<HNItem>}
	 * @throws {Error} If the network request fails.
	 */
	async _fetchItem(id) {
		const cached = this._cache.get(id);
		if (cached !== undefined) return cached;

		const url = `${HN_BASE_URL}/item/${id}.json`;
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`HN API error ${response.status} ${response.statusText} — ${url}`);
		}

		/** @type {HNItem} */
		const item = await response.json();
		this._cache.set(id, item);
		return item;
	}

	/**
	 * Fetches multiple items concurrently up to `_maxConcurrent` at a time.
	 * Items that fail to load are returned as `null`.
	 *
	 * @private
	 * @param {number[]} ids
	 * @returns {Promise<Array<HNItem | null>>}
	 */
	async _fetchItems(ids) {
		return pLimit(
			ids.map((id) => () => this._fetchItem(id)),
			this._maxConcurrent
		);
	}

	/**
	 * Fetches a raw JSON resource from the HN API (for non-item endpoints such
	 * as `/topstories.json`). These responses are not cached.
	 *
	 * @private
	 * @param {string} path  Path relative to the v0 base URL.
	 * @returns {Promise<any>}
	 * @throws {Error} If the network request fails.
	 */
	async _fetchRaw(path) {
		const url = `${HN_BASE_URL}${path}`;
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`HN API error ${response.status} ${response.statusText} — ${url}`);
		}

		return response.json();
	}

	// -------------------------------------------------------------------------
	// Public API
	// -------------------------------------------------------------------------

	/**
	 * Fetches the story IDs for a given list type.
	 *
	 * @private
	 * @param {string} list
	 * @returns {Promise<number[]>}
	 */
	async _fetchListIds(list) {
		const path = `/${list}stories.json`;
		return this._fetchRaw(path);
	}

	/**
	 * Returns the `n` most recent top stories (including jobs) from Hacker News,
	 * where `n` is controlled by the `recentPostsCount` option (default: 30,
	 * max: 500).
	 *
	 * Stories are returned in ranked front-page order.
	 * Dead and deleted items are silently excluded.
	 *
	 * @returns {Promise<HNItem[]>}
	 *
	 * @example
	 * const posts = await client.getRecentPosts();
	 * posts.forEach(p => console.log(p.score, p.title));
	 */
	async getRecentPosts() {
		/** @type {number[]} */
		const ids = await this._fetchRaw('/topstories.json');
		const topIds = ids.slice(0, this._recentPostsCount);
		const items = await this._fetchItems(topIds);

		return items.filter(
			/** @returns {item is HNItem} */
			(item) => item !== null && !item.dead && !item.deleted
		);
	}

	/**
	 * Returns stories for a given list (top, new, best, ask, show, jobs).
	 *
	 * @param {string} list
	 * @param {number} page  1-indexed page number.
	 * @param {number} [perPage=30]
	 * @returns {Promise<{ items: HNItem[], page: number, perPage: number, total: number }>}
	 */
	async getList(list, page = 1, perPage = 30) {
		const start = (page - 1) * perPage;
		const end = start + perPage;

		/** @type {number[]} */
		const allIds = await this._fetchListIds(list);
		const pageIds = allIds.slice(start, end);
		const items = await this._fetchItems(pageIds);

		const filtered = items.filter(
			/** @returns {item is HNItem} */
			(item) => item !== null && !item.dead && !item.deleted
		);

		return {
			items: filtered,
			page,
			perPage,
			total: allIds.length
		};
	}

	/**
	 * Returns a single Hacker News item by ID.
	 *
	 * @param {string|number} postId  The numeric item ID.
	 * @returns {Promise<HNItem>}
	 * @throws {Error} If the network request fails.
	 *
	 * @example
	 * const post = await client.getPost(8863);
	 * console.log(post.title, post.url);
	 */
	async getPost(postId) {
		return this._fetchItem(+postId);
	}

	/**
	 * A Hacker News user.
	 *
	 * @typedef {Object} HNUser
	 * @property {string}   id        - The user's unique username.
	 * @property {number}   created   - Creation time in Unix seconds.
	 * @property {number}   karma     - Karma score.
	 * @property {string}   [about]   - HTML bio.
	 * @property {number[]} [submitted] - IDs of submitted items.
	 */

	/**
	 * Returns a Hacker News user by username.
	 *
	 * @param {string} username
	 * @returns {Promise<HNUser>}
	 * @throws {Error} If the network request fails or the user doesn't exist.
	 */
	async getUser(username) {
		const url = `${HN_BASE_URL}/user/${username}.json`;
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`HN API error ${response.status} ${response.statusText} — ${url}`);
		}

		/** @type {HNUser} */
		const user = await response.json();
		return user;
	}

	/**
	 * Returns a post together with its resolved top-level comments.
	 *
	 * Only **direct** children of the post are fetched; nested replies are not
	 * traversed. Dead and deleted comments are excluded from the result.
	 *
	 * @param {string|number} postId  The numeric item ID of the post.
	 * @returns {Promise<PostWithComments>}
	 * @throws {Error} If the post itself cannot be loaded.
	 *
	 * @example
	 * const { post, comments } = await client.getCommentsForPost(8863);
	 * console.log(`"${post.title}" — ${comments.length} top-level comments`);
	 * comments.forEach(c => console.log(c.by, c.text));
	 */
	async getCommentsForPost(postId) {
		const post = await this._fetchItem(+postId);
		const kidIds = post.kids ?? [];

		const rawComments = kidIds.length ? await this._fetchItems(kidIds) : [];

		const comments = rawComments.filter(
			/** @returns {c is HNItem} */
			(c) => c !== null && !c.dead && !c.deleted
		);

		return { post, comments };
	}

	/**
	 * Recursively fetches nested comment replies.
	 *
	 * @private
	 * @param {HNItem} item
	 * @returns {Promise<HNItem[]>}
	 */
	async _fetchCommentReplies(item) {
		const kidIds = item.kids ?? [];
		if (!kidIds.length) return [];

		const rawReplies = await this._fetchItems(kidIds);
		const replies = /** @type {HNItem[]} */ (
			rawReplies.filter(
				/** @returns {r is HNItem} */
				(r) => r !== null && !r.dead && !r.deleted
			)
		);

		const withReplies = await Promise.all(
			replies.map(async (reply) => {
				const nestedReplies = await this._fetchCommentReplies(reply);
				return { ...reply, replies: nestedReplies };
			})
		);

		return withReplies;
	}

	/**
	 * Returns a post with fully nested comment trees.
	 *
	 * @param {string|number} postId
	 * @returns {Promise<{ post: HNItem, comments: HNItem[] }>}
	 */
	async getCommentsTree(postId) {
		const post = await this._fetchItem(+postId);
		const kidIds = post.kids ?? [];

		const rawComments = kidIds.length ? await this._fetchItems(kidIds) : [];

		const comments = await Promise.all(
			rawComments
				.filter((c) => c !== null && !c.dead && !c.deleted)
				.map(async (comment) => {
					const c = /** @type {HNItem} */ (comment);
					const replies = await this._fetchCommentReplies(c);
					return { ...c, replies };
				})
		);

		return { post, comments };
	}
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { HNClient, NoopCache };
export default HNClient;
