SELECT *
FROM items
WHERE type = :type 
  AND title LIKE '%' || :query || '%' 
LIMIT :limit;
