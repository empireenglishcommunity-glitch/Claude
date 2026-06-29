"""Fix Discord server: rename WELCOME category, update roles, update channel topics to Arabic."""
import discord
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN", "")
GUILD_ID = int(os.getenv("GUILD_ID", "0") or "0")

ROLE_RENAMES = {
    "Level 3": "\U0001f451 Level 3 | \u0637\u0644\u064a\u0642",
    "Level 2": "\U0001f680 Level 2 | \u0645\u062a\u0648\u0627\u0635\u0644",
    "Level 1": "\U0001f4aa Level 1 | \u0645\u062a\u0642\u062f\u0645",
    "Level 0": "\U0001f331 Level 0 | \u0645\u0628\u062a\u062f\u0626",
    "Ambassador": "\U0001f31f \u0633\u0641\u064a\u0631 | Ambassador",
}

TOPICS = {
    "welcome": "\u0645\u0631\u062d\u0628\u064b\u0627 \u0628\u064a\u0643 \u0641\u064a Empire English Community \U0001f3db\ufe0f",
    "rules": "\u0642\u0648\u0627\u0646\u064a\u0646 \u0627\u0644\u0645\u062c\u062a\u0645\u0639 \u2014 \u0627\u0642\u0631\u0623\u0647\u0627 \u0648\u0627\u0642\u0628\u0644\u0647\u0627",
    "roles-info": "\u0625\u0632\u0627\u064a \u0627\u0644\u0645\u0633\u062a\u0648\u064a\u0627\u062a \u0634\u063a\u0627\u0644\u0629 \u0648\u0625\u0632\u0627\u064a \u062a\u062a\u0631\u0642\u0649",
    "announcements": "\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0631\u0633\u0645\u064a\u0629 \u0648\u062a\u062d\u062f\u064a\u062b\u0627\u062a",
    "bot-commands": "\u2b50 \u0627\u0643\u062a\u0628 \u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0647\u0646\u0627: !join !done !progress !streak",
    "leaderboard": "\U0001f3c6 \u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u062a\u0635\u062f\u0631\u064a\u0646 \u2014 \u062a\u062a\u062d\u062f\u062b \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627",
    "support": "\U0001f198 \u0645\u062d\u062a\u0627\u062c \u0645\u0633\u0627\u0639\u062f\u0629\u061f \u0627\u0633\u0623\u0644 \u0647\u0646\u0627",
    "suggestions": "\U0001f4a1 \u0639\u0646\u062f\u0643 \u0641\u0643\u0631\u0629 \u0644\u062a\u062d\u0633\u064a\u0646 \u0627\u0644\u0645\u062c\u062a\u0645\u0639\u061f",
    "l0-daily-tasks": "\U0001f4c5 \u0627\u0644\u0645\u0647\u0627\u0645 \u0627\u0644\u064a\u0648\u0645\u064a\u0629 \u2014 \u062a\u0646\u0632\u0644 \u0627\u0644\u0633\u0627\u0639\u0629 6 \u0635\u0628\u0627\u062d\u064b\u0627 \u0643\u0644 \u064a\u0648\u0645",
    "l0-text-practice": "\u270d\ufe0f \u062a\u0645\u0627\u0631\u064a\u0646 \u0627\u0644\u0643\u062a\u0627\u0628\u0629 \u2014 \u0627\u0643\u062a\u0628 \u0647\u0646\u0627",
    "l0-questions": "\u2753 \u0623\u0633\u0626\u0644\u0629 \u2014 \u0627\u0644\u0639\u0631\u0628\u064a \u0645\u0633\u0645\u0648\u062d \u0647\u0646\u0627 \u0628\u0633",
    "l0-showcase": "\U0001f399\ufe0f \u0634\u0627\u0631\u0643 \u062a\u0633\u062c\u064a\u0644\u0627\u062a\u0643 \u0648\u0627\u062d\u062a\u0641\u0644 \u0628\u062a\u0642\u062f\u0645\u0643!",
    "l1-daily-tasks": "\U0001f4c5 \u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0633\u062a\u0648\u0649 \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u064a\u0648\u0645\u064a\u0629",
    "l1-text-practice": "\u270d\ufe0f \u062a\u0645\u0627\u0631\u064a\u0646 \u0641\u0642\u0631\u0627\u062a \u0643\u0627\u0645\u0644\u0629",
    "l1-questions": "\u2753 \u0623\u0633\u0626\u0644\u0629 \u0639\u0646 \u0645\u062d\u062a\u0648\u0649 Level 1",
    "l1-showcase": "\U0001f399\ufe0f \u0634\u0627\u0631\u0643 \u062a\u0633\u062c\u064a\u0644\u0627\u062a\u0643 \u0648\u062a\u0642\u062f\u0645\u0643",
    "l2-daily-tasks": "\U0001f4c5 \u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0633\u062a\u0648\u0649 \u0627\u0644\u062b\u0627\u0646\u064a",
    "l2-text-practice": "\u270d\ufe0f \u0645\u0642\u0627\u0644\u0627\u062a \u0648\u0622\u0631\u0627\u0621 \u0648\u0643\u062a\u0627\u0628\u0629 \u0645\u062a\u0642\u062f\u0645\u0629",
    "l2-questions": "\u2753 \u0623\u0633\u0626\u0644\u0629 \u0639\u0646 \u0645\u062d\u062a\u0648\u0649 Level 2",
    "l2-showcase": "\U0001f4dd \u0634\u0627\u0631\u0643 \u0645\u0642\u0627\u0644\u0627\u062a\u0643 \u0648\u0639\u0631\u0648\u0636\u0643",
    "l3-daily-tasks": "\U0001f4c5 \u0645\u0647\u0627\u0645 \u0627\u0644\u0645\u0633\u062a\u0648\u0649 \u0627\u0644\u062b\u0627\u0644\u062b \u0627\u0644\u0645\u062a\u0642\u062f\u0645\u0629",
    "l3-text-practice": "\u270d\ufe0f \u0643\u062a\u0627\u0628\u0629 \u0645\u062a\u0642\u062f\u0645\u0629 \u0648\u0623\u0633\u0644\u0648\u0628",
    "l3-mentorship": "\U0001f31f \u0633\u0627\u0639\u062f \u0627\u0644\u0645\u0628\u062a\u062f\u0626\u064a\u0646 \u0648\u0634\u0627\u0631\u0643 \u062a\u062c\u0631\u0628\u062a\u0643",
    "l3-showcase": "\U0001f451 \u0623\u0639\u0645\u0627\u0644 \u0645\u062a\u0642\u062f\u0645\u0629 \u0648\u0639\u0631\u0648\u0636",
    "general-chat": "\U0001f4ac \u062f\u0631\u062f\u0634\u0629 \u0639\u0627\u0645\u0629 \u2014 \u0628\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a \u0628\u0633!",
    "introductions": "\U0001f44b \u0639\u0631\u0651\u0641 \u0646\u0641\u0633\u0643 \u0644\u0644\u0645\u062c\u062a\u0645\u0639!",
    "events": "\U0001f4c5 \u062c\u0644\u0633\u0627\u062a \u0635\u0648\u062a\u064a\u0629 \u0642\u0627\u062f\u0645\u0629 \u0648\u062a\u062d\u062f\u064a\u0627\u062a",
    "daily-word": "\U0001f4d6 \u0643\u0644\u0645\u0629 \u0627\u0644\u064a\u0648\u0645 \u2014 \u0627\u0633\u062a\u062e\u062f\u0645\u0647\u0627 \u0641\u064a \u062c\u0645\u0644\u0629!",
    "daily-check-in": "\u2600\ufe0f \u0627\u0644\u0635\u0628\u062d: \u062e\u0637\u062a\u0643. \U0001f319 \u0628\u0627\u0644\u0644\u064a\u0644: \u0625\u0646\u062c\u0627\u0632\u0643",
    "streak-tracker": "\U0001f525 \u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0627\u0633\u062a\u0645\u0631\u0627\u0631\u064a\u0629 \u2014 \u062a\u062a\u062d\u062f\u062b \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627",
    "weekly-goals": "\U0001f3af \u062d\u062f\u062f \u0623\u0647\u062f\u0627\u0641 \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0643\u0644 \u0625\u062b\u0646\u064a\u0646",
    "cheat-sheets": "\U0001f4dd \u0645\u0644\u062e\u0635\u0627\u062a \u0633\u0631\u064a\u0639\u0629 \u0648\u0645\u0631\u0627\u062c\u0639",
    "video-library": "\U0001f3ac \u0641\u064a\u062f\u064a\u0648\u0647\u0627\u062a \u0645\u062e\u062a\u0627\u0631\u0629 \u062d\u0633\u0628 \u0627\u0644\u0645\u0633\u062a\u0648\u0649",
    "podcast-recs": "\U0001f3a7 \u0628\u0648\u062f\u0643\u0627\u0633\u062a \u0645\u0642\u062a\u0631\u062d \u0644\u0644\u0627\u0633\u062a\u0645\u0627\u0639",
    "book-club": "\U0001f4da \u0643\u062a\u0627\u0628 \u0627\u0644\u0634\u0647\u0631 + \u0645\u0646\u0627\u0642\u0634\u0629",
    "speaking-feedback": "\U0001f399\ufe0f \u0627\u0631\u0641\u0639 \u062a\u0633\u062c\u064a\u0644 \u2190 AI + \u0632\u0645\u0644\u0627\u0626\u0643 \u064a\u0631\u062f\u0648\u0627 \u0639\u0644\u064a\u0643",
    "writing-feedback": "\u270d\ufe0f \u0627\u0628\u0639\u062a \u0643\u062a\u0627\u0628\u062a\u0643 \u2190 \u062a\u0635\u062d\u064a\u062d \u0648\u0645\u0644\u0627\u062d\u0638\u0627\u062a",
    "accent-feedback": "\U0001f5e3\ufe0f \u0645\u0642\u0627\u0637\u0639 \u0646\u0637\u0642 \u2190 feedback \u0639\u0644\u0649 \u0644\u0647\u062c\u062a\u0643",
    "grammar-qa": "\U0001f4d6 \u0623\u0633\u0626\u0644\u0629 \u0642\u0648\u0627\u0639\u062f \u0648\u0625\u062c\u0627\u0628\u0627\u062a",
}


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

        # Fix WELCOME category
        for cat in guild.categories:
            if "WELCOME" in cat.name and "\u0623\u0647\u0644\u0627\u064b" not in cat.name:
                await cat.edit(name="\U0001f4cb \u0623\u0647\u0644\u0627\u064b | WELCOME")
                print(f"  Category fixed: WELCOME")
                await asyncio.sleep(0.5)

        # Rename roles
        for role in guild.roles:
            for old_end, new_name in ROLE_RENAMES.items():
                if role.name.endswith(old_end) and "|" not in role.name:
                    await role.edit(name=new_name)
                    print(f"  Role: {old_end} -> {new_name}")
                    await asyncio.sleep(0.5)
                    break

        # Update channel topics
        for ch in guild.text_channels:
            if ch.name in TOPICS:
                try:
                    await ch.edit(topic=TOPICS[ch.name])
                    print(f"  Topic: #{ch.name}")
                    await asyncio.sleep(0.4)
                except Exception as e:
                    print(f"  Skip #{ch.name}: {e}")

        print("\nAll done!")
        await client.close()

    await client.start(TOKEN)


if __name__ == "__main__":
    asyncio.run(main())
