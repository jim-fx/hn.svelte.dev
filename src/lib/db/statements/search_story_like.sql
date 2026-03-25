SELECT id FROM items WHERE type = 'story' AND title LIKE :query LIMIT :limit;
