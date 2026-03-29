ALTER TABLE items
   ADD COLUMN first_cached_at INTEGER;
UPDATE items SET first_cached_at = cached_at WHERE first_cached_at = null;

ALTER TABLE users
   ADD COLUMN first_cached_at INTEGER;
UPDATE users SET first_cached_at = cached_at WHERE first_cached_at = null;
