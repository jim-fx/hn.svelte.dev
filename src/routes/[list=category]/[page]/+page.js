import { fetchList } from '$lib/hn';

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	return fetchList(params.list, +params.page, fetch);
}
