SELECT id FROM search.items WHERE type = :type AND title MATCH :query ORDER BY rank LIMIT :limit;
