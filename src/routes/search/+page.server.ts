import * as db from '$lib/db';
import type { Item, User } from '$lib/hn';

type StoryResult = {
	type: 'story';
	results: Item[];
	durationSearchMs: number;
	durationHighlightMs: number;
};
type UserResult = {
	type: 'user';
	results: User[];
	durationSearchMs: number;
	durationHighlightMs: number;
};
type CommentResult = {
	type: 'comment';
	results: Item[];
	durationSearchMs: number;
	durationHighlightMs: number;
};
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
			return {
				type: 'user',
				results: [],
				query,
				searchInBody,
				searchInAbout,
				durationSearchMs: 0,
				durationHighlightMs: 0
			};
		}
		if (searchType === 'comment') {
			return {
				type: 'comment',
				results: [],
				query,
				searchInBody,
				searchInAbout,
				durationSearchMs: 0,
				durationHighlightMs: 0
			};
		}
		return {
			type: 'story',
			results: [],
			query,
			searchInBody,
			searchInAbout,
			durationSearchMs: 0,
			durationHighlightMs: 0
		};
	}

	if (searchType === 'user') {
		const users = await db.searchUsers(query, searchInAbout);
		return {
			type: 'user',
			query,
			searchInBody,
			searchInAbout,
      ...users,
		};
	}

	if (searchType === 'comment') {
		const comments = await db.searchComments(query);
		return {
			type: 'comment',
			query,
			searchInBody,
			searchInAbout,
      ...comments,
		};
	}

	const items = await db.searchItems(query, searchInBody);
	return {
		type: 'story',
		query,
		searchInBody,
		searchInAbout,
    ...items,
	};
}
