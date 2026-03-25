import { fetchItem, fetchItems } from "./item";
import * as db from "$lib/db"
import type { Comment } from "./types";
import { runConcurrently } from "./utils";

export async function fetchItemWithComments(postId:number) {
	const item = await fetchItem(postId) as Comment;
	const kidIds = item.kids ?? [];

	const comments = kidIds.length ? await fetchItems(kidIds) : [];

	item.comments = comments as Comment[];
	const missingIds:number[] = [];

	const stack = [...comments] as Comment[];
	while(stack.length){
		const item = stack.pop();
		if(item){
			item.comments = item.comments || [];
			for(const kidId of (item?.kids??[])){
				const child = db.getItem(kidId) as Comment;
				if (child){
					stack.push(child)
					item["comments"].push(child);
				}else{
					missingIds.push(kidId);
				}
			}
		}
	}

	runConcurrently(missingIds.map(id => () => fetchItem(id)), 5);

	return item;
}

export async function fetchItemsWithComments(ids:number[]):Promise<Comment[]>{
	return runConcurrently(ids.map((id) => () => fetchItemWithComments(id)), 5);
}
