SELECT 
    u.*, 
    f.rowid,
    snippet(users_fts, 0, '<mark>', '</mark>', '', 64) AS name_snippet
FROM users_fts f
JOIN users u ON u.id = f.rowid
WHERE f.name MATCH :query
ORDER BY rank
LIMIT :limit;

