# THUGINNN IMPERIA Discord Bot

This bot integrates with the THUGINNN IMPERIA website to provide:
- /verify — verification modal that validates a user's 6-digit code via the website API, assigns verified role and notifies staff.
- /ticket — opens modal to create a private support ticket channel in Discord and notifies the website API.
- /status, /help commands.

Requirements
- Python 3.9+
- Discord application & bot created (Bot Token)
- Bot invited to your server (guild) with these permissions:
  - Send Messages
  - Manage Roles (to add verified role)
  - Manage Channels (to create ticket channels)
  - Read Messages/View Channels
  - Use Slash Commands (applications.commands)
  - Embed Links, Send Messages, Read Message History

Setup
1. Clone the repo and change to the bot folder:
   cd "THUGINNN IMPERIA BOT"

2. Create and activate a virtualenv:
   python -m venv venv
   # mac/linux
   source venv/bin/activate
   # windows
   venv\Scripts\activate

3. Install dependencies:
   pip install -r requirements.txt

4. Create a `.env` file (or use Replit Secrets) and fill values based on `.env.example`.
   Required values:
   - DISCORD_TOKEN
   - DISCORD_GUILD_ID (numeric)
   - VERIFIED_ROLE_ID (role to grant after verification)
   - UNVERIFIED_ROLE_ID (role to remove after verification, optional)
   - STAFF_CHANNEL_ID (channel to send staff notifications)
   - TICKET_CATEGORY_ID (category id where ticket channels are created)
   - WEBSITE_API_URL (https://your-site.example.com)
   - WEBSITE_API_SECRET (shared secret used by website to accept bot API calls)
   Optional:
   - STAFF_ROLE_IDS (comma-separated role ids to mention in staff channel)

5. Invite the bot to your server with required permissions:
   Use OAuth2 url generator in Discord Developer Portal (bot + applications.commands + appropriate scopes & permissions).

6. Run the bot:
   python bot.py

Website integration
- The bot POSTs verification data to `POST {WEBSITE_API_URL}/api/discord/verify` with header `x-api-secret: WEBSITE_API_SECRET`.
  Expected request body (JSON): { discord_id, name, code, country, age_group, minecraft_username }
  The website should validate the code and return HTTP 200 on success.

- The bot POSTs ticket data to `POST {WEBSITE_API_URL}/api/discord/ticket` with header `x-api-secret: WEBSITE_API_SECRET`.
  Expected body: { discord_id, title, description, discord_channel_id }

Security notes
- Do not store secrets in repo. Use environment variables or Replit Secrets.
- Ensure `WEBSITE_API_SECRET` is set both in website server and in bot.
