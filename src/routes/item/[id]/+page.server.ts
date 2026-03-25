import * as hn from '$lib/hn';

export async function load({ params, setHeaders, depends }) {

	const id = params.id;

	// Cache item page for 5 minutes (items don't change often)
	// Allow stale-while-revalidate for longer at edge
	setHeaders({
		'cache-control': 'public, max-age=300, stale-while-revalidate=300',
		'cdn-cache-control': 'public, max-age=300, stale-while-revalidate=3600',
		'cache-tag': `hn-item-${id}`,
		'surrogate-control': 'public, max-age=600'
	});

	// Track dependency for cache invalidation
	depends(`hn:item:${id}`);

	return await hn.fetchItemWithComments(+id);
}
