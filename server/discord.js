// helper endpoints the bot will call: verify and ticket handling
const express = require('express');
const router = express.Router();
const { getAsync, runAsync } = require('./auth');
const { db } = require('./database');
const fetch = require('node-fetch'); // if needed

// Endpoint used by the Python bot to verify user submission from Discord modal
router.post('/verify', async (req, res) => {
  const apiSecret = req.headers['x-api-secret'];
  if (apiSecret !== process.env.WEBSITE_API_SECRET) return res.status(401).send('Unauthorized');
  const { discord_id, name, code, country, age_group, minecraft_username } = req.body;
  try {
    // find user by code
    const row = await getAsync('SELECT * FROM users WHERE verification_code = ?', [code]);
    if (!row) return res.status(400).send('Սա ձեր account-ի կոդը չէ։ Խնդրում ենք փորձել նորից։');
    // mark discord_verified and store discord id somewhere (for simplicity, add to users table via update)
    await runAsync('UPDATE users SET discord_verified = 1 WHERE id = ?', [row.id]);
    // Optionally store discord id in another table; send staff notification later via configured webhook or inside bot.
    return res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

// Endpoint to create ticket from bot
router.post('/ticket', async (req, res) => {
  const apiSecret = req.headers['x-api-secret'];
  if (apiSecret !== process.env.WEBSITE_API_SECRET) return res.status(401).send('Unauthorized');
  const { discord_id, title, description } = req.body;
  // Here we simply record the ticket in DB and return success; the bot is responsible for creating the Discord channel
  try {
    // find user by discord_id if stored; else create minimal record
    // For demo: create ticket without user linkage
    const result = await runAsync('INSERT INTO tickets (user_id, title, description) VALUES (?, ?, ?)', [null, title, description]);
    return res.status(200).send('OK');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

module.exports = router;
