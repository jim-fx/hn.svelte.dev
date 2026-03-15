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

		// Sequential fetch of stories to reduce concurrent requests
		// This is more stable for Docker deployments
		for (const story of storiesToCache) {
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
		}

		console.log('Cache warming completed for top list and top 5 stories');
	} catch (error) {
		// Silently fail - cache warming should not affect the user experience
		console.error('Cache warming failed:', error);
	}
}
