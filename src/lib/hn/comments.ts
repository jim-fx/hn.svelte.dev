import * as db from '$lib/db';
import { fetchItem, fetchItemInBackground } from './item';
import type { ItemWithComments } from './types';

function getMissingCommentIds(item:ItemWithComments){
  const existingIds = new Set<number>();
  const missingIds = new Set<number>();
  const stack = [item];
  while(stack.length){
    const i = stack.pop();
    if(!i) continue;
    existingIds.add(i.id);
    if(i.comments){
      for(const c of i.comments){
        existingIds.add(c.id)
      }
      stack.push(...i.comments);
    }
    if(i.kids) {
      for(const id of i.kids){
        if(!existingIds.has(id)){
          missingIds.add(id)
        }
      }
    }
  }
  return [...missingIds.values()];
}

async function fetchCommentsInbackground(item:ItemWithComments){
  const missingCommentIds = getMissingCommentIds(item);
  for(const id of missingCommentIds){
    fetchItemInBackground(id)
  }
}

export async function fetchItemWithComments(postId: number) {
	const item = await fetchItem(postId) as ItemWithComments;

  const itemWithComments = db.getItemWithComments(item.id);

  setTimeout(() => {
    if(itemWithComments) fetchCommentsInbackground(itemWithComments)
  }, 2000);

	return itemWithComments;
}

