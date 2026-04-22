import os
import asyncio
import opendeep as genai
from dotenv import load_dotenv

load_dotenv()

# We get the userToken from .env
USER_TOKEN = os.getenv("DEEPSEEK_USER_TOKEN")

if USER_TOKEN:
    genai.configure(api_key=USER_TOKEN)
else:
    print("WARNING: DEEPSEEK_USER_TOKEN not found in .env. AI will not work.")

# Use deepseek-chat for quick comments, deepseek-reasoner for deep thoughts
MODEL_NAME = "deepseek-chat"

def _generate_response_sync(prompt: str, system_prompt: str = "") -> str:
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        
        # opendeep/gemini syntax for providing system instructions
        # Since it's a simple wrapper, we might need to manually prepend the system prompt
        # if `system_instruction` is not supported.
        full_prompt = f"System: {system_prompt}\n\nUser: {prompt}" if system_prompt else prompt
        
        response = model.generate_content(full_prompt, stream=False)
        return response.text
    except Exception as e:
        print(f"Error in opendeep generation: {e}")
        return "Не зміг придумати відповідь :("

async def generate_response(prompt: str, system_prompt: str = "") -> str:
    """
    Asynchronously generates a response using OpenDeep (wrapped in to_thread).
    """
    return await asyncio.to_thread(_generate_response_sync, prompt, system_prompt)
