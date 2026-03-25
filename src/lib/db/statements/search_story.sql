SELECT id FROM search.items WHERE type = 'story' AND title MATCH :query ORDER BY rank LIMIT :limit;
