const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const requireAuth = require('../middleware/auth');

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  const { rows } = await db.execute("SELECT value FROM settings WHERE key = 'adminPwHash'");
  if (rows.length === 0 || !bcrypt.compareSync(password, rows[0].value)) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const token = jwt.sign({ admin: true }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '8h' });
  res.json({ token });
});

// PUT /api/admin/password  (admin)
router.put('/password', requireAuth, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  const hash = bcrypt.hashSync(password, 10);
  await db.execute({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('adminPwHash', ?)", args: [hash] });
  res.json({ ok: true });
});

module.exports = router;
