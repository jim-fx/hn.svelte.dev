INSERT INTO users (name, created, karma, about, submitted, cached_at) VALUES (
  :name, :created, :karma, :about, :submitted, :cached_at
)
ON CONFLICT(name) DO UPDATE SET
  created     = excluded.created,
  karma       = excluded.karma,
  about       = excluded.about,
  submitted   = excluded.submitted,
  cached_at   = excluded.cached_at;
