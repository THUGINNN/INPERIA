// server/routes/auth.js
const express = require('express');
const router = express.Router();
const { hashPassword, comparePassword, generateJwt, runAsync, getAsync, uuidv4, COOKIE_NAME } = require('../auth');
const { sendVerificationEmail } = require('../email');

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'mastergarik126@gmail.com';
const WEBSITE_URL = process.env.WEBSITE_URL || '';

/**
 * Register
 * Body: { firstName, lastName, username, email, password, country, minecraft }
 * If email matches OWNER_EMAIL => role = OWNER
 */
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, username, email, password, country, minecraft } = req.body;
    if (!email || !password || !username) return res.status(400).json({ error: 'Missing fields' });

    const existsEmail = await getAsync('SELECT id FROM users WHERE email = ?', [email]);
    if (existsEmail) return res.status(400).json({ error: 'Email already used' });

    const existsUser = await getAsync('SELECT id FROM users WHERE username = ?', [username]);
    if (existsUser) return res.status(400).json({ error: 'Username already used' });

    const password_hash = await hashPassword(password);
    const verification_code = Math.floor(100000 + Math.random() * 900000).toString();
    const role = (email.toLowerCase() === OWNER_EMAIL.toLowerCase()) ? 'OWNER' : 'MEMBER';

    const result = await runAsync(
      'INSERT INTO users (first_name, last_name, username, email, password_hash, verification_code, role, country, minecraft) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [firstName || '', lastName || '', username, email, password_hash, verification_code, role, country || '', minecraft || '']
    );

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24h
    await runAsync('INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)', [result.lastID, token, expiresAt]);

    // send verification email (non-blocking)
    try { sendVerificationEmail(email, firstName || '', lastName || '', token, WEBSITE_URL); } catch (err) { console.error('Email send error', err); }

    return res.json({ ok: true, role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Login
 * Body: { identifier (email or username), password }
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Missing fields' });

    const row = await getAsync('SELECT * FROM users WHERE email = ? OR username = ?', [identifier, identifier]);
    if (!row) return res.status(400).json({ error: 'Invalid credentials' });

    const ok = await comparePassword(password, row.password_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

    const token = generateJwt(row);
    // Set HTTP-only cookie
    res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 7 });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  return res.json({ ok: true });
});

/**
 * Verify email (GET or POST)
 * Query param: token
 */
router.post('/verify-email', async (req, res) => {
  try {
    const token = req.query.token || req.body.token;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const row = await getAsync('SELECT * FROM email_verifications WHERE token = ?', [token]);
    if (!row) return res.status(400).json({ error: 'Invalid or expired token' });
    // mark email_verified in users
    await runAsync('UPDATE users SET email_verified = 1 WHERE id = ?', [row.user_id]);
    // delete the verification record
    await runAsync('DELETE FROM email_verifications WHERE id = ?', [row.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Forgot password: request reset email
 * Body: { email }
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await getAsync('SELECT id, first_name, last_name FROM users WHERE email = ?', [email]);
    if (!user) return res.status(200).json({ ok: true }); // don't reveal existence
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour
    await runAsync('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expiresAt]);

    // send reset email (simple template)
    const resetUrl = `${WEBSITE_URL}/reset-password.html?token=${token}`;
    const html = `<div style="font-family: Arial, sans-serif;color:#111">
      <h3>ԴՈՒՔ ՄՈՌԱՑԵԼ ԵՔ ՁԵՐ ԳԱՂՏՆԱԲԱՌԸ THUGINNN IMPERIA ԿԱՅՔՈՒՄ</h3>
      <p>Սեղմեք ներքևի կոճակը՝ վերականգնելու համար:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#00d2ff;color:#031016;border-radius:8px;text-decoration:none;">Վերականգնել գաղտնաբառը</a>
    </div>`;
    try {
      const { transporter } = require('../email'); // if transporter exported; else use sendVerificationEmail variant
      await require('../email').transporter.sendMail({
        from: `"THUGINNN IMPERIA" <${process.env.SMTP_USERNAME}>`,
        to: email,
        subject: 'Password reset - THUGINNN IMPERIA',
        html
      }).catch(e => console.error('send mail err', e));
    } catch (e) { console.error('email send', e); }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Reset password
 * Body: { token, newPassword }
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Missing fields' });
    const row = await getAsync('SELECT * FROM password_resets WHERE token = ?', [token]);
    if (!row) return res.status(400).json({ error: 'Invalid or expired token' });
    const hash = await hashPassword(newPassword);
    await runAsync('UPDATE users SET password_hash = ? WHERE id = ?', [hash, row.user_id]);
    await runAsync('DELETE FROM password_resets WHERE id = ?', [row.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
