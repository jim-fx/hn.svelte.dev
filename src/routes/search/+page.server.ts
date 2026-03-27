import * as db from '$lib/db';
import type { Item, User } from '$lib/hn';

type StoryResult = {
	type: 'story';
	results: Item[];
	total: number;
	durationSearchMs: number;
};
type UserResult = {
	type: 'user';
	results: (User & {about_snippet?:string, name_snippet?:string})[];
	total: number;
	durationSearchMs: number;
};
type CommentResult = {
	type: 'comment';
	results: Item[];
	total: number;
	durationSearchMs: number;
};
type SearchResult = (StoryResult | UserResult | CommentResult) & {
	query: string;
	searchInBody: boolean;
};

export async function load({ url }: { url: URL }): Promise<SearchResult> {
	const query = url.searchParams.get('q') ?? '';
	const searchType = url.searchParams.get('type') ?? 'story';
	const searchInBody = url.searchParams.get('body') === '1';

	if (!query) {
		if (searchType === 'user') {
			return {
				type: 'user',
				results: [],
				query,
				searchInBody,
				total: 0,
				durationSearchMs: 0,
			};
		}
		if (searchType === 'comment') {
			return {
				type: 'comment',
				results: [],
				query,
				searchInBody,
				total: 0,
				durationSearchMs: 0,
			};
		}
		return {
			type: 'story',
			results: [],
			query,
			searchInBody,
			total: 0,
			durationSearchMs: 0,
		};
	}

	if (searchType === 'user') {
		const users = await db.searchUsers(query, searchInBody);
		return {
			type: 'user',
			query,
			searchInBody,
			...users
		};
	}

	if (searchType === 'comment') {
		const comments = await db.searchItems(query, true, "comment");
		return {
			type: 'comment',
			query,
			searchInBody,
			...comments
		};
	}

	const items = await db.searchItems(query, searchInBody);
	return {
		type: 'story',
		query,
		searchInBody,
		...items
	};
}
