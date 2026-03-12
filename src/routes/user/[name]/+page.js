import { fetchUser } from '$lib/hn';

export const csr = false;

/** @type {import('./$types').PageLoad} */
export async function load({ params, fetch }) {
	return fetchUser(params.name, fetch);
}
