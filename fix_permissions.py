"""Fix Discord permissions: make SYSTEM, L0, COMMUNITY, ACCOUNTABILITY, RESOURCES, FEEDBACK visible to @everyone."""
import discord
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN", "")
GUILD_ID = int(os.getenv("GUILD_ID", "0") or "0")

async def main():
    intents = discord.Intents.default()
    intents.guilds = True
    client = discord.Client(intents=intents)

    @client.event
    async def on_ready():
        guild = client.get_guild(GUILD_ID)
        if not guild:
            print("Guild not found")
            await client.close()
            return

        print(f"Connected to: {guild.name}")
        everyone = guild.default_role

        # Categories that should be visible to @everyone (new members)
        visible_categories = ["SYSTEM", "LEVEL 0", "COMMUNITY", "ACCOUNTABILITY", "RESOURCES", "FEEDBACK"]

        for cat in guild.categories:
            cat_upper = cat.name.upper()
            should_be_visible = any(v in cat_upper for v in visible_categories)

            if should_be_visible:
                overwrites = cat.overwrites.copy()
                overwrites[everyone] = discord.PermissionOverwrite(
                    view_channel=True,
                    send_messages=True,
                    read_message_history=True,
                    add_reactions=True,
                )
                await cat.edit(overwrites=overwrites)
                print(f"  Opened: {cat.name}")
                await asyncio.sleep(0.5)
            else:
                print(f"  Kept: {cat.name} (unchanged)")

        print("\nDone! New members can now see all main categories.")
        await client.close()

    await client.start(TOKEN)

asyncio.run(main())
