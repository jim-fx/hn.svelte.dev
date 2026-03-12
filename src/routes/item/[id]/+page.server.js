import { fetchItem } from '$lib/hn';

/** @type {import('./$types').PageServerLoad} */
export const load = ({ params }) => fetchItem(params.id);
