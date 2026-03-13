import { fetchList, fetchItem } from '$lib/hn';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	// Run cache warming in the background (non-blocking)
	// This warms the cache for the /top/1 page
	if (event.url.pathname === '/top/1') {
		// Pre-warm the cache for the top list
		// This runs in the background without blocking the request
		warmTopListCache().catch(console.error);
	}

	return resolve(event);
}

// Periodic cache warming using setInterval
// Runs every 30 seconds to keep the top list cache fresh
let cacheWarmerStarted = false;

function startCacheWarmer() {
	if (cacheWarmerStarted) return;
	cacheWarmerStarted = true;

	// Run immediately on startup
	warmTopListCache().catch(console.error);

	// Then run every 30 seconds
	setInterval(() => {
		warmTopListCache().catch(console.error);
	}, 30000);
}

/**
 * Pre-warm the cache for the top list and its stories
 * Runs asynchronously without blocking the request
 */
async function warmTopListCache() {
	try {
		// Fetch top list to populate cache
		const result = await fetchList('top', 1);

		// Fetch and cache the top 5 stories (including their comments)
		// This ensures the most popular stories are pre-cached
		const storiesToCache = result.items.slice(0, 5);

		// Parallel fetch of stories to populate their cache
		await Promise.all(
			storiesToCache.map(async (story) => {
				if (story?.id) {
					try {
						// Fetch story with comments (recursively)
						// This will populate the cache for the story itself
						// and limit recursion depth in hn.js
						await fetchItem(story.id);
					} catch (err) {
						// Individual story cache warming can fail silently
						console.error(
							`Cache warming failed for story ${story.id}:`,
							err instanceof Error ? err.message : String(err)
						);
					}
				}
			})
		);

		console.log('Cache warming completed for top list and top 5 stories');
	} catch (error) {
		// Silently fail - cache warming should not affect the user experience
		console.error('Cache warming failed:', error);
	}
}

// Start cache warmer when the server starts
startCacheWarmer();
