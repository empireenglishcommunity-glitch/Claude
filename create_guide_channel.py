"""Create a #دليل-القنوات (Channel Guide) in the WELCOME category with full Arabic server map."""
import discord
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN", "")
GUILD_ID = int(os.getenv("GUILD_ID", "0") or "0")

GUIDE_MESSAGE = """🏛️ **دليل القنوات — Empire English Community**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **أهلاً | WELCOME**
> `#welcome` — رسالة الترحيب
> `#rules` — القوانين (لازم تقرأها)
> `#roles-info` — شرح المستويات والترقيات
> `#announcements` — إعلانات رسمية
> `#دليل-القنوات` — ← انت هنا 😉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️ **الأوامر | SYSTEM**
> `#bot-commands` — ⭐ **اكتب كل الأوامر هنا** (!join !done !progress)
> `#leaderboard` — لوحة المتصدرين (تتحدث تلقائي)
> `#support` — محتاج مساعدة؟ اسأل هنا
> `#suggestions` — عندك فكرة؟ قولها

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌱 **المستوى 0 | LEVEL 0** (منطقتك كمبتدئ)
> `#l0-daily-tasks` — ⭐ **المهام اليومية (6 صباحًا)**
> `#l0-text-practice` — تمارين كتابة
> `#l0-questions` — أسئلة (العربي مسموح هنا بس!)
> `#l0-showcase` — شارك تسجيلاتك 🎙️
> 🔊 `l0-voice-1` / `l0-voice-2` — غرف صوتية

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💪 **المستوى 1 | LEVEL 1** (بعد الترقية)
> `#l1-daily-tasks` — مهام المستوى الأول
> `#l1-text-practice` — فقرات كاملة
> `#l1-questions` — أسئلة L1
> `#l1-showcase` — شارك تقدمك
> 🔊 غرف صوتية

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 **المستوى 2 | LEVEL 2** (التواصل المتقدم)
> `#l2-daily-tasks` — مهام L2
> `#l2-text-practice` — مقالات وآراء
> `#l2-debate` — 🔊 مناظرات صوتية
> `#l2-showcase` — عروض ومقالات

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👑 **المستوى 3 | LEVEL 3** (الطلاقة)
> `#l3-daily-tasks` — مهام متقدمة
> `#l3-mentorship` — ساعد المبتدئين
> `#l3-debate` — 🔊 مناظرات متقدمة
> `#l3-showcase` — أعمال متقدمة

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌍 **المجتمع | COMMUNITY** (للجميع)
> `#general-chat` — دردشة بالإنجليزي
> `#introductions` — عرّف نفسك! 👋
> 🔊 `voice-lounge` — اتكلم مع أي حد
> `#events` — جلسات قادمة
> `#daily-word` — كلمة اليوم 📖

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 **المتابعة | ACCOUNTABILITY**
> `#daily-check-in` — الصبح: خطتك. بالليل: إنجازك
> `#streak-tracker` — 🔥 الاستمرارية
> `#weekly-goals` — أهداف الأسبوع

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 **المصادر | RESOURCES**
> `#cheat-sheets` — ملخصات سريعة
> `#video-library` — فيديوهات مختارة
> `#podcast-recs` — بودكاست مقترح
> `#book-club` — كتاب الشهر 📚

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 **التقييم | FEEDBACK**
> `#speaking-feedback` — ارفع تسجيل ← AI يرد عليك
> `#writing-feedback` — ابعت كتابتك ← تصحيح
> `#accent-feedback` — نطقك ← feedback
> `#grammar-qa` — أسئلة قواعد

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏛️ **ابدأ من هنا:**
1. اكتب `!join <هدفك>` في `#bot-commands`
2. كل يوم شوف `#l0-daily-tasks`
3. بعد كل مهمة: `!done <task>`

*System over instructor. Common Sense First.* 🏛️"""


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

        # Find the WELCOME category
        welcome_cat = None
        for cat in guild.categories:
            if "WELCOME" in cat.name:
                welcome_cat = cat
                break

        if not welcome_cat:
            print("WELCOME category not found!")
            await client.close()
            return

        # Check if channel already exists
        existing = discord.utils.get(welcome_cat.text_channels, name="\u062f\u0644\u064a\u0644-\u0627\u0644\u0642\u0646\u0648\u0627\u062a")
        if not existing:
            # Create the channel
            ch = await welcome_cat.create_text_channel(
                name="\u062f\u0644\u064a\u0644-\u0627\u0644\u0642\u0646\u0648\u0627\u062a",
                topic="\U0001f5fa\ufe0f \u062e\u0631\u064a\u0637\u0629 \u0643\u0627\u0645\u0644\u0629 \u0644\u0643\u0644 \u0642\u0646\u0648\u0627\u062a \u0627\u0644\u0633\u064a\u0631\u0641\u0631 \u0628\u0627\u0644\u0639\u0631\u0628\u064a",
                overwrites=welcome_cat.overwrites,
            )
            print(f"  Created: #{ch.name}")
        else:
            ch = existing
            print(f"  Already exists: #{ch.name}")

        # Post the guide (check if already posted)
        posted = False
        async for msg in ch.history(limit=5):
            if msg.author == client.user and len(msg.content) > 500:
                posted = True
                break

        if not posted:
            # Split message if needed (Discord 2000 char limit)
            parts = GUIDE_MESSAGE.split("\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n")

            # Recombine into chunks under 2000 chars
            separator = "\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n"
            chunks = []
            current = ""
            for part in parts:
                test = current + separator + part if current else part
                if len(test) > 1900:
                    chunks.append(current)
                    current = part
                else:
                    current = test
            if current:
                chunks.append(current)

            for chunk in chunks:
                await ch.send(chunk)
                await asyncio.sleep(1)
            print(f"  Posted guide ({len(chunks)} messages)")
        else:
            print("  Guide already posted")

        # Pin the first message
        async for msg in ch.history(limit=1, oldest_first=True):
            if not msg.pinned:
                await msg.pin()
                print("  Pinned first message")

        print("\nDone! Channel #\u062f\u0644\u064a\u0644-\u0627\u0644\u0642\u0646\u0648\u0627\u062a is ready.")
        await client.close()

    await client.start(TOKEN)


if __name__ == "__main__":
    asyncio.run(main())
