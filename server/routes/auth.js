const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { hashPassword, comparePassword, generateJwt, runAsync, getAsync } = require('../auth');
const { sendVerificationEmail } = require('../email');
const { db } = require('../database');
const { v4: uuidv4 } = require('uuid');

router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, username, email, password, country, minecraft } = req.body;
    // basic server-side validation
    if (!email || !password || !username) return res.status(400).json({ error: 'Missing fields' });

    // check unique email/username
    const existsEmail = await getAsync('SELECT id FROM users WHERE email = ?', [email]);
    if (existsEmail) return res.status(400).json({ error: 'Email already used' });
    const existsUser = await getAsync('SELECT id FROM users WHERE username = ?', [username]);
    if (existsUser) return res.status(400).json({ error: 'Username already used' });

    const password_hash = await hashPassword(password);
    // generate 6-digit code
    const verification_code = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await runAsync('INSERT INTO users (first_name, last_name, username, email, password_hash, verification_code) VALUES (?, ?, ?, ?, ?, ?)', [firstName, lastName, username, email, password_hash, verification_code]);

    // create email verification token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
