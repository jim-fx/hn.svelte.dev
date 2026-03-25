SELECT id, about as about_snippet FROM users WHERE about LIKE :query LIMIT :limit;
