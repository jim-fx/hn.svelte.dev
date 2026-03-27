SELECT items.*, text as body_snippet FROM items
WHERE type = :type AND text LIKE :query LIMIT :limit;
