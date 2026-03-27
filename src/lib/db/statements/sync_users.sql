INSERT OR REPLACE INTO search.users(id, about)
SELECT u.id, COALESCE(u.about, '')
FROM main.users u
WHERE NOT EXISTS (SELECT 1 FROM search.users s WHERE s.id = u.id);
