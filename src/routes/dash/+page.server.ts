import { getStatistics } from '$lib/db';
import { states } from '$lib/hn/queue';

export const csr = false;

export async function load() {
  const db = await getStatistics();
	return {...db, queue: states.slice(-40)};
}
