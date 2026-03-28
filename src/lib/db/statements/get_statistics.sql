SELECT json_object(
  -- Total counts
  'total_items', (SELECT COUNT(*) FROM items),
  'total_users', (SELECT COUNT(*) FROM users),

  -- Metadata
  'page_count', (SELECT page_count FROM pragma_page_count()),
  'page_size', (SELECT page_size FROM pragma_page_size()),
  'freelist_count', (SELECT freelist_count FROM pragma_freelist_count()),
  'user_version', (SELECT user_version FROM pragma_user_version()),

  -- Items by type
  'items_by_type', (
    SELECT json_group_array(
      json_object('type', type, 'count', cnt)
    )
    FROM (
      SELECT type, COUNT(*) AS cnt
      FROM items
      GROUP BY type
      ORDER BY cnt DESC
    )
  ),

  -- Items by hour
  'items_by_hour', (
    SELECT json_group_array(
      json_object('hour', hour, 'count', cnt)
    )
    FROM (
      SELECT 
        CAST(strftime('%H', datetime(cached_at / 1000, 'unixepoch', 'localtime')) AS INTEGER) AS hour,
        COUNT(*) AS cnt
      FROM items
      GROUP BY hour
      ORDER BY hour
    )
  ),


  -- Score distribution
  'score_distribution', (
    SELECT json_group_array(
      json_object('bucket', bucket, 'count', cnt)
    )
    FROM (
      SELECT 
        CASE 
          WHEN score = 0 THEN '0'
          WHEN score = 1 THEN '1'
          WHEN score = 2 THEN '2'
          WHEN score < 10 THEN '2-9'
          WHEN score < 20 THEN '10-19'
          WHEN score < 30 THEN '20-29'
          WHEN score < 50 THEN '30-49'
          WHEN score < 100 THEN '50-99'
          WHEN score < 500 THEN '100-499'
          WHEN score < 1000 THEN '500-999'
          ELSE '1000+'
        END AS bucket,
        COUNT(*) AS cnt
      FROM items
      WHERE score IS NOT NULL AND type = 'story'
      GROUP BY bucket
    )
  ),

  -- Top users
  'top_users', (
    SELECT json_group_array(
      json_object('name', name, 'karma', karma)
    )
    FROM (
      SELECT name, karma
      FROM users
      ORDER BY karma DESC
      LIMIT 10
    )
  ),

  -- Top stories
  'top_stories', (
    SELECT json_group_array(
      json_object('id', id, 'title', title, 'score', score, 'by', by)
    )
    FROM (
      SELECT id, title, score, by
      FROM items
      WHERE type='story' AND score IS NOT NULL AND deleted != 1 AND dead != 1
      ORDER BY score DESC
      LIMIT 10
    )
  ),

  -- Top comments
  'top_comments', (
    SELECT json_group_array(
      json_object('id', id, 'parent', parent, 'text', text, 'by', by, 'score', score)
    )
    FROM (
      SELECT id, parent, text, by, score
      FROM items
      WHERE type='comment' AND text IS NOT NULL AND deleted != 1 AND dead != 1
      ORDER BY score DESC
      LIMIT 10
    )
  ),

  -- Raw cache stats
  'raw_cache_stats', (
    SELECT json_object(
      'count', COUNT(*),
      'oldest', MIN(cached_at),
      'newest', MAX(cached_at)
    )
    FROM raw_cache
  ),

  -- FTS stats
  'fts', json_object(
    'items_count', (SELECT COUNT(*) FROM items_fts),
    'users_count', (SELECT COUNT(*) FROM users_fts)
  ),

  -- Items FTS breakdown
  'items_fts_by_type', (
    SELECT json_group_array(
      json_object('type', type, 'count', cnt)
    )
    FROM (
      SELECT type, COUNT(*) AS cnt
      FROM items_fts
      GROUP BY type
      ORDER BY cnt DESC
    )
  ),

  -- Common tokens
  'common_tokens', (
    SELECT json_group_array(
      json_object('term', term, 'count', cnt)
    )
    FROM (
      SELECT term, cnt
      FROM items_tokens
      ORDER BY cnt DESC
      LIMIT 20
    )
  ),

  -- Request stats
  'request_stats', (
    SELECT json_object(
      'total_requests', (SELECT COUNT(*) FROM statistics.requests),
      'avg_duration', (SELECT AVG(duration) FROM statistics.requests),
      'min_duration', (SELECT MIN(duration) FROM statistics.requests),
      'max_duration', (SELECT MAX(duration) FROM statistics.requests),
      'p95_duration', (
        SELECT duration
        FROM statistics.requests
        ORDER BY duration DESC
        LIMIT 1 OFFSET 5
      )
    )
  ),

  'request_status', (
    SELECT json_group_array(
      json_object('status', status, 'count', cnt)
    )
    FROM (
      SELECT status, COUNT(*) AS cnt
      FROM statistics.requests
      GROUP BY status
      ORDER BY cnt DESC
    )
  ),

  'request_urls', (
    SELECT json_group_array(
      json_object('url', url, 'count', cnt, 'avg_duration', avg_dur)
    )
    FROM (
      SELECT url, COUNT(*) AS cnt, AVG(duration) AS avg_dur
      FROM statistics.requests
      GROUP BY url
      ORDER BY cnt DESC
      LIMIT 10
    )
  ),

  -- Query stats
  'query_stats', json_object(
    'total_queries', (SELECT COUNT(*) FROM statistics.queries),
    'avg_duration', (SELECT AVG(duration) FROM statistics.queries)
  ),

  'slowest_queries', (
    SELECT json_group_array(
      json_object('sql', sql, 'duration', duration)
    )
    FROM (
      SELECT sql, duration
      FROM statistics.queries
      ORDER BY duration DESC
      LIMIT 10
    )
  ),

  'query_grouped', (
    SELECT json_group_array(
      json_object('sql', sql, 'count', cnt, 'avg_duration', avg_dur)
    )
    FROM (
      SELECT sql, COUNT(*) AS cnt, AVG(duration) AS avg_dur
      FROM statistics.queries
      GROUP BY sql
      ORDER BY cnt DESC
      LIMIT 10
    )
  ),

  -- Cumulative stories over time
  'stories_over_time', (
    SELECT json_group_array(
      json_object('date', date, 'count', cnt, 'cumulative', cumulative)
    )
    FROM (
      SELECT 
        date(first_cached_at / 1000, 'unixepoch', 'localtime') AS date,
        COUNT(*) AS cnt,
        SUM(COUNT(*)) OVER (ORDER BY date(first_cached_at / 1000, 'unixepoch', 'localtime')) AS cumulative
      FROM items
      WHERE type = 'story' AND first_cached_at IS NOT NULL
      GROUP BY date
      ORDER BY date
    )
  ),

  -- Cumulative comments over time
  'comments_over_time', (
    SELECT json_group_array(
      json_object('date', date, 'count', cnt, 'cumulative', cumulative)
    )
    FROM (
      SELECT 
        date(first_cached_at / 1000, 'unixepoch', 'localtime') AS date,
        COUNT(*) AS cnt,
        SUM(COUNT(*)) OVER (ORDER BY date(first_cached_at / 1000, 'unixepoch', 'localtime')) AS cumulative
      FROM items
      WHERE type = 'comment' AND first_cached_at IS NOT NULL
      GROUP BY date
      ORDER BY date
    )
  ),

  -- Cumulative users over time
  'users_over_time', (
    SELECT json_group_array(
      json_object('date', date, 'count', cnt, 'cumulative', cumulative)
    )
    FROM (
      SELECT 
        date(first_cached_at / 1000, 'unixepoch', 'localtime') AS date,
        COUNT(*) AS cnt,
        SUM(COUNT(*)) OVER (ORDER BY date(first_cached_at / 1000, 'unixepoch', 'localtime')) AS cumulative
      FROM users
      WHERE first_cached_at IS NOT NULL
      GROUP BY date
      ORDER BY date
    )
  )
) as data;
