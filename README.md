<div align="center">
  <h1>💩 ShitHead</h1>
  <p><b>Advanced AI Manager for Telegram Managed Bots</b></p>
  
  [![Python](https://img.shields.io/badge/Python-3.11+-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
  [![Aiogram](https://img.shields.io/badge/Aiogram-3.27-blue.svg?logo=telegram&logoColor=white)](https://docs.aiogram.dev/)
  [![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg?logo=docker&logoColor=white)](https://www.docker.com/)
</div>

---

## 🚀 Overview
**ShitHead** is a powerful architectural framework and "Master Bot" for creating and managing personalized **AI commentators** in Telegram. It leverages the new Telegram [Managed Bots](https://core.telegram.org/bots/features#managed-bots) feature, allowing you to seamlessly create new bots and configure their behavior directly within the chat without writing additional code.

Each managed bot is powered by **DeepSeek** (via the [OpenDeep](https://github.com/cmpdchtr/opendeep) library) and maintains contextual awareness of your channel using **ChromaDB**.

## ✨ Key Features
- 🤖 **Managed Bots:** Create new AI bots with a single click through the Master Bot interface.
- 🧠 **Intelligent Comments:** Bots autonomously comment on new posts in your channel using DeepSeek.
- 💬 **Audience Interaction:** Bots can reply to users and engage in discussions, maintaining short-term conversational history via JSON.
- 📚 **Long-term Memory:** Integration with the **ChromaDB** vector database allows bots to recall similar past posts for highly contextual responses.
- ⚙️ **Dynamic System Prompts:** Customize the personality and role of each bot using the `/setprompt` command (e.g., *"You are a sarcastic critic"* or *"You are a cheerful cat"*).
- 🐳 **Docker Ready:** Easy, one-click deployment.

---

## 🛠 Technology Stack
- **Language:** Python 3.11+
- **Telegram API:** [aiogram 3.27+](https://docs.aiogram.dev/)
- **AI Integration:** [OpenDeep](https://github.com/cmpdchtr/opendeep) (fast DeepSeek client)
- **Vector Database:** [ChromaDB](https://www.trychroma.com/) (for long-term memory)
- **Relational Database:** aiosqlite (asynchronous SQLite for storing bot configurations)

---

## ⚙️ Installation & Setup

### Step 1: Clone and Configure
```bash
git clone https://github.com/cmpdchtr/ShitHead.git
cd ShitHead
cp .env.example .env
```
Open the `.env` file and insert your tokens:
- `MASTER_BOT_TOKEN` — The token for the master bot obtained from [@BotFather](https://t.me/BotFather) (ensure that "Bot Management Mode" is enabled in the bot's settings).
- `DEEPSEEK_USER_TOKEN` — Your `userToken` from the Local Storage of [chat.deepseek.com](https://chat.deepseek.com).

### Step 2: Run via Docker (Recommended)
```bash
docker build -t shithead-bot .

# Run with mounted volumes to persist databases and vector memory:
docker run -d --name shithead \
  --env-file .env \
  -v $(pwd)/chroma_data:/app/chroma_data \
  -v $(pwd)/shithead.db:/app/shithead.db \
  -v $(pwd)/short_term.json:/app/short_term.json \
  shithead-bot
```

### Step 2 (Alternative): Run Locally
```bash
# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python main.py
```

---

## 🎮 How to Use

1. **Start the Master Bot:** Find your `MASTER_BOT` in Telegram and send the `/start` command.
2. **Create a Managed Bot:** Click the generated link provided by the Master Bot (this will redirect you to BotFather for creation with automatic linking).
3. **Configure Personality:** Once the bot is created, the Master Bot will send a confirmation. Set its personality using:
   ```text
   /setprompt @YourNewBot You are an aggressive commentator who hates Mondays. Always criticize posts.
   ```
4. **Add to Channel:** Add the newly created bot (e.g., @YourNewBot) as an administrator to your Telegram channel (so it can see new posts) and to the linked discussion group (so it can write comments and see replies).
5. **Enjoy:** Publish posts, and your personalized AI assistant will instantly leave unique comments and interact with your subscribers!

---

<div align="center">
  <i>Built with ❤️ for the Telegram community.</i>
</div>
