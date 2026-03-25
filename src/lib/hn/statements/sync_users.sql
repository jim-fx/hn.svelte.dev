INSERT INTO search.users(id, about)
SELECT
    id,
    COALESCE(about, '')
FROM main.users;
