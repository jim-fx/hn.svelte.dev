ALTER TABLE items
   ADD COLUMN first_cached_at INTEGER;

ALTER TABLE users
   ADD COLUMN first_cached_at INTEGER;
