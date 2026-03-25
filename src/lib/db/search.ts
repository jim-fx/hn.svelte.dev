import { createLogger } from '$lib/logger';
import { getItem, getUser } from '$lib/db';
import type { Item, User } from '$lib/hn/types';
import statements from './statements';
import { db } from './db';

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

function createSnippet(text: string, query: string, context: number = 30): string {
	const lowerText = text.toLowerCase();
	const lowerQuery = query.toLowerCase();
	const matchIndex = lowerText.indexOf(lowerQuery);
	if (matchIndex === -1) return text;

	const start = Math.max(0, matchIndex - context);
	const end = Math.min(text.length, matchIndex + query.length + context);

	let snippet = text.slice(start, end);
	if (start > 0) snippet = '...' + snippet;
	if (end < text.length) snippet = snippet + '...';

	return snippet;
}

type SearchItemRow = {
	id: number;
	body_snippet: string;
};
export async function searchItems(query: string, searchInBody: boolean = false) {
	const limit = 50;
	let items: (Item | undefined)[];
	let bodySnippets: Record<number, string> = {};
	const useFTS = query.length >= 3;
	const searchSql = useFTS
		? searchInBody
			? statements.search_story_body
			: statements.search_story
		: searchInBody
			? statements.search_story_body_like
			: statements.search_story_like;
	const rows = db
		.run<SearchItemRow>(searchSql)
		.all({ query: useFTS ? query : `%${query}%`, limit });
	const ids = [...new Set(rows.map((row) => row.id))];
	logger.info('LIKE', { ids, query, searchInBody });
	items = ids.map((id) => getItem(id));
	rows.forEach((row) => {
		bodySnippets[row.id] = row.body_snippet;
	});
	const lowerQuery = query.toLowerCase();
	const results: Item[] = [];
	for (const item of items) {
		if (!item) continue;
		const matchedTitle = item.title?.toLowerCase().includes(lowerQuery)
			? createHighlightedTitle(item.title, query)
			: item.title;
		let matchedBody = bodySnippets[item.id] ? bodySnippets[item.id] : undefined;
		if (matchedBody) {
			if (!useFTS) {
				matchedBody = createSnippet(matchedBody, query);
			}
			matchedBody = createHighlightedBody(matchedBody, query);
		}
		results.push({
			...item,
			matchedTitle,
			matchedBody
		});
	}
	return results;
}

type SearchUserRow = {
	id: string;
	about_snippet: string;
};

export async function searchUsers(query: string, searchInAbout: boolean = false): Promise<User[]> {
	const limit = 50;
	let users: User[];
	let aboutSnippets: Record<string, string> = {};

	const useFts = query.length >= 3;
	const searchQuery = useFts
		? searchInAbout
			? statements.search_user_about
			: statements.search_user
		: searchInAbout
			? statements.search_user_about_like
			: statements.search_user_like;

	const rows = db
		.run<SearchUserRow>(searchQuery)
		.all({ query: useFts ? query : `%${query}%`, limit });
	const ids = [...new Set(rows.map((row) => row.id))];
	logger.info('LIKE user about', { ids, query });
	users = ids.map((id) => getUser(id)).filter((u): u is User => u !== undefined);
	rows.forEach((row) => {
		aboutSnippets[row.id] = row.about_snippet;
	});

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
	const limit = 50;
	let items: (Item | undefined)[];
	const searchSql = query.length < 3 ? statements.search_comment_like : statements.search_comment;
	const rows = db.run(searchSql).all({ query: `%${query}%`, limit });
	const ids = [...new Set(rows.map((row) => row['id'] as number))];
	logger.info('LIKE comment', { ids, query });
	items = ids.map((id) => getItem(id));
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
