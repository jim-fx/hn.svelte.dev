import { fetchList } from '$lib/hn';

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
 * Pre-warm the cache for the top list
 * Runs asynchronously without blocking the request
 */
async function warmTopListCache() {
	try {
		// Fetch top list to populate cache
		// This will be cached in the server-side cache
		await fetchList('top', 1);
	} catch (error) {
		// Silently fail - cache warming should not affect the user experience
		console.error('Cache warming failed:', error);
	}
}

// Start cache warmer when the server starts
startCacheWarmer();
