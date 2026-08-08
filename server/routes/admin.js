// server/routes/admin.js
const express = require('express');
const router = express.Router();
const { getAsync, runAsync } = require('../auth');
const { authMiddleware, requireRole } = require('../auth');

// assign role (OWNER only)
router.post('/admin/assign-role', authMiddleware, requireRole('OWNER'), async (req, res) => {
  try {
    const { userId, email, role } = req.body;
    if (!role) return res.status(400).json({ error: 'Role required' });
    let target;
    if (userId) target = await getAsync('SELECT id FROM users WHERE id = ?', [userId]);
    else if (email) target = await getAsync('SELECT id FROM users WHERE email = ?', [email]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    await runAsync('UPDATE users SET role = ? WHERE id = ?', [role, target.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
