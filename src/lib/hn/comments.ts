import { fetchItem, fetchItemInBackground, fetchItems } from './item';
import * as db from '$lib/db';
import type { ItemWithComments } from './types';

export async function fetchItemWithComments(postId: number) {
	const item = await fetchItem(postId) as ItemWithComments;

	const missingIds: number[] = [];
	const stack = [item] as ItemWithComments[];
	while (stack.length) {
		const item = stack.pop();
		if (item) {
			item.comments = item.comments || [];
			for (const kidId of item?.kids ?? []) {
				const child = db.getItem(kidId) as ItemWithComments;
				if (child) {
					stack.push(child);
					item['comments'].push(child);
				} else {
					missingIds.push(kidId);
				}
			}
		}
	}

  missingIds.map(async id => fetchItemInBackground(id))

	return item;
}

export async function fetchItemsWithComments(ids: number[]): Promise<ItemWithComments[]> {
  return Promise.all(ids.map((id) => fetchItemWithComments(id)));
}
