SELECT id, text as body_snippet FROM items WHERE type = 'story' AND text LIKE :query LIMIT :limit;
