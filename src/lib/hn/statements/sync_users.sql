INSERT OR REPLACE INTO search.users(id, about)
SELECT
    id,
    COALESCE(about, '')
FROM main.users;
