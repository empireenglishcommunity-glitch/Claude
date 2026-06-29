"""
Complete permission fix for Empire English Discord server.
Ensures all categories have correct visibility for @everyone and level roles.
"""
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
    intents.members = True
    client = discord.Client(intents=intents)

    @client.event
    async def on_ready():
        guild = client.get_guild(GUILD_ID)
        if not guild:
            print("Guild not found")
            await client.close()
            return

        print(f"Connected to: {guild.name}")
        print(f"Roles: {[r.name for r in guild.roles if r.name != '@everyone']}")
        print()

        everyone = guild.default_role
        bot_role = guild.self_role

        # Find level roles by partial match
        def find_role(keyword):
            for r in guild.roles:
                if keyword in r.name:
                    return r
            return None

        l0 = find_role("Level 0")
        l1 = find_role("Level 1")
        l2 = find_role("Level 2")
        l3 = find_role("Level 3")
        ambassador = find_role("Ambassador") or find_role("سفير")
        moderator = find_role("Moderator") or find_role("⚔️")
        admin_role = find_role("Admin") or find_role("🛡️")

        print(f"L0: {l0}")
        print(f"L1: {l1}")
        print(f"L2: {l2}")
        print(f"L3: {l3}")
        print(f"Ambassador: {ambassador}")
        print(f"Moderator: {moderator}")
        print(f"Admin: {admin_role}")
        print()

        # Define what each category should look like
        # WELCOME: everyone can view, only admin/mod can send
        # SYSTEM: everyone can view + send
        # L0: everyone can view + send (so new members see it before !join)
        # L1: only L1+ can see
        # L2: only L2+ can see
        # L3: only L3 can see
        # COMMUNITY: everyone can view + send
        # ACCOUNTABILITY: everyone can view + send
        # RESOURCES: everyone can view + send
        # FEEDBACK: everyone can view + send
        # ADMIN: only admin/mod

        deny = discord.PermissionOverwrite(view_channel=False)
        view_only = discord.PermissionOverwrite(view_channel=True, send_messages=False, read_message_history=True, add_reactions=True)
        view_send = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True, add_reactions=True, embed_links=True, attach_files=True)
        view_send_voice = discord.PermissionOverwrite(view_channel=True, send_messages=True, read_message_history=True, add_reactions=True, embed_links=True, attach_files=True, connect=True, speak=True)
        bot_full = discord.PermissionOverwrite(view_channel=True, send_messages=True, embed_links=True, attach_files=True, manage_messages=True, add_reactions=True, mention_everyone=True)

        for cat in guild.categories:
            name_upper = cat.name.upper()
            overwrites = {}

            if "WELCOME" in name_upper:
                overwrites[everyone] = view_only
                overwrites[bot_role] = bot_full
                if moderator:
                    overwrites[moderator] = view_send
                if admin_role:
                    overwrites[admin_role] = view_send

            elif "SYSTEM" in name_upper:
                overwrites[everyone] = view_send
                overwrites[bot_role] = bot_full

            elif "LEVEL 0" in name_upper:
                overwrites[everyone] = view_send_voice
                overwrites[bot_role] = bot_full

            elif "LEVEL 1" in name_upper:
                overwrites[everyone] = deny
                if l1:
                    overwrites[l1] = view_send_voice
                if l2:
                    overwrites[l2] = view_send_voice
                if l3:
                    overwrites[l3] = view_only
                if ambassador:
                    overwrites[ambassador] = view_send_voice
                overwrites[bot_role] = bot_full

            elif "LEVEL 2" in name_upper:
                overwrites[everyone] = deny
                if l2:
                    overwrites[l2] = view_send_voice
                if l3:
                    overwrites[l3] = view_send_voice
                if ambassador:
                    overwrites[ambassador] = view_send_voice
                overwrites[bot_role] = bot_full

            elif "LEVEL 3" in name_upper:
                overwrites[everyone] = deny
                if l3:
                    overwrites[l3] = view_send_voice
                if ambassador:
                    overwrites[ambassador] = view_send_voice
                overwrites[bot_role] = bot_full

            elif "COMMUNITY" in name_upper:
                overwrites[everyone] = view_send_voice
                overwrites[bot_role] = bot_full

            elif "ACCOUNTABILITY" in name_upper:
                overwrites[everyone] = view_send
                overwrites[bot_role] = bot_full

            elif "RESOURCES" in name_upper:
                overwrites[everyone] = view_send
                overwrites[bot_role] = bot_full

            elif "FEEDBACK" in name_upper:
                overwrites[everyone] = view_send
                overwrites[bot_role] = bot_full

            elif "ADMIN" in name_upper:
                overwrites[everyone] = deny
                if moderator:
                    overwrites[moderator] = view_send
                if admin_role:
                    overwrites[admin_role] = view_send
                overwrites[bot_role] = bot_full

            else:
                print(f"  ? Skipped: {cat.name}")
                continue

            await cat.edit(overwrites=overwrites)
            print(f"  Fixed: {cat.name}")

            # Sync all channels in this category to inherit permissions
            for ch in cat.channels:
                try:
                    await ch.edit(sync_permissions=True)
                except:
                    pass
            await asyncio.sleep(0.5)

        print("\n All permissions fixed!")
        print("\nVisibility after fix:")
        print("  New member (@everyone): WELCOME(view) + SYSTEM + L0 + COMMUNITY + ACCOUNTABILITY + RESOURCES + FEEDBACK")
        print("  L1 member: above + L1 ZONE")
        print("  L2 member: above + L2 ZONE")
        print("  L3 member: above + L3 ZONE")
        print("  Admin/Mod: everything including ADMIN")
        await client.close()

    await client.start(TOKEN)

asyncio.run(main())
