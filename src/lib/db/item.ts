import type { Item, ItemWithComments } from '$lib/hn/types';
import type { SQLInputValue, SQLOutputValue } from 'node:sqlite';
import statements from './statements';
import { db } from './db';

function serialise(item: Item): Record<string, SQLInputValue> {
	return {
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
		cached_at: Date.now()
	};
}

function deserialise(row: Record<string, SQLOutputValue | undefined>) {
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

	return item as Item;
}
export function getItem(id: number) {
	const row = db.run(statements.select_item).get({ id });
	return row ? deserialise(row) : undefined;
}

export function storeItem(item: Item) {
	if (!item) return;
	return db.run(statements.upsert_item).run(serialise(item));
}

export function getItemWithComments(id: number) {
	const rows = db.run(statements.select_item_with_comments).all({ id });

	if (!rows || rows.length === 0) return undefined;

	const items = rows.map(deserialise);

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
