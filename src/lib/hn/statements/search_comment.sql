SELECT id FROM search.items WHERE type = 'comment' AND (title MATCH :query OR body MATCH :query) ORDER BY rank LIMIT :limit;
