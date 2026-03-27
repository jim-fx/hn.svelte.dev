WITH RECURSIVE item_tree AS (
  -- root item
  SELECT *
  FROM items
  WHERE id = :id

  UNION ALL

  -- all descendants
  SELECT i.*
  FROM items i
  JOIN item_tree t ON i.parent = t.id
)
SELECT *
FROM item_tree;
