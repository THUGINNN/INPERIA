# THUGINNN IMPERIA

Armenian Minecraft community site (frontend + Node/Express backend) integrated with a Python Discord bot.

Important: DO NOT commit real secrets. Use Replit Secrets or a local `.env` file (not committed).

---

## Quick overview

Project structure (top-level)
- THUGINNN IMPERIA SITE/  — all frontend HTML/CSS/JS/assets
- THUGINNN IMPERIA BOT/   — Python Discord bot (bot.py, requirements.txt, .env.example)
- server/                 — Node/Express backend code
- package.json
- .gitignore
- README.md

---

## Required environment variables (add to Replit Secrets or .env)

General (backend)
- JWT_SECRET=
- COOKIE_SECRET=
- DATABASE_FILE=./data/database.sqlite
- WEBSITE_URL=http://localhost:3000
- OWNER_EMAIL=mastergarik126@gmail.com

Email (SMTP)
- SMTP_HOST=
- SMTP_PORT=
- SMTP_USERNAME=
- SMTP_PASSWORD=

Discord / Bot (shared with bot)
- WEBSITE_API_SECRET= (shared secret for bot <-> website)
- DISCORD_TOKEN= (bot token, used only by Python bot)
- DISCORD_GUILD_ID=
- VERIFICATION_CHANNEL_ID=
- STAFF_CHANNEL_ID=
- VERIFIED_ROLE_ID=
- UNVERIFIED_ROLE_ID=
- TICKET_CATEGORY_ID=
- STAFF_ROLE_IDS= (optional comma-separated role IDs to mention)

Note: Do NOT put secrets into repository files.

---

## Install & run backend (Node.js)

1. Install Node.js (v16+ recommended).
2. Install dependencies:
   - npm install

3. Create `.env` (or use Replit Secrets) with the variables above.

4. Run dev server:
   - npm run dev
   or start:
   - npm start

The frontend is served statically from `THUGINNN IMPERIA SITE/` — visit `http://localhost:3000`.

---

## Database

- Development: SQLite (default file: `data/database.sqlite`).
- The server initializes required tables on startup (users, email_verifications, password_resets, tickets, chat_messages, servers, ads, moderation_actions).

If you prefer PostgreSQL in production, replace `server/database.js` with a Postgres connection and adjust queries.

---

## Email (SMTP)

- Fill SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD in environment.
- The server uses `nodemailer` to send verification, welcome, password reset, and ticket emails.
- Ensure the SMTP credentials are valid (e.g., SMTP provider, Gmail app password, external SMTP).

---

## Discord bot setup (Python)

1. Create Discord Application & Bot in Developer Portal.
2. Invite the bot to your server with these permissions:
   - Send Messages, Manage Roles, Manage Channels, Read Messages/View Channels, Embed Links, Read Message History, Use Slash Commands.
3. Configure environment variables (see BOT/.env.example). The bot needs `DISCORD_TOKEN`, `DISCORD_GUILD_ID`, and WEBSITE_* variables.
4. Install Python dependencies:
   - python -m venv venv
   - source venv/bin/activate
   - pip install -r "THUGINNN IMPERIA BOT/requirements.txt"
5. Run bot:
   - python "THUGINNN IMPERIA BOT/bot.py"

Bot features:
- /verify — opens modal to submit 6-digit website code and info; posts to website API at `/api/discord/verify`. On success the bot assigns verified role and notifies staff channel.
- /ticket — opens modal and creates a private ticket channel in Discord; posts ticket info to website API at `/api/discord/ticket`.
- /status, /help — info commands.

Important: `WEBSITE_API_SECRET` must be set both in website and bot; bot sends it as `x-api-secret` header.

---

## Admin & Owner behavior

- Set `OWNER_EMAIL` in environment (default `mastergarik126@gmail.com` as requested).
- When a user registers with that email, they automatically receive role = `OWNER`.
- Owner can create Ads via admin endpoints and assign roles to other users.
- Ads are shown publicly; only OWNER can create ads (backend enforced).

---

## Frontend

- Written in HTML, CSS, Vanilla JS.
- Files in `THUGINNN IMPERIA SITE/`.
- Assets expected in `THUGINNN IMPERIA SITE/assets/` (logo.svg, favicon.png, hero-bg.webp, hero-overlay.png, banner-top.webp, avatar-default.png, copy.svg, discord.svg, server logos).
- Make sure assets paths match filenames used in HTML (relative `assets/...`).

---

## Security & Hardening (notes)

- Passwords hashed with bcrypt (server).
- JWT for sessions; HTTP-only cookies used for login token.
- Helmet, rate-limiting, CSRF protection considerations included (install & configure as needed).
- Validate inputs on both frontend and backend.
- Do not expose the bot token or API secrets in frontend code.

---

## How to test the important flows

1. Register a new account (use your `OWNER_EMAIL` to create owner).
2. Check email verification flow (verify email link).
3. Login and visit dashboard: you should see verification code (6-digit).
4. In Discord, use `/verify` command: submit the 6-digit code + fields — the website will validate the code and return success.
5. After successful verification, the bot assigns VERIFIED_ROLE and notifies STAFF_CHANNEL.
6. Use `/ticket` in Discord to create a ticket channel — it should create the private channel and send a POST to website API to record the ticket.
7. Owner can create Ads via the Ads page (or via Admin API) — only visible creation UI for OWNER.

---

## Troubleshooting

- If email isn't sent: verify SMTP settings and check logs.
- If bot fails to assign roles or create channels: ensure the bot has Manage Roles and Manage Channels permissions and that role IDs and category IDs are correct numeric IDs.
- If endpoints return 401 from bot: ensure `WEBSITE_API_SECRET` matches between bot and website.
- Logs: check server console and bot console for errors.

---

If you'd like, I can:
- Prepare a zip with all files ready to drop in place,
- Or open a PR / commit these files to a specified branch (if you provide repo & branch and allow pushing),
- Or walk you step-by-step to deploy on Replit.

Which next step do you prefer?
