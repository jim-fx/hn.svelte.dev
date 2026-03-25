SELECT id FROM search.items WHERE type = :type AND title MATCH :query LIMIT :limit;
