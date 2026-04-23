from aiogram import Router, F, Bot
from aiogram.types import Message, Update
from aiogram.filters import CommandStart, Command
from aiogram.types import BotCommand
from aiogram.exceptions import TelegramAPIError
import db

manager_router = Router()

@manager_router.message(CommandStart())
async def start_cmd(message: Message, bot: Bot):
    bot_me = await bot.get_me()
    
    # We provide a generic link to create a new managed bot
    link = f"https://t.me/newbot/{bot_me.username}/givnoid?name=GivnoidBot"
    
    await message.answer(
        f"🌟 <b>Привіт! Я ShitHead - твій ШІ-менеджер ботів.</b>\n\n"
        f"Ти можеш створити свого власного керованого (Managed) бота-коментатора, "
        f"який буде спілкуватися від свого імені у твоєму каналі!\n\n"
        f"1️⃣ <b>Створити нового бота:</b>\n"
        f"Натисни сюди: {link} (або підстав свої параметри в лінк)\n\n"
        f"2️⃣ <b>Що далі?</b>\n"
        f"Як тільки ти створиш бота, я напишу тобі і збережу його.\n"
        f"Потім ти зможеш налаштувати його системний промпт командою:\n"
        f"<code>/setprompt @botusername Ти веселий коментатор...</code>\n\n"
        f"Або можеш просто відправити мені токен будь-якого бота з BotFather!",
        parse_mode="HTML"
    )

@manager_router.managed_bot()
async def on_managed_bot(event: Update, bot: Bot):
    # Accessing the managed_bot update specifically
    m_bot_update = event.managed_bot
    if not m_bot_update:
        return

    creator_id = m_bot_update.user.id
    # To avoid 'bot' property collision, we can access the field via model_dump or getattr if needed,
    # but in aiogram 3.17+, it might be handled. Let's use the most reliable way.
    new_bot_user = m_bot_update.bot
    
    new_bot_id = new_bot_user.id
    new_bot_name = new_bot_user.first_name
    new_bot_username = new_bot_user.username
    
    try:
        # Request the token from Telegram
        token = await bot.get_managed_bot_token(bot_id=new_bot_id)
        
        await db.add_managed_bot(
            bot_id=new_bot_id,
            owner_id=creator_id,
            token=token,
            name=new_bot_name,
            username=new_bot_username
        )
        
        await bot.send_message(
            chat_id=creator_id,
            text=f"✅ <b>Бот @{new_bot_username} успішно створений та підключений!</b>\n\n"
                 f"Тепер ти можеш налаштувати його поведінку:\n"
                 f"<code>/setprompt @{new_bot_username} Ти - ШІ коментатор. Коментуй пости смішно та саркастично.</code>",
            parse_mode="HTML"
        )
    except TelegramAPIError as e:
        await bot.send_message(chat_id=creator_id, text=f"❌ Помилка отримання токена для @{new_bot_username}: {e}")

@manager_router.message(F.text.regexp(r"^[0-9]+:[a-zA-Z0-9_-]+$"))
async def add_bot_manual(message: Message, bot: Bot):
    token = message.text
    try:
        test_bot = Bot(token=token)
        me = await test_bot.get_me()
        await test_bot.session.close()
        
        await db.add_managed_bot(
            bot_id=me.id,
            owner_id=message.from_user.id,
            token=token,
            name=me.first_name,
            username=me.username
        )
        await message.answer(f"✅ Бот @{me.username} успішно доданий вручну!\n\nТепер встанови йому системний промпт командою:\n<code>/setprompt @{me.username} &lt;твій промпт&gt;</code>", parse_mode="HTML")
    except Exception as e:
        await message.answer(f"❌ Невірний токен або помилка: {e}")

@manager_router.message(Command("setprompt"))
async def set_prompt(message: Message):
    # Clean up whitespace and split
    parts = message.text.strip().split(maxsplit=2)
    if len(parts) < 3:
        await message.answer("❌ Формат: /setprompt @botusername Ти веселий коментатор...")
        return
        
    username = parts[1].replace("@", "").strip()
    prompt = parts[2].strip()
    
    import aiosqlite
    from db import DB_PATH
    async with aiosqlite.connect(DB_PATH) as database:
        # Use LOWER() for case-insensitive username comparison
        async with database.execute(
            "SELECT bot_id FROM managed_bots WHERE LOWER(username) = LOWER(?) AND owner_id = ?", 
            (username, message.from_user.id)
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                await message.answer(f"❌ Бота @{username} не знайдено або ти не є його власником.")
                return
            
            bot_id = row[0]
            await database.execute("UPDATE managed_bots SET system_prompt = ? WHERE bot_id = ?", (prompt, bot_id))
            await database.commit()
            
    await message.answer(f"✅ Промпт для @{username} успішно оновлено!")
