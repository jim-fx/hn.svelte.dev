SELECT 
    i.*, 
    f.rowid,
    snippet(items_fts, 0, '<mark>', '</mark>', '', 64) AS title_snippet
FROM items_fts f
JOIN items i ON i.id = f.rowid
WHERE f.title MATCH :query
  AND i.type = :type
ORDER BY rank
LIMIT :limit;
