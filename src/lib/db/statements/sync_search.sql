INSERT INTO search.items(id, type, title, body, by)
SELECT i.id, i.type,
       COALESCE(i.title, ''),
       COALESCE(i.text,  ''),
       COALESCE(i.by,    '')
FROM main.items i
WHERE i.deleted IS NOT 1
  AND NOT EXISTS (SELECT 1 FROM search.items s WHERE s.id = i.id);

DELETE FROM search.items
WHERE id IN (
    SELECT s.id FROM search.items s
    WHERE NOT EXISTS (SELECT 1 FROM main.items i WHERE i.id = s.id)
       OR EXISTS (SELECT 1 FROM main.items i WHERE i.id = s.id AND i.deleted = 1)
);

DELETE FROM search.token_counts;
