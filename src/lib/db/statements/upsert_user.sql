INSERT INTO users (id, created, karma, about, submitted, cached_at) VALUES (
  :id, :created, :karma, :about, :submitted, :cached_at
)
ON CONFLICT(id) DO UPDATE SET
  created     = excluded.created,
  karma       = excluded.karma,
  about       = excluded.about,
  submitted   = excluded.submitted,
  cached_at   = excluded.cached_at;

DELETE FROM search.users WHERE id = :id;
INSERT INTO search.users(id, about)
VALUES (:id, COALESCE(:about, ''));

