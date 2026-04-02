SELECT item_id, fields, changed_at
FROM item_changes
WHERE item_id = :id
ORDER BY changed_at DESC
LIMIT :limit;
