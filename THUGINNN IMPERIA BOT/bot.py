# bot.py
# Discord bot for THUGINNN IMPERIA
# Features:
# - /verify -> shows verification embed + button -> opens modal -> posts to website API to validate 6-digit code + other fields
#   On success: assigns VERIFIED_ROLE (removes UNVERIFIED_ROLE), posts staff notification embed to STAFF_CHANNEL (mentions configured staff role ids)
# - /ticket -> opens modal -> creates a private ticket channel under configured category with permission overwrites (only creator + staff roles + bot)
#   Stores ticket via WEBSITE API
# - /status and /help simple commands
# - All outgoing requests to website API include header 'x-api-secret': WEBSITE_API_SECRET
# Requirements: discord.py (2.x), python-dotenv, aiohttp, requests (optional)
import os
import logging
import asyncio
from typing import List, Optional

import aiohttp
import discord
from discord import app_commands
from discord.ext import commands
from discord.ui import View, Button, Modal, TextInput

from dotenv import load_dotenv

load_dotenv()

# Logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("thugbot")

# Env / config
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
GUILD_ID = int(os.getenv("DISCORD_GUILD_ID") or 0)
VERIFICATION_CHANNEL_ID = int(os.getenv("VERIFICATION_CHANNEL_ID") or 0)
STAFF_CHANNEL_ID = int(os.getenv("STAFF_CHANNEL_ID") or 0)
VERIFIED_ROLE_ID = int(os.getenv("VERIFIED_ROLE_ID") or 0)
UNVERIFIED_ROLE_ID = int(os.getenv("UNVERIFIED_ROLE_ID") or 0)
TICKET_CATEGORY_ID = int(os.getenv("TICKET_CATEGORY_ID") or 0)
WEBSITE_API_URL = os.getenv("WEBSITE_API_URL")  # example: https://your-site.example.com
WEBSITE_API_SECRET = os.getenv("WEBSITE_API_SECRET")  # shared secret header
# Optional: CSV of staff role ids that should be notified on verification
STAFF_ROLE_IDS_STR = os.getenv("STAFF_ROLE_IDS", "")  # e.g. "111111,222222,333333"
STAFF_ROLE_IDS = [int(x) for x in STAFF_ROLE_IDS_STR.split(",") if x.strip().isdigit()]

# Basic validation
if not DISCORD_TOKEN:
    log.error("DISCORD_TOKEN is not set in environment")
    raise SystemExit(1)
if not WEBSITE_API_URL or not WEBSITE_API_SECRET:
    log.warning("WEBSITE_API_URL or WEBSITE_API_SECRET not set — bot will still run but API calls will fail")

intents = discord.Intents.default()
intents.members = True
intents.message_content = False

bot = commands.Bot(command_prefix="!", intents=intents)
tree = bot.tree  # app_commands.CommandTree

# Helper: HTTP client session (reused)
session: Optional[aiohttp.ClientSession] = None
def get_api_headers():
    return {"x-api-secret": WEBSITE_API_SECRET, "Content-Type": "application/json"}

# Modal for verification
class VerificationModal(Modal, title="THUGINNN IMPERIA ՎԵՐԻՖԻԿԱՑԻԱ"):
    full_name = TextInput(label="Անուն / Ազգանուն", placeholder="Եղի՛ր գրագետ", style=discord.TextStyle.short, required=True, max_length=80)
    code = TextInput(label="6-անիշանոց THUGINNN կոդ", placeholder="628829", style=discord.TextStyle.short, required=True, max_length=6)
    country = TextInput(label="Երկիր", style=discord.TextStyle.short, required=False, max_length=40)
    age_group = TextInput(label="Տարիքային խումբ (13-15, 16-17, 18+)", style=discord.TextStyle.short, required=True)
    mc_username = TextInput(label="Minecraft Username", style=discord.TextStyle.short, required=True)

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True, ephemeral=True)
        payload = {
            "discord_id": str(interaction.user.id),
            "name": self.full_name.value,
            "code": self.code.value,
            "country": self.country.value,
            "age_group": self.age_group.value,
            "minecraft_username": self.mc_username.value
        }
        log.info("Verification attempt payload: %s", payload)
        if not session:
            return await interaction.followup.send("Սերվերի հետ կապված խնդիր։", ephemeral=True)
        try:
            async with session.post(f"{WEBSITE_API_URL}/api/discord/verify", json=payload, headers=get_api_headers(), timeout=15) as resp:
                text = await resp.text()
                if resp.status == 200:
                    # success: assign roles in guild
                    guild = bot.get_guild(GUILD_ID) or await bot.fetch_guild(GUILD_ID)
                    member = guild.get_member(interaction.user.id) or await guild.fetch_member(interaction.user.id)
                    # add verified role
                    try:
                        if VERIFIED_ROLE_ID:
                            await member.add_roles(discord.Object(id=VERIFIED_ROLE_ID), reason="Verified via website")
                        if UNVERIFIED_ROLE_ID:
                            # remove unverified
                            await member.remove_roles(discord.Object(id=UNVERIFIED_ROLE_ID), reason="Verified via website")
                    except Exception as e:
                        log.exception("role assign error: %s", e)
                    # notify staff channel
                    try:
                        await notify_staff_verification(guild, member, payload)
                    except Exception as e:
                        log.exception("staff notify error: %s", e)
                    await interaction.followup.send("Վերֆիկացումը հաջողվեց։ Շնորհակալություն։", ephemeral=True)
                else:
                    # API returned error - show message
                    await interaction.followup.send(f"Վերֆիկացում ձախողվեց: {text}", ephemeral=True)
        except asyncio.TimeoutError:
            await interaction.followup.send("API-ի հետ Timeout։ Փորձեք կրկին։", ephemeral=True)
        except Exception as e:
            log.exception("verification error")
            await interaction.followup.send("Սխալ՝ ներսում։", ephemeral=True)

# Modal for ticket creation
class TicketModal(Modal, title="Ստեղծել Ticket"):
    title = TextInput(label="Ticket վերնագիր", placeholder="Խնդրի վերնագիր", style=discord.TextStyle.short, required=True, max_length=80)
    description = TextInput(label="Խնդրի նկարագրությունը", placeholder="Մանրամասներ", style=discord.TextStyle.paragraph, required=True, max_length=2000)

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(thinking=True, ephemeral=True)
        guild = bot.get_guild(GUILD_ID) or await bot.fetch_guild(GUILD_ID)
        creator = interaction.user
        # create channel name safe
        safe_name = f"ticket-{creator.name}-{creator.discriminator}".lower().replace(" ", "-")[:90]
        # creation: set overwrites: deny @everyone, allow member, allow staff roles, allow bot
        overwrites = {
            guild.default_role: discord.PermissionOverwrite(view_channel=False),
        }
        # allow creator
        overwrites[creator] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_messages=True, read_message_history=True)
        # allow staff roles
        for rid in STAFF_ROLE_IDS:
            try:
                role = guild.get_role(rid) or await guild.fetch_role(rid)
                overwrites[role] = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_messages=True, read_message_history=True)
            except Exception:
                log.warning("staff role id %s not found", rid)
        # allow bot
        bot_member = guild.me
        overwrites[bot_member] = discord.PermissionOverwrite(view_channel=True, send_messages=True, manage_channels=True, read_messages=True, read_message_history=True)

        # find category
        category = None
        try:
            if TICKET_CATEGORY_ID:
                category = guild.get_channel(TICKET_CATEGORY_ID) or await bot.fetch_channel(TICKET_CATEGORY_ID)
        except Exception as e:
            log.warning("ticket category fetch error: %s", e)
        try:
            channel = await guild.create_text_channel(name=safe_name, overwrites=overwrites, category=category, reason=f"Ticket created by {creator}")
            # send initial message
            await channel.send(f"Ticket ստեղծվեց՝ {creator.mention}\n**Առաքյալ**: {self.title.value}\n**Նկարագրություն**: {self.description.value}")
            # call website API to store ticket (include channel_id)
            if session:
                payload = {
                    "discord_id": str(creator.id),
                    "title": self.title.value,
                    "description": self.description.value,
                    "discord_channel_id": str(channel.id)
                }
                try:
                    async with session.post(f"{WEBSITE_API_URL}/api/discord/ticket", json=payload, headers=get_api_headers(), timeout=15) as resp:
                        if resp.status == 200:
                            await interaction.followup.send(f"Ticket հաջողությամբ ստեղծվեց՝ {channel.mention}", ephemeral=True)
                        else:
                            txt = await resp.text()
                            log.warning("ticket API returned %s: %s", resp.status, txt)
                            await interaction.followup.send("Ticket ստեղծվեց Discord-ում, բայց website API-ին գրելն անհաջող եղավ։", ephemeral=True)
                except Exception as e:
                    log.exception("ticket API error")
                    await interaction.followup.send("Ticket ստեղծվեց Discord-ում, բայց website API զանգը ձախողվեց։", ephemeral=True)
            else:
                await interaction.followup.send(f"Ticket ստեղծվեց՝ {channel.mention}", ephemeral=True)
        except discord.Forbidden:
            await interaction.followup.send("Bot-ին չկան բավարար թույլտվություններ՝ channel ստեղծելու համար։ Խնդրում ենք տրամադրել Manage Channels թույլտվությունը։", ephemeral=True)
        except Exception as e:
            log.exception("ticket create error")
            await interaction.followup.send("Ticket ստեղծման ընթացքում կատարվեց սխալ։", ephemeral=True)

# Helpers
async def notify_staff_verification(guild: discord.Guild, member: discord.Member, payload: dict):
    """Send staff notification embed to STAFF_CHANNEL_ID, mention staff roles (if provided)."""
    if not STAFF_CHANNEL_ID:
        log.warning("STAFF_CHANNEL_ID not configured, skipping staff notification")
        return
    try:
        ch = guild.get_channel(STAFF_CHANNEL_ID) or await bot.fetch_channel(STAFF_CHANNEL_ID)
        embed = discord.Embed(title="Նոր վերդֆիկացված օգտատեր", color=0x00D2FF)
        embed.add_field(name="Discord", value=f"{member.mention} ({member})", inline=False)
        # payload.name may contain full name
        embed.add_field(name="Website անուն", value=payload.get("name", "—"), inline=True)
        embed.add_field(name="Minecraft", value=payload.get("minecraft_username", "—"), inline=True)
        embed.add_field(name="Երկիր", value=payload.get("country", "—"), inline=True)
        embed.add_field(name="Verification time", value=discord.utils.format_dt(discord.utils.utcnow()), inline=True)
        embed.set_thumbnail(url=member.display_avatar.url if member.display_avatar else None)
        # build content mentioning staff roles only
        mention_text = ""
        for rid in STAFF_ROLE_IDS:
            mention_text += f"<@&{rid}> "
        await ch.send(content=mention_text or None, embed=embed)
    except Exception as e:
        log.exception("notify_staff_verification error: %s", e)

# Commands
@tree.command(name="verify", description="Սկսել THUGINNN IMPERIA verification flow")
async def slash_verify(interaction: discord.Interaction):
    # send ephemeral embed with button opening modal (or directly send modal)
    view = View()
    btn = Button(label="💎 THUGINNN IMPERIA ՎԵՐԻՖԻԿԱՑԻԱ +", style=discord.ButtonStyle.primary)
    async def btn_cb(i: discord.Interaction):
        await i.response.send_modal(VerificationModal())
    btn.callback = btn_cb
    view.add_item(btn)
    embed = discord.Embed(title="THUGINNN IMPERIA ՎԵՐԻՖԻԿԱՑԻԱ", description="Հե՛տևեք հրահանգներին և լրացրեք ձեր տվյալները։", color=0x00D2FF)
    await interaction.response.send_message(embed=embed, view=view, ephemeral=True)

@tree.command(name="ticket", description="Create a support ticket in server")
async def slash_ticket(interaction: discord.Interaction):
    # show modal for ticket creation
    await interaction.response.send_modal(TicketModal())

@tree.command(name="status", description="Bot status info")
async def slash_status(interaction: discord.Interaction):
    await interaction.response.send_message("THUGINNN IMPERIA Bot աշխատում է։", ephemeral=True)

@tree.command(name="help", description="Get help on available commands")
async def slash_help(interaction: discord.Interaction):
    txt = "Օգտվեք `/verify`՝ վերդֆիկացնելու համար և `/ticket`՝ աջակցություն ստանալու համար։"
    await interaction.response.send_message(txt, ephemeral=True)

# Sync commands on ready
@bot.event
async def on_ready():
    global session
    log.info("Logged in as %s (id: %s)", bot.user, bot.user.id)
    # create aiohttp session
    if session is None:
        session = aiohttp.ClientSession()
    # sync guild commands if GUILD_ID provided (faster for testing)
    try:
        if GUILD_ID:
            guild = discord.Object(id=GUILD_ID)
            await tree.sync(guild=guild)
            log.info("Synced commands to guild %s", GUILD_ID)
        else:
            await tree.sync()
            log.info("Synced global commands")
    except Exception as e:
        log.exception("sync commands error: %s", e)

# Graceful close
async def shutdown():
    global session
    log.info("Shutting down bot")
    if session:
        await session.close()

# Handle errors in app commands
@bot.tree.error
async def on_app_command_error(interaction: discord.Interaction, error: app_commands.AppCommandError):
    log.exception("app command error: %s", error)
    try:
        await interaction.response.send_message("Սխալ՝ կատարման ընթացքում։", ephemeral=True)
    except Exception:
        pass

# Run
try:
    bot.run(DISCORD_TOKEN)
except KeyboardInterrupt:
    log.info("Keyboard interrupt received")
    asyncio.run(shutdown())
