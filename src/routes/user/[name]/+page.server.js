import { fetchUser } from '$lib/hn';

export const csr = false;

/** @type {import('./$types').PageServerLoad} */
export async function load({ params, setHeaders, depends }) {
	const name = params.name;

	// Cache user page for 10 minutes
	setHeaders({
		'cache-control': 'public, max-age=600, stale-while-revalidate=60'
	});

	// Track dependency for cache invalidation
	depends(`hn:user:${name}`);

	return fetchUser(name);
}
