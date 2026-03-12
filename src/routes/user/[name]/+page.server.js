import { fetchUser } from '$lib/hn';

export const csr = false;

/** @type {import('./$types').PageServerLoad} */
export const load = ({ params }) => fetchUser(params.name);
