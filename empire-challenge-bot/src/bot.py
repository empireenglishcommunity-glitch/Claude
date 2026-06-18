"""Empire Challenge Bot - main Discord bot.

Features:
  - Auto-posts the daily challenge at a set hour
  - !done <day> <feeling>  -> log completion, get AI motivation, auto-rank
  - !join <goal>           -> register and set your goal
  - !me                    -> your progress, streak and rank
  - !top                   -> leaderboard
  - !today                 -> show today's challenge on demand
  - !recap <week>          -> AI weekly summary (mods)
  - !cert                  -> generate your PDF certificate
"""
import datetime
import discord
from discord.ext import commands, tasks

from . import config, challenges, database, ai_coach, certificate

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)


def _zone():
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo(config.TIMEZONE)
    except Exception:
        return datetime.timezone.utc


async def _assign_rank_role(member: discord.Member, rank_name: str):
    """Create the role if missing and assign it to the member."""
    guild = member.guild
    role = discord.utils.get(guild.roles, name=rank_name)
    if role is None:
        try:
            role = await guild.create_role(name=rank_name, colour=discord.Colour.gold())
        except discord.Forbidden:
            return
    try:
        await member.add_roles(role)
    except discord.Forbidden:
        pass


@bot.event
async def on_ready():
    database.init_db()
    print(f"✅ Logged in as {bot.user} | serving {len(bot.guilds)} server(s)")
    if not daily_post.is_running():
        daily_post.start()


@tasks.loop(time=datetime.time(hour=config.DAILY_POST_HOUR, tzinfo=_zone()))
async def daily_post():
    day = challenges.current_day()
    if not day:
        return
    c = challenges.get_challenge(day)
    if not c:
        return
    channel = bot.get_channel(config.CHALLENGE_CHANNEL_ID)
    if channel is None:
        print("⚠️ CHALLENGE_CHANNEL_ID not found. Check your .env.")
        return
    intro = ai_coach.daily_intro(day, c["task"])
    await channel.send(f"@everyone {intro}\n\n{challenges.format_challenge(c)}")


@bot.command(name="join")
async def join(ctx, *, goal: str = ""):
    database.register(str(ctx.author.id), ctx.author.display_name, goal)
    msg = f"🌱 أهلًا {ctx.author.mention}! تم تسجيلك في التحدّي."
    if goal:
        msg += f"\n🎯 هدفك: **{goal}**"
    msg += "\nبالتوفيق، نراك على القمة! 👑"
    await ctx.send(msg)


@bot.command(name="done")
async def done(ctx, day: int = None, feeling: int = 5):
    if day is None:
        day = challenges.current_day() or 1
    feeling = max(1, min(10, feeling))
    c = challenges.get_challenge(day)
    if not c:
        await ctx.send("❌ رقم اليوم غير صحيح (1 إلى 30).")
        return

    newly = database.log_done(str(ctx.author.id), ctx.author.display_name, day, feeling)
    if not newly:
        await ctx.send(f"✅ سبق أن سجّلت اليوم {day}. أحسنت على الالتزام!")
        return

    total = database.completed_count(str(ctx.author.id))
    streak = database.current_streak(str(ctx.author.id))
    rank_name, emoji = config.rank_for(total)
    coach = ai_coach.feedback(ctx.author.display_name, day, feeling, c["task"])

    await ctx.send(
        f"{emoji} {ctx.author.mention} {coach}\n"
        f"📊 أنجزت **{total}/30** | 🔥 سلسلة متتالية: **{streak}** يوم | الرتبة: **{rank_name}**"
    )

    if isinstance(ctx.author, discord.Member):
        await _assign_rank_role(ctx.author, rank_name)


@bot.command(name="me")
async def me(ctx):
    uid = str(ctx.author.id)
    total = database.completed_count(uid)
    streak = database.current_streak(uid)
    rank_name, emoji = config.rank_for(total)
    p = database.get_participant(uid)
    goal = (p or {}).get("goal") or "—"
    await ctx.send(
        f"{emoji} **تقدّم {ctx.author.display_name}**\n"
        f"🎯 الهدف: {goal}\n"
        f"✅ منجز: {total}/30\n"
        f"🔥 سلسلة متتالية: {streak} يوم\n"
        f"🏅 الرتبة الحالية: {rank_name}"
    )


@bot.command(name="top")
async def top(ctx):
    rows = database.leaderboard(10)
    if not rows:
        await ctx.send("لا يوجد مشاركون بعد. كن أول من ينضم بـ `!join` 🌱")
        return
    medals = ["🥇", "🥈", "🥉"] + ["🔹"] * 7
    lines = ["🏆 **لوحة المتصدّرين**"]
    for i, (name, done_count) in enumerate(rows):
        lines.append(f"{medals[i]} {name} — {done_count}/30")
    await ctx.send("\n".join(lines))


@bot.command(name="today")
async def today(ctx):
    day = challenges.current_day() or 1
    c = challenges.get_challenge(day)
    if not c:
        await ctx.send("لا يوجد تحدٍّ متاح الآن.")
        return
    await ctx.send(challenges.format_challenge(c))


@bot.command(name="recap")
@commands.has_permissions(manage_guild=True)
async def recap(ctx, week: int = 1):
    rows = database.leaderboard(1)
    champion = rows[0][0] if rows else "لم يُحدّد بعد"
    total_done = sum(d for _, d in database.leaderboard(100))
    active = len(database.all_participants())
    text = ai_coach.weekly_recap(week, {"active": active, "done": total_done, "champion": champion})
    await ctx.send(text)


@bot.command(name="cert")
async def cert(ctx):
    uid = str(ctx.author.id)
    total = database.completed_count(uid)
    if total < 1:
        await ctx.send("سجّل تحدّيًا واحدًا على الأقل قبل طلب الشهادة. `!done`")
        return
    rank_name, _ = config.rank_for(total)
    path = certificate.make_certificate(ctx.author.display_name, total, rank_name)
    await ctx.send(
        content=f"📜 شهادتك جاهزة يا {ctx.author.mention}! الرتبة: **{rank_name}**",
        file=discord.File(path),
    )


@bot.command(name="guide")
async def guide(ctx):
    await ctx.send(
        "**أوامر بوت التحدّي:**\n"
        "`!join <هدفك>` — انضم وحدّد هدفك\n"
        "`!today` — تحدّي اليوم\n"
        "`!done <اليوم> <شعورك 1-10>` — سجّل إنجازك\n"
        "`!me` — تقدّمك ورتبتك\n"
        "`!top` — لوحة المتصدّرين\n"
        "`!cert` — شهادتك (PDF)\n"
        "`!recap <الأسبوع>` — ملخّص أسبوعي (للمشرفين)"
    )


def run():
    if not config.DISCORD_TOKEN:
        raise SystemExit("❌ DISCORD_TOKEN غير موجود. انسخ .env.example إلى .env واملأه.")
    bot.run(config.DISCORD_TOKEN)
