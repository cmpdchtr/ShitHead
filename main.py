import asyncio
import os
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from dotenv import load_dotenv

import db
from manager_handlers import manager_router
from managed_bot_handlers import managed_router

load_dotenv()

MASTER_BOT_TOKEN = os.getenv("MASTER_BOT_TOKEN")

# Store polling tasks for managed bots
running_bots = {}

async def start_managed_bot(bot_id: int, token: str):
    if bot_id in running_bots:
        return
        
    try:
        # DefaultBotProperties is available in aiogram 3
        bot = Bot(token=token, default=DefaultBotProperties(parse_mode="HTML"))
        dp = Dispatcher()
        dp.include_router(managed_router)
        
        task = asyncio.create_task(dp.start_polling(bot))
        running_bots[bot_id] = task
        print(f"Started polling for managed bot {bot_id}")
    except Exception as e:
        print(f"Error starting bot {bot_id}: {e}")

async def start_all_saved_bots():
    bots = await db.get_all_managed_bots()
    for b in bots:
        bot_id = b[0]
        token = b[1]
        await start_managed_bot(bot_id, token)

async def db_watcher():
    """
    Periodically checks the database for new bots and starts them.
    """
    while True:
        bots = await db.get_all_managed_bots()
        for b in bots:
            bot_id = b[0]
            token = b[1]
            if bot_id not in running_bots:
                await start_managed_bot(bot_id, token)
        await asyncio.sleep(5)

async def main():
    if not MASTER_BOT_TOKEN:
        print("ERROR: MASTER_BOT_TOKEN is missing in .env")
        return

    await db.init_db()
    
    master_bot = Bot(token=MASTER_BOT_TOKEN, default=DefaultBotProperties(parse_mode="HTML"))
    master_dp = Dispatcher()
    master_dp.include_router(manager_router)
    
    # Start previously saved managed bots
    await start_all_saved_bots()
    
    # Start the watcher to dynamically pick up new bots
    asyncio.create_task(db_watcher())
    
    print("Starting master bot ShitHead...")
    await master_dp.start_polling(master_bot)

if __name__ == "__main__":
    asyncio.run(main())
