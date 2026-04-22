import aiosqlite
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
        await db.execute("""
            CREATE TABLE IF NOT EXISTS managed_bots (
                bot_id INTEGER PRIMARY KEY,
                owner_id INTEGER,
                token TEXT,
                system_prompt TEXT,
                name TEXT,
                username TEXT
            )
        """)
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
            "INSERT OR REPLACE INTO managed_bots (bot_id, owner_id, token, name, username, system_prompt) VALUES (?, ?, ?, ?, ?, COALESCE((SELECT system_prompt FROM managed_bots WHERE bot_id = ?), 'Ти - коментатор. Коментуй пости.'))",
            (bot_id, owner_id, token, name, username, bot_id)
        )
        await db.commit()

async def update_bot_prompt(bot_id: int, prompt: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE managed_bots SET system_prompt = ? WHERE bot_id = ?", (prompt, bot_id))
        await db.commit()

async def get_all_managed_bots():
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT bot_id, token, system_prompt FROM managed_bots") as cursor:
            return await cursor.fetchall()

async def get_managed_bot(bot_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute("SELECT token, system_prompt FROM managed_bots WHERE bot_id = ?", (bot_id,)) as cursor:
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
