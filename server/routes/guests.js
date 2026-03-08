const router = require('express').Router();
const db = require('../db');
const requireAuth = require('../middleware/auth');

function normalize(s) { return s.toLowerCase().replace(/[^a-z]/g, ''); }
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({length: m+1}, (_,i) => Array.from({length: n+1}, (_,j) => i ? j ? 0 : i : j));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = a[i-1] === b[j-1] ? d[i-1][j-1] : 1 + Math.min(d[i-1][j], d[i][j-1], d[i-1][j-1]);
  return d[m][n];
}

// POST /api/guests/lookup  (public)
router.post('/lookup', async (req, res) => {
  const { firstName, lastName } = req.body;
  if (!firstName || !lastName) return res.status(400).json({ error: 'Name required' });

  const { rows } = await db.execute('SELECT * FROM guests');
  if (rows.length === 0) {
    return res.json({ found: true, guest: { firstName, lastName, plusOne: false, children: false } });
  }

  const nf = normalize(firstName), nl = normalize(lastName);
  let best = null, bestScore = Infinity;
  for (const g of rows) {
    const score = levenshtein(nf, normalize(g.first_name)) + levenshtein(nl, normalize(g.last_name));
    if (score < bestScore) { bestScore = score; best = g; }
  }

  if (best && bestScore <= 3) {
    const fullName = best.first_name + ' ' + best.last_name;
    const { rows: existing } = await db.execute({
      sql: 'SELECT id, attending FROM responses WHERE name = ?',
      args: [fullName]
    });
    return res.json({
      found: true,
      alreadyRsvped: existing.length > 0,
      priorAttending: existing.length > 0 ? existing[0].attending : null,
      guest: {
        id: best.id, firstName: best.first_name, lastName: best.last_name,
        plusOne: !!best.plus_one, children: !!best.children
      }
    });
  }
  res.json({ found: false });
});

// GET /api/guests  (admin)
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.execute('SELECT * FROM guests ORDER BY last_name, first_name');
  res.json(rows.map(g => ({ id: g.id, firstName: g.first_name, lastName: g.last_name, plusOne: !!g.plus_one, children: !!g.children })));
});

// POST /api/guests  (admin)
router.post('/', requireAuth, async (req, res) => {
  const { firstName, lastName, plusOne, children } = req.body;
  if (!firstName || !lastName) return res.status(400).json({ error: 'Name required' });
  const result = await db.execute({
    sql: 'INSERT INTO guests (first_name, last_name, plus_one, children) VALUES (?, ?, ?, ?)',
    args: [firstName, lastName, plusOne ? 1 : 0, children ? 1 : 0]
  });
  res.json({ id: Number(result.lastInsertRowid), firstName, lastName, plusOne: !!plusOne, children: !!children });
});

// PUT /api/guests/:id  (admin)
router.put('/:id', requireAuth, async (req, res) => {
  const { firstName, lastName, plusOne, children } = req.body;
  await db.execute({
    sql: 'UPDATE guests SET first_name=?, last_name=?, plus_one=?, children=? WHERE id=?',
    args: [firstName, lastName, plusOne ? 1 : 0, children ? 1 : 0, req.params.id]
  });
  res.json({ ok: true });
});

// DELETE /api/guests/:id  (admin)
router.delete('/:id', requireAuth, async (req, res) => {
  await db.execute({ sql: 'DELETE FROM guests WHERE id=?', args: [req.params.id] });
  res.json({ ok: true });
});

// POST /api/guests/import  (admin)
router.post('/import', requireAuth, async (req, res) => {
  const { guests } = req.body;
  if (!Array.isArray(guests)) return res.status(400).json({ error: 'Expected array' });
  const stmts = [{ sql: 'DELETE FROM guests', args: [] }];
  for (const g of guests) {
    stmts.push({ sql: 'INSERT INTO guests (first_name, last_name, plus_one, children) VALUES (?, ?, ?, ?)', args: [g.firstName, g.lastName, g.plusOne ? 1 : 0, g.children ? 1 : 0] });
  }
  await db.batch(stmts, 'write');
  res.json({ imported: guests.length });
});

module.exports = router;
