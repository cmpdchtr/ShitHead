import json
import os
import chromadb
from datetime import datetime

# Initialize ChromaDB for long-term memory
chroma_client = chromadb.PersistentClient(path="./chroma_data")
# We'll create a collection for the channels to remember old posts
channel_memory = chroma_client.get_or_create_collection(name="channel_memory")

SHORT_TERM_FILE = "short_term.json"

def load_short_term():
    if os.path.exists(SHORT_TERM_FILE):
        with open(SHORT_TERM_FILE, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {}
    return {}

def save_short_term(data):
    with open(SHORT_TERM_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def add_to_short_term(thread_id: str, message: str, role: str = "user"):
    data = load_short_term()
    if thread_id not in data:
        data[thread_id] = []
    
    data[thread_id].append({
        "role": role,
        "content": message,
        "timestamp": datetime.now().isoformat()
    })
    
    # Keep only the last 20 messages per thread
    if len(data[thread_id]) > 20:
        data[thread_id] = data[thread_id][-20:]
        
    save_short_term(data)

def get_short_term_context(thread_id: str) -> str:
    data = load_short_term()
    thread = data.get(thread_id, [])
    if not thread:
        return ""
    
    context = "Історія діалогу:\n"
    for msg in thread:
        role_name = "Користувач" if msg["role"] == "user" else "Ти (Бот)"
        context += f"{role_name}: {msg['content']}\n"
    return context

def save_to_long_term(channel_id: str, post_id: str, text: str):
    """
    Saves a channel post to ChromaDB for long-term context.
    """
    if not text.strip():
        return
        
    try:
        channel_memory.add(
            documents=[text],
            metadatas=[{"channel_id": channel_id, "post_id": post_id}],
            ids=[f"{channel_id}_{post_id}"]
        )
    except Exception as e:
        print(f"Error saving to ChromaDB: {e}")

def get_long_term_context(channel_id: str, query: str, n_results: int = 3) -> str:
    """
    Retrieves similar past posts from a channel based on the current post/query.
    """
    try:
        results = channel_memory.query(
            query_texts=[query],
            n_results=n_results,
            where={"channel_id": channel_id}
        )
        
        if not results['documents'] or not results['documents'][0]:
            return ""
            
        docs = results['documents'][0]
        context = "Схожі попередні пости у цьому каналі:\n- " + "\n- ".join(docs)
        return context
    except Exception as e:
        print(f"Error querying ChromaDB: {e}")
        return ""
