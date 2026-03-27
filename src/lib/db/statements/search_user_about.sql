SELECT 
    u.*, 
    f.rowid,
    snippet(users_fts, 0, '<mark>', '</mark>', '', 64) AS name_snippet,
    snippet(users_fts, 1, '<mark>', '</mark>', '...', 128) AS about_snippet
FROM users_fts f
JOIN users u ON u.id = f.rowid
WHERE users_fts MATCH '{name about} : ' || :query
ORDER BY rank
LIMIT :limit;
