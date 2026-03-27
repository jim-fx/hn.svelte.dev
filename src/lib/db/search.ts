import { createLogger } from '$lib/logger';
import type { Item, User } from '$lib/hn/types';
import statements from './statements';
import { db } from './db';


const logger = createLogger('hn:search');

export async function searchItems(query: string, searchInBody: boolean = false, type: string = "story") {
    const limit = 50;
    const t0 = performance.now();

    const useFTS = query.length >= 3;
    const searchSql = useFTS
        ? searchInBody 
          ? statements.search_item_body 
          : statements.search_item
        : searchInBody 
          ? statements.search_item_body_like 
          : statements.search_item_like;

    const results = db
        .run<Item & { title_snippet?:string, body_snippet?: string }>(searchSql)
        .all({ query: useFTS ? query : `%${query}%`, limit, type });

    if(query.length < 3){
      const regex = new RegExp(`(${query})`, 'gi');
      for(const res of results){
        res.title_snippet = res.title?.replace(regex, '<mark>$1</mark>')
      }
    }

    const countResult = db
        .run<{ count: number }>('SELECT COUNT(*) as count FROM items_fts WHERE type = ?')
        .get(type);
    const total = countResult?.count ?? 0;

    const t2 = performance.now();

    logger.info("search results items", { durationMs: Math.floor(t2 - t0), count: results.length, type, query });

    return {
      results,
      total,
      durationSearchMs: t2 - t0,
    };
}

export async function searchUsers(query: string, searchInAbout: boolean = false) {
    const limit = 50;
    const t0 = performance.now();

    const useFts = query.length >= 3;
    const searchQuery = useFts
        ? (searchInAbout ? "search_user_about" : "search_user")
        : (searchInAbout ? "search_user_about_like" : "search_user_like");

    const results = db
        .run<User & { name_snippet?: string, about_snippet?: string }>(searchQuery)
        .all({
            query: useFts ? query : `%${query}%`,
            limit
        });

    if(query.length < 3){
      const regex = new RegExp(`(${query})`, 'gi');
      for(const res of results){
        res.name_snippet = res.name?.replace(regex, '<mark>$1</mark>')
        if(searchInAbout){
          res.about_snippet = res.about?.replace(regex, '<mark>$1</mark>')
        }
      }
    }

    const t1 = performance.now();

    const countResult = db
        .run<{ count: number }>('SELECT COUNT(*) as count FROM users')
        .get();

    const total = countResult?.count ?? 0;

    logger.info("search results user", {
        searchInAbout,
        durationMs: Math.floor(performance.now() - t0),
        count: results.length,
        query
    });

    return {
        results, // Now contains highlighted matchedAbout/matchedId directly from SQL
        total,
        durationSearchMs: t1 - t0
    };
}
