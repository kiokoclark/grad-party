const router = require('express').Router();

// GET /api/settings  (kept for compatibility)
router.get('/', (_req, res) => res.json({}));

module.exports = router;
