INSERT INTO items (
  id, type, by, time, text, dead, parent, poll,
  url, score, title, descendants, deleted, kids, parts, cached_at
) VALUES (
  :id, :type, :by, :time, :text, :dead, :parent, :poll,
  :url, :score, :title, :descendants, :deleted, :kids, :parts, :cached_at
)
ON CONFLICT(id) DO UPDATE SET
  type        = excluded.type,
  by          = excluded.by,
  time        = excluded.time,
  text        = excluded.text,
  dead        = excluded.dead,
  parent      = excluded.parent,
  poll        = excluded.poll,
  url         = excluded.url,
  score       = excluded.score,
  title       = excluded.title,
  descendants = excluded.descendants,
  deleted     = excluded.deleted,
  kids        = excluded.kids,
  parts       = excluded.parts,
  cached_at   = excluded.cached_at;

 INSERT INTO search.items(items, id, title, body, by)
    VALUES ('delete', ?, ?, ?, ?);
