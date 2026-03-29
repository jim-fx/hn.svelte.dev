-- Change log table (one row per update event)
CREATE TABLE IF NOT EXISTS item_changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  fields TEXT NOT NULL,        -- JSON object of changed fields
  changed_at INTEGER NOT NULL,
  FOREIGN KEY (item_id) REFERENCES items(id)
);
CREATE INDEX IF NOT EXISTS idx_item_changes_item_id ON item_changes(item_id);
CREATE INDEX IF NOT EXISTS idx_item_changes_changed_at ON item_changes(changed_at);

-- Recreate trigger safely
DROP TRIGGER IF EXISTS item_changes_after_update;
CREATE TRIGGER item_changes_after_update
AFTER UPDATE ON items
FOR EACH ROW
BEGIN
  INSERT INTO item_changes (item_id, fields, changed_at)
  SELECT
    NEW.id,
    json_patch(
      '{}',
      json_object(
        'text', CASE WHEN OLD.text IS NOT NEW.text THEN NEW.text END,
        'dead', CASE WHEN OLD.dead IS NOT NEW.dead THEN NEW.dead END,
        'score', CASE WHEN OLD.score IS NOT NEW.score THEN NEW.score END,
        'title', CASE WHEN OLD.title IS NOT NEW.title THEN NEW.title END,
        'deleted', CASE WHEN OLD.deleted IS NOT NEW.deleted THEN NEW.deleted END,
        'top_position', CASE WHEN OLD.top_position IS NOT NEW.top_position THEN NEW.top_position END
      )
    ),
    strftime('%s','now')
  WHERE
    OLD.text IS NOT NEW.text OR
    OLD.dead IS NOT NEW.dead OR
    OLD.score IS NOT NEW.score OR
    OLD.title IS NOT NEW.title OR
    OLD.deleted IS NOT NEW.deleted OR
    OLD.top_position IS NOT NEW.top_position;
END;

-- Log initial insert
DROP TRIGGER IF EXISTS item_changes_after_insert;

CREATE TRIGGER item_changes_after_insert
AFTER INSERT ON items
FOR EACH ROW
BEGIN
  INSERT INTO item_changes (item_id, fields, changed_at)
  VALUES (
    NEW.id,
    json_object(
      'text', NEW.text,
      'dead', NEW.dead,
      'score', NEW.score,
      'title', NEW.title,
      'deleted', NEW.deleted,
      'top_position', NEW.top_position
    ),
    strftime('%s','now')
  );
END;
