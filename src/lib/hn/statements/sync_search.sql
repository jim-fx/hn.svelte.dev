INSERT INTO search.items(id, type, title, body, by)
SELECT
    id,
    type,
    COALESCE(title, ''),
    COALESCE(text,  ''),
    COALESCE(by,    '')
FROM main.items
WHERE deleted IS NOT 1;
