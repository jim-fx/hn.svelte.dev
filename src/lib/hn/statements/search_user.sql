SELECT id FROM search.users WHERE id MATCH :query ORDER BY rank LIMIT :limit;
