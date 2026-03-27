SELECT *
FROM users 
WHERE name LIKE :query 
LIMIT :limit;
