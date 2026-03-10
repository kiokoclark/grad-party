const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = createClient({
  url: process.env.DATABASE_URL || `file:${path.join(__dirname, 'data.sqlite')}`,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function init() {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      plus_one INTEGER DEFAULT 0,
      children INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      attending TEXT NOT NULL,
      dietary TEXT DEFAULT '',
      plus_one TEXT DEFAULT '',
      plus_one_name TEXT DEFAULT '',
      children TEXT DEFAULT '',
      child_names TEXT DEFAULT '',
      timestamp TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
  ], 'write');

  // Migrate: add party_tag column if it doesn't exist yet
  try { await db.execute('ALTER TABLE guests ADD COLUMN party_tag TEXT DEFAULT NULL'); } catch (_) {}

  // Seed defaults on first run
  const existing = await db.execute("SELECT value FROM settings WHERE key = 'adminPwHash'");
  if (existing.rows.length === 0) {
    const hash = bcrypt.hashSync('/admin-for-sam', 10);
    await db.execute({ sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('adminPwHash', ?)", args: [hash] });
  }
}

init().catch(err => { console.error('DB init failed:', err); process.exit(1); });

module.exports = db;
