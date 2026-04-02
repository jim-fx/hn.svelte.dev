import * as hn from '$lib/hn';
import * as db from '$lib/db';

export async function load({ params, setHeaders }) {
	const id = params.id;

	setHeaders({
		'cache-control': 'public, max-age=300, stale-while-revalidate=300',
		'cdn-cache-control': 'public, max-age=300, stale-while-revalidate=3600',
		'cache-tag': `hn-item-${id}`,
		'surrogate-control': 'public, max-age=600'
	});

	const item = await hn.fetchItemWithComments(+id);
	const changes = db.getItemChanges(+id, 10);

	return { item, changes };
}
