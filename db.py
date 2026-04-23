import aiosqlite
import sqlite3
import os

DB_PATH = "shithead.db"

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                deepseek_token TEXT
            )
        """)
        # We add new columns for the rule engine: probability, delay_seconds, keywords, ignore_users, avatar_file_id, about_text, description
        await db.execute("""
            CREATE TABLE IF NOT EXISTS managed_bots (
                bot_id INTEGER PRIMARY KEY,
                owner_id INTEGER,
                token TEXT,
                system_prompt TEXT,
                name TEXT,
                username TEXT,
                probability INTEGER DEFAULT 100,
                delay_seconds INTEGER DEFAULT 0,
                keywords TEXT DEFAULT '[]',
                ignore_users TEXT DEFAULT '[]',
                avatar_file_id TEXT,
                about_text TEXT,
                description TEXT
            )
        """)
        # For an existing DB, we need to try adding columns if they don't exist (basic migration)
        try:
            await db.execute("ALTER TABLE managed_bots ADD COLUMN probability INTEGER DEFAULT 100")
            await db.execute("ALTER TABLE managed_bots ADD COLUMN delay_seconds INTEGER DEFAULT 0")
            await db.execute("ALTER TABLE managed_bots ADD COLUMN keywords TEXT DEFAULT '[]'")
            await db.execute("ALTER TABLE managed_bots ADD COLUMN ignore_users TEXT DEFAULT '[]'")
            await db.execute("ALTER TABLE managed_bots ADD COLUMN avatar_file_id TEXT")
            await db.execute("ALTER TABLE managed_bots ADD COLUMN about_text TEXT")
            await db.execute("ALTER TABLE managed_bots ADD COLUMN description TEXT")
        except sqlite3.OperationalError:
            pass # Columns already exist

        await db.execute("""
            CREATE TABLE IF NOT EXISTS bot_channels (
                bot_id INTEGER,
                channel_id INTEGER,
                UNIQUE(bot_id, channel_id)
            )
        """)
        await db.commit()

async def add_managed_bot(bot_id: int, owner_id: int, token: str, name: str, username: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO managed_bots (bot_id, owner_id, token, name, username, system_prompt, probability, delay_seconds, keywords, ignore_users, avatar_file_id, about_text, description) VALUES (?, ?, ?, ?, ?, COALESCE((SELECT system_prompt FROM managed_bots WHERE bot_id = ?), 'Ти - коментатор. Коментуй пости.'), COALESCE((SELECT probability FROM managed_bots WHERE bot_id = ?), 100), COALESCE((SELECT delay_seconds FROM managed_bots WHERE bot_id = ?), 0), COALESCE((SELECT keywords FROM managed_bots WHERE bot_id = ?), '[]'), COALESCE((SELECT ignore_users FROM managed_bots WHERE bot_id = ?), '[]'), (SELECT avatar_file_id FROM managed_bots WHERE bot_id = ?), (SELECT about_text FROM managed_bots WHERE bot_id = ?), (SELECT description FROM managed_bots WHERE bot_id = ?))",
            (bot_id, owner_id, token, name, username, bot_id, bot_id, bot_id, bot_id, bot_id, bot_id, bot_id, bot_id)
        )
        await db.commit()

async def update_bot_prompt(bot_id: int, prompt: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE managed_bots SET system_prompt = ? WHERE bot_id = ?", (prompt, bot_id))
        await db.commit()

async def update_bot_rules(bot_id: int, probability: int, delay_seconds: int, keywords: str, ignore_users: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE managed_bots SET probability = ?, delay_seconds = ?, keywords = ?, ignore_users = ? WHERE bot_id = ?", (probability, delay_seconds, keywords, ignore_users, bot_id))
        await db.commit()

async def get_all_managed_bots():
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT bot_id, token, system_prompt, name, username FROM managed_bots") as cursor:
            return await cursor.fetchall()

async def get_managed_bot(bot_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT token, system_prompt, probability, delay_seconds, keywords, ignore_users FROM managed_bots WHERE bot_id = ?", (bot_id,)) as cursor:
            return await cursor.fetchone()


async def add_bot_channel(bot_id: int, channel_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("INSERT OR IGNORE INTO bot_channels (bot_id, channel_id) VALUES (?, ?)", (bot_id, channel_id))
        await db.commit()

async def get_bot_channels(bot_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT channel_id FROM bot_channels WHERE bot_id = ?", (bot_id,)) as cursor:
            rows = await cursor.fetchall()
            return [str(row[0]) for row in rows]

async def remove_bot_channel(bot_id: int, channel_id: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM bot_channels WHERE bot_id = ? AND channel_id = ?", (bot_id, channel_id))
        await db.commit()

async def update_bot_identity(bot_id: int, name: str, about: str, description: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE managed_bots SET name = ?, about_text = ?, description = ? WHERE bot_id = ?", (name, about, description, bot_id))
        await db.commit()
 system_prompt, probability, delay_seconds, keywords, ignore_users FROM managed_bots WHERE bot_id = ?", (bot_id,)) as cursor:
            return await cursor.fetchone()


async def add_bot_channel(bot_id: int, channel_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("INSERT OR IGNORE INTO bot_channels (bot_id, channel_id) VALUES (?, ?)", (bot_id, channel_id))
        await db.commit()

async def get_bot_channels(bot_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT channel_id FROM bot_channels WHERE bot_id = ?", (bot_id,)) as cursor:
            rows = await cursor.fetchall()
            return [row[0] for row in rows]
