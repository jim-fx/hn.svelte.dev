WITH RECURSIVE item_tree AS (
  -- roots
  SELECT i.*, i.id AS root_id
  FROM items i
  JOIN json_each(:ids) j ON i.id = j.value

  UNION ALL

  -- descendants inherit root_id
  SELECT i.*, t.root_id
  FROM items i
  JOIN item_tree t ON i.parent = t.id
)
SELECT *
FROM item_tree
WHERE dead IS NOT 1 AND deleted IS NOT 1
ORDER BY root_id, time;
