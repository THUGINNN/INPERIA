// server/routes/ads.js
const express = require('express');
const router = express.Router();
const { allAsync, runAsync } = require('../auth');
const { authMiddleware, requireRole } = require('../auth');

// GET all ads (public)
router.get('/ads', async (req, res) => {
  try {
    const rows = await allAsync('SELECT id, title, description, link1, link2, created_at FROM ads ORDER BY created_at DESC', []);
    return res.json({ ads: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// OWNER-only create ad
router.post('/admin/ads', authMiddleware, requireRole('OWNER'), async (req, res) => {
  try {
    const { title, description, link1, link2 } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const result = await runAsync('INSERT INTO ads (title, description, link1, link2, created_by) VALUES (?, ?, ?, ?, ?)', [title, description || '', link1 || '', link2 || '', req.user.id || null]);
    return res.json({ ok: true, id: result.lastID });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
