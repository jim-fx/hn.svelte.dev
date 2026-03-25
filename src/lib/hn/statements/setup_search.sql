CREATE VIRTUAL TABLE IF NOT EXISTS items USING fts5(id, type, title, body, by);
CREATE VIRTUAL TABLE IF NOT EXISTS users USING fts5(id, about);
