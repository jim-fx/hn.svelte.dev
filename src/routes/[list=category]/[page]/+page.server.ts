import * as hn from '$lib/hn';

export async function load({ params, setHeaders, depends }) {
	const list = params.list as hn.StoryType;
	const page = +params.page;

	// Cache for 60 seconds in browser, longer at Cloudflare edge
	// Allow stale-while-revalidate for 60 seconds (serve stale content while revalidating in background)
	setHeaders({
		'cache-control': 'public, max-age=60, stale-while-revalidate=60',
		// Cloudflare-specific: longer cache at edge, respects this over cache-control
		'cdn-cache-control': 'public, max-age=60, stale-while-revalidate=300',
		// Cache tag for manual purging via Cloudflare API
		'cache-tag': `hn-${list},hn-${list}-page-${page}`,
		// Intermediate proxy caches
		'surrogate-control': 'public, max-age=300'
	});

	// Track dependencies for cache invalidation
	// Using a custom key that includes the list and page
	depends(`hn:list:${list}:${page}`);

	return {
		list,
    ...(await hn.fetchList(list, page))
	};
}
