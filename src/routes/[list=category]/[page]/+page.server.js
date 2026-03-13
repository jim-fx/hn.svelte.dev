import { fetchList } from '$lib/hn';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, setHeaders, depends }) {
	const list = params.list;
	const page = +params.page;

	// Cache for 60 seconds in browser and CDN
	// Allow stale-while-revalidate for 10 seconds
	setHeaders({
		'cache-control': 'public, max-age=60, stale-while-revalidate=10'
	});

	// Track dependencies for cache invalidation
	// Using a custom key that includes the list and page
	depends(`hn:list:${list}:${page}`);

	return fetchList(list, page);
}
