import Database from 'better-sqlite3';
import path from 'path';

// On Vercel the filesystem is read-only except /tmp, but /tmp is ephemeral
// (wiped between cold starts). For production use a real hosted DB.
// For local dev this file persists normally.
function dbPath() {
  return process.env.VERCEL
    ? '/tmp/contaai.db'
    : path.join(process.cwd(), 'contaai.db');
}

let _db = null;

function db() {
  if (!_db) {
    _db = new Database(dbPath());
    _db.pragma('journal_mode = WAL');
    _db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        email      TEXT    UNIQUE NOT NULL COLLATE NOCASE,
        password   TEXT    NOT NULL,
        name       TEXT    NOT NULL DEFAULT '',
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }
  return _db;
}

export function findUserByEmail(email) {
  return db().prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
}

export function createUser(email, hashedPassword, name = '') {
  return db()
    .prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)')
    .run(email.toLowerCase().trim(), hashedPassword, name.trim());
}

export function countUsers() {
  return db().prepare('SELECT COUNT(*) as n FROM users').get().n;
}
