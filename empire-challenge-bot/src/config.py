"""Central configuration, loaded from environment variables (.env file)."""
import os
from dotenv import load_dotenv

load_dotenv()

DISCORD_TOKEN = os.getenv("DISCORD_TOKEN", "")
CHALLENGE_CHANNEL_ID = int(os.getenv("CHALLENGE_CHANNEL_ID", "0") or "0")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DAILY_POST_HOUR = int(os.getenv("DAILY_POST_HOUR", "9") or "9")
TIMEZONE = os.getenv("TIMEZONE", "Asia/Dubai")
START_DATE = os.getenv("START_DATE", "").strip()

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
DB_PATH = os.path.join(BASE_DIR, "challenge.db")
CHALLENGES_PATH = os.path.join(DATA_DIR, "challenges.json")

TOTAL_DAYS = 30

# Rank thresholds: (min_completed, role_name, emoji)
RANKS = [
    (30, "بطل المرونة", "👑"),
    (22, "محارب", "🥇"),
    (15, "مثابر", "🥈"),
    (1, "بدأ الرحلة", "🥉"),
]


def rank_for(completed_count: int):
    """Return (role_name, emoji) for a given number of completed challenges."""
    for threshold, name, emoji in RANKS:
        if completed_count >= threshold:
            return name, emoji
    return "مشارك جديد", "🌱"
