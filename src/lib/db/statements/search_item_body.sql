SELECT 
    i.*, 
    f.rowid,
    snippet(items_fts, 0, '<mark>', '</mark>', '...', 64) AS title_snippet,
    snippet(items_fts, 1, '<mark>', '</mark>', '...', 30) AS text_snippet
FROM items_fts f
JOIN items i ON i.id = f.rowid
WHERE items_fts MATCH '{title text} : ' || :query
  AND i.type = :type
ORDER BY rank
LIMIT :limit;
