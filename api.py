from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from aiogram import Bot
from memory import clear_channel_memory
import db
import json
import os

app = FastAPI(title="ShitHead API")

# Allow CORS for local React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BotPromptUpdate(BaseModel):
    system_prompt: str

class BotRulesUpdate(BaseModel):
    probability: int
    delay_seconds: int
    keywords: str # Expecting JSON string for simplicity, or we can use list
    ignore_users: str # Expecting JSON string

class BotIdentityUpdate(BaseModel):
    name: str
    about: str
    description: str

class ChannelAction(BaseModel):
    channel_id: str

@app.get("/api/bots")
async def get_bots():
    bots = await db.get_all_managed_bots()
    # bot_id, token, system_prompt, name, username
    return [
        {
            "id": b[0],
            "name": b[3],
            "username": b[4],
            "system_prompt": b[2]
        }
        for b in bots
    ]

@app.get("/api/bots/{bot_id}")
async def get_bot(bot_id: int):
    bot_data = await db.get_managed_bot(bot_id)
    if not bot_data:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    # token, system_prompt, probability, delay_seconds, keywords, ignore_users
    # In a full app, we'd also return about_text and description, but we can fetch them separately or assume they are stored.
    # Let's get the full bot info including identity
    import aiosqlite
    async with aiosqlite.connect(db.DB_PATH) as database:
        async with database.execute("SELECT token, system_prompt, probability, delay_seconds, keywords, ignore_users, name, about_text, description FROM managed_bots WHERE bot_id = ?", (bot_id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Bot not found")
            return {
                "id": bot_id,
                "system_prompt": row[1],
                "probability": row[2],
                "delay_seconds": row[3],
                "keywords": json.loads(row[4]) if row[4] else [],
                "ignore_users": json.loads(row[5]) if row[5] else [],
                "name": row[6],
                "about": row[7] or "",
                "description": row[8] or ""
            }

@app.put("/api/bots/{bot_id}/prompt")
async def update_prompt(bot_id: int, update: BotPromptUpdate):
    bot_data = await db.get_managed_bot(bot_id)
    if not bot_data:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    await db.update_bot_prompt(bot_id, update.system_prompt)
    return {"status": "success"}

@app.put("/api/bots/{bot_id}/rules")
async def update_rules(bot_id: int, update: BotRulesUpdate):
    bot_data = await db.get_managed_bot(bot_id)
    if not bot_data:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    await db.update_bot_rules(bot_id, update.probability, update.delay_seconds, update.keywords, update.ignore_users)
    return {"status": "success"}

@app.put("/api/bots/{bot_id}/identity")
async def update_identity(bot_id: int, update: BotIdentityUpdate):
    bot_data = await db.get_managed_bot(bot_id)
    if not bot_data:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    token = bot_data[0]
    
    # Update via Telegram API
    try:
        b = Bot(token=token)
        await b.set_my_name(name=update.name)
        await b.set_my_short_description(short_description=update.about)
        await b.set_my_description(description=update.description)
        await b.session.close()
    except Exception as e:
        print(f"Error setting bot identity via API: {e}")
        # Proceed to save locally anyway or return error
    
    # Save to local DB
    await db.update_bot_identity(bot_id, update.name, update.about, update.description)
    return {"status": "success"}

@app.get("/api/bots/{bot_id}/stats")
async def get_stats(bot_id: int):
    stats = await db.get_bot_stats(bot_id)
    return stats

@app.get("/api/bots/{bot_id}/channels")
async def get_channels(bot_id: int):
    channels = await db.get_bot_channels(bot_id)
    return {"channels": channels}

@app.post("/api/bots/{bot_id}/channels")
async def add_channel(bot_id: int, action: ChannelAction):
    await db.add_bot_channel(bot_id, int(action.channel_id))
    return {"status": "success"}

@app.delete("/api/bots/{bot_id}/channels/{channel_id}")
async def remove_channel(bot_id: int, channel_id: str):
    await db.remove_bot_channel(bot_id, channel_id)
    return {"status": "success"}

@app.delete("/api/bots/{bot_id}/memory")
async def clear_memory(bot_id: int):
    # Get channels for this bot
    channels = await db.get_bot_channels(bot_id)
    for channel_id in channels:
        clear_channel_memory(channel_id)
    return {"status": "success"}

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Serve Frontend
dist_path = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Serve index.html for any path not matching an API route or file in assets
        index_path = os.path.join(dist_path, "index.html")
        return FileResponse(index_path)
