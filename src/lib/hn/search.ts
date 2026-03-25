import { createLogger } from '$lib/logger';
import { getItem, getUser, setupDatabase, statements } from './db';
import type { Item, User } from './types';

const logger = createLogger('hn:search');

function escapeRegex(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createHighlightedTitle(title: string | undefined, query: string): string {
	if (!title) return '';
	const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
	return title.replace(regex, '<mark>$1</mark>');
}

function createHighlightedBody(text: string | undefined, query: string): string {
	if (!text) return '';
	const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
	return text.replace(regex, '<mark>$1</mark>');
}

export async function searchItems(query: string, searchInBody: boolean = false) {
	setupDatabase();
	const limit = 50;
	let items: (Item | undefined)[];
	let bodySnippets: Record<number, string> = {};

	if (searchInBody) {
		if (query.length < 3) {
			const rows = statements.searchStoryBodyLike.all({ query: `%${query}%`, limit }) as {
				id: number;
				body_snippet: string;
			}[];
			const ids = [...new Set(rows.map((row) => row.id))];
			logger.info('LIKE body', { ids, query });
			items = ids.map((id) => getItem(id));
			rows.forEach((row) => {
				bodySnippets[row.id] = row.body_snippet;
			});
		} else {
			const rows = statements.searchStoryBody.all({ query, limit }) as {
				id: number;
				body_snippet: string;
			}[];
			const ids = [...new Set(rows.map((row) => row.id))];
			logger.info('FTS body', { ids, query });
			items = ids.map((id) => getItem(id));
			rows.forEach((row) => {
				bodySnippets[row.id] = row.body_snippet;
			});
		}
	} else {
		if (query.length < 3) {
			const rows = statements.searchStoryLike.all({ query: `%${query}%`, limit });
			const ids = [...new Set(rows.map((row) => row['id'] as number))];
			logger.info('LIKE', { ids, query });
			items = ids.map((id) => getItem(id));
		} else {
			const rows = statements.searchStory.all({ query, limit });
			const ids = [...new Set(rows.map((row) => row['id'] as number))];
			logger.info('FTS', { ids, query });
			items = ids.map((id) => getItem(id));
		}
	}

	const lowerQuery = query.toLowerCase();
	const results: Item[] = [];
	for (const item of items) {
		if (!item) continue;
		const matchedTitle = item.title?.toLowerCase().includes(lowerQuery)
			? createHighlightedTitle(item.title, query)
			: item.title;
		const matchedBody = bodySnippets[item.id] ? bodySnippets[item.id] : undefined;
		results.push({
			...item,
			matchedTitle,
			matchedBody
		});
	}
	return results;
}

export async function searchUsers(query: string, searchInAbout: boolean = false): Promise<User[]> {
	setupDatabase();
	const limit = 50;
	let users: User[];
	let aboutSnippets: Record<string, string> = {};

	if (searchInAbout) {
		if (query.length < 3) {
			const rows = statements.searchUserAboutLike.all({ query: `%${query}%`, limit }) as {
				id: string;
				about_snippet: string;
			}[];
			const ids = [...new Set(rows.map((row) => row.id))];
			logger.info('LIKE user about', { ids, query });
			users = ids.map((id) => getUser(id)).filter((u): u is User => u !== undefined);
			rows.forEach((row) => {
				aboutSnippets[row.id] = row.about_snippet;
			});
		} else {
			const rows = statements.searchUserAbout.all({ query, limit }) as {
				id: string;
				about_snippet: string;
			}[];
			const ids = [...new Set(rows.map((row) => row.id))];
			logger.info('FTS user about', { ids, query });
			users = ids.map((id) => getUser(id)).filter((u): u is User => u !== undefined);
			rows.forEach((row) => {
				aboutSnippets[row.id] = row.about_snippet;
			});
		}
	} else {
		if (query.length < 3) {
			const rows = statements.searchUserLike.all({ query: `%${query}%`, limit }) as {
				id: string;
			}[];
			const ids = [...new Set(rows.map((row) => row.id))];
			logger.info('LIKE user', { ids, query });
			users = ids.map((id) => getUser(id)).filter((u): u is User => u !== undefined);
		} else {
			const rows = statements.searchUser.all({ query, limit }) as { id: string }[];
			const ids = [...new Set(rows.map((row) => row.id))];
			logger.info('FTS user', { ids, query });
			users = ids.map((id) => getUser(id)).filter((u): u is User => u !== undefined);
		}
	}

	const lowerQuery = query.toLowerCase();
	return users.map((user) => {
		const matchedId = user.id.toLowerCase().includes(lowerQuery)
			? user.id.replace(new RegExp(`(${escapeRegex(query)})`, 'gi'), '<mark>$1</mark>')
			: undefined;
		let matchedAbout = aboutSnippets[user.id];
		if (matchedAbout && query.length < 3) {
			matchedAbout = matchedAbout.replace(
				new RegExp(`(${escapeRegex(query)})`, 'gi'),
				'<mark>$1</mark>'
			);
		}
		return {
			...user,
			matchedId,
			matchedAbout
		};
	});
}

export async function searchComments(query: string): Promise<Item[]> {
	setupDatabase();
	const limit = 50;
	let items: (Item | undefined)[];

	if (query.length < 3) {
		const rows = statements.searchCommentLike.all({ query: `%${query}%`, limit });
		const ids = [...new Set(rows.map((row) => row['id'] as number))];
		logger.info('LIKE comment', { ids, query });
		items = ids.map((id) => getItem(id));
	} else {
		const rows = statements.searchComment.all({ query, limit });
		const ids = [...new Set(rows.map((row) => row['id'] as number))];
		logger.info('FTS comment', { ids, query });
		items = ids.map((id) => getItem(id));
	}

	const lowerQuery = query.toLowerCase();
	const results: Item[] = [];
	for (const item of items) {
		if (!item) continue;
		results.push({
			...item,
			matchedTitle: item.text?.toLowerCase().includes(lowerQuery)
				? createHighlightedBody(item.text, query)
				: item.text
		});
	}
	return results;
}
