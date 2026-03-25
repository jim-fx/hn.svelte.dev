DELETE FROM search.items;
INSERT OR REPLACE INTO search.items(id, type, title, body, by)
SELECT
    id,
    type,
    COALESCE(title, ''),
    COALESCE(text,  ''),
    COALESCE(by,    '')
FROM main.items
WHERE deleted IS NOT 1;

DELETE FROM search.token_counts;
