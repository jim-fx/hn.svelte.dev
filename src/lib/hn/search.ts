import { createLogger } from "$lib/logger";
import {  getItem, setupDatabase, statements } from "./db";

const logger = createLogger("hn:search");

export async function searchItems(query:string){
  setupDatabase();
  const limit = 50;
  const type = "story";
  if(query.length < 3) {
    const rows = statements.searchItemLike.all({query: `%${query}%`, limit, type })
    const ids = [...new Set(rows.map(row => row["id"] as number))];
    logger.info("LIKE",{rows, query})
    return ids.map(id => getItem(id));
  }else{
    const rows = statements.searchItem.all({query, limit, type})
    const ids = [...new Set(rows.map(row => row["id"] as number))];
    logger.info("FTS",{rows, query})
    return ids.map(id => getItem(id));
  }
}
