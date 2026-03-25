SELECT id, snippet(users, 1, '<mark>', '</mark>', '...', 50) as about_snippet FROM search.users WHERE about MATCH :query ORDER BY rank LIMIT :limit;
