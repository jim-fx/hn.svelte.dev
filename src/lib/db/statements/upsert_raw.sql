INSERT INTO raw_cache (
  path, 
  data, 
  cached_at
) VALUES (
  :path, 
  :data, 
  :cached_at
) ON CONFLICT(path) DO UPDATE SET 
  data = excluded.data, 
  cached_at = excluded.cached_at
