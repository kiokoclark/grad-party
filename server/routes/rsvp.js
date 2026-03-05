const router = require('express').Router();
const db = require('../db');
const requireAuth = require('../middleware/auth');

// POST /api/rsvp  (public)
router.post('/', async (req, res) => {
  const { name, attending, dietary, plusOne, plusOneName, children, childNames } = req.body;
  if (!name || !attending) return res.status(400).json({ error: 'Missing required fields' });
  await db.execute({
    sql: `INSERT INTO responses (name, attending, dietary, plus_one, plus_one_name, children, child_names, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [name, attending, dietary || '', plusOne || '', plusOneName || '', children || '', childNames || '', new Date().toISOString()]
  });
  res.json({ ok: true });
});

// GET /api/rsvp  (admin)
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.execute('SELECT * FROM responses ORDER BY id DESC');
  res.json(rows.map(r => ({
    id: r.id, name: r.name, attending: r.attending, dietary: r.dietary,
    plusOne: r.plus_one, plusOneName: r.plus_one_name,
    children: r.children, childNames: r.child_names, timestamp: r.timestamp
  })));
});

// DELETE /api/rsvp  (admin)
router.delete('/', requireAuth, async (req, res) => {
  await db.execute('DELETE FROM responses');
  res.json({ ok: true });
});

module.exports = router;
