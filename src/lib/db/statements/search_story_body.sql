SELECT id, snippet(items, 3, '<mark>', '</mark>', '...', 30) as body_snippet FROM search.items WHERE type = 'story' AND body MATCH :query ORDER BY rank LIMIT :limit;
