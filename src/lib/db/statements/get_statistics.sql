-- Total counts
SELECT 'total_items' as key, COUNT(*) as value FROM items
UNION ALL
SELECT 'total_users' as key, COUNT(*) as value FROM users;

-- Items by type
SELECT type, COUNT(*) as count FROM items GROUP BY type ORDER BY count DESC;

-- Items by hour
SELECT 
	CAST(strftime('%H', datetime(cached_at / 1000, 'unixepoch', 'localtime')) AS INTEGER) as hour,
	COUNT(*) as count
FROM items
GROUP BY hour
ORDER BY hour;

-- Score distribution
SELECT 
	CASE 
		WHEN score = 0 THEN '0'
		WHEN score = 1 THEN '1'
		WHEN score < 10 THEN '2-9'
		WHEN score < 50 THEN '10-49'
		WHEN score < 100 THEN '50-99'
		WHEN score < 500 THEN '100-499'
		WHEN score < 1000 THEN '500-999'
		ELSE '1000+'
	END as bucket,
	COUNT(*) as count
FROM items
WHERE score IS NOT NULL AND type = 'story'
GROUP BY bucket
ORDER BY 
	CASE bucket
		WHEN '0' THEN 1
		WHEN '1' THEN 2
		WHEN '2-9' THEN 3
		WHEN '10-49' THEN 4
		WHEN '50-99' THEN 5
		WHEN '100-499' THEN 6
		WHEN '500-999' THEN 7
		WHEN '1000+' THEN 8
	END;

-- Top users
SELECT id, karma FROM users ORDER BY karma DESC LIMIT 10;

-- Top stories
SELECT id, title, score, by FROM items WHERE type = 'story' AND score IS NOT NULL AND deleted != 1 AND dead != 1 ORDER BY score DESC LIMIT 10;

-- Top comments
SELECT id, parent, text, by, score FROM items WHERE type = 'comment' AND text IS NOT NULL AND deleted != 1 AND dead != 1 ORDER BY score DESC NULLS LAST LIMIT 10;

-- Raw cache stats
SELECT COUNT(*) as count, MIN(cached_at) as oldest, MAX(cached_at) as newest FROM raw_cache;

-- Search database stats (using try-catch in code)
SELECT COUNT(*) as count FROM items_fts;
SELECT COUNT(*) as count FROM users_fts;
SELECT type, COUNT(*) as count FROM search.items GROUP BY type ORDER BY count DESC;

-- FTS5 info
SELECT name, sql FROM search.sqlite_master WHERE type='table' AND sql LIKE 'CREATE VIRTUAL TABLE%';

-- Common tokens
SELECT term, cnt as count FROM search.items_tokens ORDER BY cnt DESC LIMIT 20;

-- Request stats combined
SELECT 
	(SELECT COUNT(*) FROM statistics.requests) as total_requests,
	(SELECT AVG(duration) FROM statistics.requests) as avg_duration,
	(SELECT MIN(duration) FROM statistics.requests) as min_duration,
	(SELECT MAX(duration) FROM statistics.requests) as max_duration,
	(SELECT duration FROM statistics.requests ORDER BY duration DESC LIMIT 1 OFFSET 5) as p95_duration;

SELECT status, COUNT(*) as count FROM statistics.requests GROUP BY status ORDER BY count DESC;

SELECT url, COUNT(*) as count, AVG(duration) as avg_duration FROM statistics.requests GROUP BY url ORDER BY count DESC LIMIT 10;

-- Query stats combined
SELECT 
	(SELECT COUNT(*) FROM statistics.queries) as total_queries,
	(SELECT AVG(duration) FROM statistics.queries) as avg_duration;

SELECT sql, duration FROM statistics.queries ORDER BY duration DESC LIMIT 10;

SELECT sql, COUNT(*) as count, AVG(duration) as duration FROM statistics.queries GROUP BY sql ORDER BY count DESC LIMIT 10;
