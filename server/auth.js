// server/auth.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS || 10);
const JWT_SECRET = process.env.JWT_SECRET || 'replace-me';
const COOKIE_NAME = process.env.COOKIE_NAME || 'thug_token';

function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateJwt(user) {
  const payload = { id: user.id, email: user.email, role: user.role || 'MEMBER' };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// DB helpers (Promise wrappers)
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}
function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Auth middleware: checks Authorization Bearer or cookie
function authMiddleware(req, res, next) {
  try {
    let token = null;
    if (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }
    if (!token && req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    // OWNER is superset of all roles
    if (req.user.role === 'OWNER') return next();
    if (req.user.role === role) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  generateJwt,
  runAsync,
  getAsync,
  allAsync,
  uuidv4,
  authMiddleware,
  requireRole,
  COOKIE_NAME
};
