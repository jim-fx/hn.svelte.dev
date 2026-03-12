import { fetchItem } from '$lib/hn';

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	return fetchItem(params.id, fetch);
}
