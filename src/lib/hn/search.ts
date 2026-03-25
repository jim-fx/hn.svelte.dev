import { createLogger } from '$lib/logger';
import { getItem, setupDatabase, statements } from './db';
import type { Item } from './types';

const logger = createLogger('hn:search');

function escapeRegex(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createHighlightedTitle(title: string | undefined, query: string): string {
	if (!title) return '';
	const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
	return title.replace(regex, '<mark>$1</mark>');
}

export async function searchItems(query: string) {
	setupDatabase();
	const limit = 50;
	const type = 'story';
	let items: (Item | undefined)[];
	if (query.length < 3) {
		const rows = statements.searchItemLike.all({ query: `%${query}%`, limit, type });
		const ids = [...new Set(rows.map((row) => row['id'] as number))];
		logger.info('LIKE', { rows, query });
		items = ids.map((id) => getItem(id));
	} else {
		const rows = statements.searchItem.all({ query, limit, type });
		const ids = [...new Set(rows.map((row) => row['id'] as number))];
		logger.info('FTS', { rows, query });
		items = ids.map((id) => getItem(id));
	}

	const lowerQuery = query.toLowerCase();
	return items.map((item) => {
		if (!item) return item;
		return {
			...item,
			matchedTitle: item.title?.toLowerCase().includes(lowerQuery)
				? createHighlightedTitle(item.title, query)
				: item.title
		};
	});
}
