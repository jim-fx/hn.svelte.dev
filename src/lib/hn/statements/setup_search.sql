CREATE VIRTUAL TABLE IF NOT EXISTS items USING fts5(id, type, title, body, by, tokenize='trigram');
CREATE VIRTUAL TABLE IF NOT EXISTS users USING fts5(id, about);

CREATE TABLE IF NOT EXISTS token_counts (
    token TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0
);
