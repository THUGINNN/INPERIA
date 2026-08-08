const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('./database');
const { v4: uuidv4 } = require('uuid');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'replace-me';

function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function generateJwt(user) {
  const payload = { id: user.id, email: user.email, role: user.role };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Helpers to query DB in Promise style
function runAsync(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
function getAsync(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}
function allAsync(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

module.exports = {
  hashPassword,
  comparePassword,
  generateJwt,
  runAsync,
  getAsync,
  allAsync,
  uuidv4
};
