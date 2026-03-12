import { fetchList } from '$lib/hn';

/** @type {import('./$types').PageServerLoad} */
export const load = ({ params }) => fetchList(params.list, +params.page);
