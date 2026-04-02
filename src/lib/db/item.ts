import type { Item, ItemWithComments } from '$lib/hn/types';
import type { SQLInputValue, SQLOutputValue } from 'node:sqlite';
import { db } from './db';

function serialize(item: Item): Record<string, SQLInputValue> {
	const result: Record<string, SQLInputValue> = {
		id: item.id,
		type: item.type ?? null,
		by: item.by ?? null,
		time: item.time ?? null,
		text: item.text ?? null,
		dead: item.dead ? 1 : 0,
		parent: item.parent ?? null,
		poll: 'poll' in item ? (item.poll as SQLInputValue) : null,
		url: item.url ?? null,
		score: item.score ?? null,
		title: item.title ?? null,
		descendants: item.descendants ?? null,
		deleted: item.deleted ? 1 : 0,
		kids: item.kids ? JSON.stringify(item.kids) : null,
		parts: item.parts ? JSON.stringify(item.parts) : null,
		cached_at: item.cached_at?.getTime() ?? Date.now(),
		first_cached_at: item.first_cached_at?.getTime() ?? Date.now()
	};

	if (item.top_position !== undefined && item.top_position !== null) {
		result.top_position = item.top_position;
	} else {
		result.top_position = -1;
	}

	return result;
}

function deserialize(row: Record<string, SQLOutputValue | undefined>) {
	const item: Record<string, unknown> = {
		id: row.id,
		type: row.type,
		cached_at: new Date(row.cached_at as number)
	};

	if (row.by != null) item.by = row.by;
	if (row.time != null) item.time = row.time;
	if (row.text != null) item.text = row.text;
	if (row.dead) item.dead = true;
	if (row.parent != null) item.parent = row.parent;
	if (row.poll != null) item.poll = row.poll;
	if (row.url != null) item.url = row.url;
	if (row.score != null) item.score = row.score;
	if (row.title != null) item.title = row.title;
	if (row.descendants != null) item.descendants = row.descendants;
	if (row.deleted) item.deleted = true;
	if (row.kids != null) item.kids = JSON.parse(row.kids as string);
	if (row.parts != null) item.parts = JSON.parse(row.parts as string);
	if (row.top_position != null) item.top_position = row.top_position as number;
	if (row.first_cached_at != null) item.first_cached_at = new Date(row.first_cached_at as number);

	return item as Item;
}
export function getItem(id: number) {
	return db.run('select_item', { deserialize }).get({ id });
}

export function upsertItem(item: Item) {
	if (!item) return;
	return db.run('upsert_item').run(serialize(item));
}

export function getItemWithComments(id: number) {
	const items = db.run('select_item_with_comments', { deserialize }).all({ id });

	if (!items || items.length === 0) return undefined;

	const map = new Map<number, Item & { comments?: Item[] }>();

	for (const item of items) map.set(item.id, item);

	let root: ItemWithComments | undefined;

	// attach children
	for (const item of items) {
		if (item.id === id) {
			root = item as ItemWithComments;
			continue;
		}

		if (item.parent != null) {
			const parent = map.get(item.parent);
			if (parent) {
				parent.comments ??= [];
				parent.comments.push(item);
			}
		}
	}

	return root;
}

export function getItemsWithComments(ids: number[]) {
	const rows = db.run('select_items_with_comments').all({ ids: JSON.stringify(ids) });

	const items = rows.map(deserialize);

	const byId = new Map<number, Item & { comments?: Item[] }>();
	const roots = new Map<number, ItemWithComments>();

	for (const item of items) {
		byId.set(item.id, item);
	}

	for (const item of items) {
		const row = rows.find((r) => r.id === item.id); // or include root_id in deserialise
		if (!row) continue;
		const rootId = row.root_id as number;

		if (item.id === rootId) {
			roots.set(rootId, item as ItemWithComments);
			continue;
		}

		if (item.parent != null) {
			const parent = byId.get(item.parent);
			if (parent) {
				parent.comments ??= [];
				parent.comments.push(item);
			}
		}
	}

	return ids.map((id) => roots.get(id)).filter(Boolean);
}

export function getItemChanges(id: number, limit = 10) {
	const rows = db.run('select_item_changes').all({ id, limit });

	return rows.map((row) => ({
		item_id: row.item_id as number,
		changed_at: new Date((row.changed_at as number) * 1000),
		fields: JSON.parse(row.fields as string)
	}));
}
