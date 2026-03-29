INSERT INTO statistics.searches (
  query,
  type,
  result_count,
  duration
) VALUES ( 
  :query, 
  :type, 
  :count,
  :duration 
);
