SELECT *, about as matchedAbout
FROM users 
WHERE about LIKE :query 
LIMIT :limit;
