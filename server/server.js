// server/server.js
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth');
const discordRoutes = require('./discord'); // existing file you have
const adsRoutes = require('./routes/ads');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// simple rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300 // limit per minute
});
app.use(limiter);

// Serve static frontend site (ensure folder name matches)
const SITE_ROOT = path.join(__dirname, '..', 'THUGINNN IMPERIA SITE');
app.use(express.static(SITE_ROOT));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api', discordRoutes);
app.use('/api', adsRoutes);
app.use('/api', adminRoutes);

// Additional endpoints used by frontend:
// user profile
const { authMiddleware, getAsync } = require('./auth');
app.get('/api/user/profile', (req, res) => {
  authMiddleware(req, res, async () => {
    try {
      const id = req.user.id;
      const row = await getAsync('SELECT id, username, first_name, last_name, email, email_verified, discord_verified, verification_code, created_at, role, minecraft FROM users WHERE id = ?', [id]);
      if (!row) return res.status(404).json({ error: 'Not found' });
      const ticketCountRow = await getAsync('SELECT COUNT(*) as c FROM tickets WHERE user_id = ?', [id]);
      row.ticketCount = (ticketCountRow && ticketCountRow.c) ? ticketCountRow.c : 0;
      return res.json(row);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  });
});

// fallback for SPA routes (optional)
app.get('*', (req, res) => {
  // serve index.html for unknown paths so frontend routing works
  res.sendFile(path.join(SITE_ROOT, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
