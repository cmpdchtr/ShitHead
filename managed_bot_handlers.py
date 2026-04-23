from aiogram import Router, F, Bot
from aiogram.types import Message
from ai_client import generate_response
from memory import save_to_long_term, get_long_term_context, add_to_short_term, get_short_term_context
import db
import asyncio
import json
import random

managed_router = Router()

async def check_rules(bot_info, text: str) -> bool:
    # bot_info: token, system_prompt, probability, delay_seconds, keywords, ignore_users
    probability = bot_info[2]
    keywords_str = bot_info[4]
    
    if random.randint(1, 100) > probability:
        return False
        
    if keywords_str:
        try:
            kws = json.loads(keywords_str)
            if kws:
                text_lower = text.lower()
                if not any(kw.lower() in text_lower for kw in kws):
                    return False
        except:
            pass
            
    return True

@managed_router.message(F.is_automatic_forward)
async def handle_new_post_in_comments(message: Message, bot: Bot):
    bot_info = await db.get_managed_bot(bot.id)
    if not bot_info:
        return
        
    system_prompt = bot_info[1]
    delay_seconds = bot_info[3]
    
    text = message.text or message.caption or ""
    if not text:
        return
        
    if not await check_rules(bot_info, text):
        return
        
    if delay_seconds > 0:
        await asyncio.sleep(delay_seconds)
        
    channel_id = str(message.forward_from_chat.id) if message.forward_from_chat else str(message.chat.id)
    post_id = str(message.message_id)
    
    # Save post to long term memory
    save_to_long_term(channel_id, post_id, text)
    
    past_context = get_long_term_context(channel_id, text)
    
    prompt = f"Новий пост:\n\n{text}\n\n{past_context}\n\nНапиши свій коментар до цього посту. Пиши одразу коментар, без вступних слів."
    
    # Send typing action
    await bot.send_chat_action(chat_id=message.chat.id, action="typing")
    
    response = await generate_response(prompt, system_prompt)
    
    # Reply to the automatic forward (which is the root of the comment thread)
    sent_msg = await message.reply(response)
    
    # Add to short term memory for this thread
    thread_id = f"{message.chat.id}_{message.message_id}"
    add_to_short_term(thread_id, text, "user")
    add_to_short_term(thread_id, response, "assistant")


@managed_router.message(F.reply_to_message)
async def handle_replies(message: Message, bot: Bot):
    if message.reply_to_message.from_user.id != bot.id:
        return
        
    bot_info = await db.get_managed_bot(bot.id)
    if not bot_info:
        return
        
    system_prompt = bot_info[1]
    delay_seconds = bot_info[3]
    ignore_users_str = bot_info[5]
    
    if ignore_users_str:
        try:
            igns = json.loads(ignore_users_str)
            username = message.from_user.username
            if username and any(ign.replace('@', '').lower() == username.lower() for ign in igns):
                return
        except:
            pass
    
    text = message.text or message.caption or ""
    if not text:
        return
        
    if delay_seconds > 0:
        await asyncio.sleep(delay_seconds)
        
    thread_root_id = message.message_thread_id or message.reply_to_message.message_id
    thread_id = f"{message.chat.id}_{thread_root_id}"
    
    add_to_short_term(thread_id, text, "user")
    
    past_dialogue = get_short_term_context(thread_id)
    
    prompt = f"{past_dialogue}\nКористувач каже: {text}\nВідповідай:"
    
    await bot.send_chat_action(chat_id=message.chat.id, action="typing")
    
    response = await generate_response(prompt, system_prompt)
    
    await message.reply(response)
    add_to_short_term(thread_id, response, "assistant")
