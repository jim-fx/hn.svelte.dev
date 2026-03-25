SELECT id FROM items WHERE type = 'comment' AND (title LIKE :query OR text LIKE :query) LIMIT :limit;
