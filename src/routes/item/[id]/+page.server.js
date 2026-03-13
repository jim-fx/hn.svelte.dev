import { fetchItem } from '$lib/hn';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, setHeaders, depends }) {
	const id = params.id;

	// Cache item page for 5 minutes (items don't change often)
	setHeaders({
		'cache-control': 'public, max-age=300, stale-while-revalidate=30'
	});

	// Track dependency for cache invalidation
	depends(`hn:item:${id}`);

	return fetchItem(id);
}
