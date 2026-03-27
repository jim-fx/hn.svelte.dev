import * as db from '$lib/db';
import type { Item, User } from '$lib/hn';

type StoryResult = { type: 'story'; items: Item[] };
type UserResult = { type: 'user'; items: User[] };
type CommentResult = { type: 'comment'; items: Item[] };
type SearchResult = (StoryResult | UserResult | CommentResult) & {
	query: string;
	searchInBody: boolean;
	searchInAbout: boolean;
};

export async function load({ url }: { url: URL }): Promise<SearchResult> {
	const query = url.searchParams.get('q') ?? '';
	const searchType = url.searchParams.get('type') ?? 'story';
	const searchInBody = url.searchParams.get('body') === '1';
	const searchInAbout = url.searchParams.get('about') === '1';

	if (!query) {
		if (searchType === 'user') {
			return { type: 'user', items: [], query, searchInBody, searchInAbout };
		}
		if (searchType === 'comment') {
			return { type: 'comment', items: [], query, searchInBody, searchInAbout };
		}
		return { type: 'story', items: [], query, searchInBody, searchInAbout };
	}

	if (searchType === 'user') {
		const users = await db.searchUsers(query, searchInAbout);
		return { type: 'user', items: users, query, searchInBody, searchInAbout };
	}

	if (searchType === 'comment') {
		const comments = await db.searchComments(query);
		return { type: 'comment', items: comments, query, searchInBody, searchInAbout };
	}

	const items = await db.searchItems(query, searchInBody);
	return { type: 'story', items, query, searchInBody, searchInAbout };
}
