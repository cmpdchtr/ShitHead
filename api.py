from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
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
    return {
        "id": bot_id,
        "system_prompt": bot_data[1],
        "probability": bot_data[2],
        "delay_seconds": bot_data[3],
        "keywords": json.loads(bot_data[4]) if bot_data[4] else [],
        "ignore_users": json.loads(bot_data[5]) if bot_data[5] else []
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
