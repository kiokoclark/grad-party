const router = require('express').Router();
const db = require('../db');
const requireAuth = require('../middleware/auth');

// GET /api/settings  (public)
router.get('/', async (req, res) => {
  const { rows } = await db.execute("SELECT key, value FROM settings WHERE key IN ('title','subtitle')");
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  res.json(out);
});

// PUT /api/settings  (admin)
router.put('/', requireAuth, async (req, res) => {
  const { title, subtitle } = req.body;
  const stmts = [];
  if (title)    stmts.push({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('title', ?)",    args: [title] });
  if (subtitle) stmts.push({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('subtitle', ?)", args: [subtitle] });
  if (stmts.length) await db.batch(stmts, 'write');
  res.json({ ok: true });
});

module.exports = router;
