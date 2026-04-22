<div align="center">
  <h1>💩 ShitHead</h1>
  <p><b>МЕГА ПИЗДАТИЙ ШІ-менеджер Керованих Телеграм Ботів (Managed Bots)</b></p>
  
  [![Python](https://img.shields.io/badge/Python-3.11+-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
  [![Aiogram](https://img.shields.io/badge/Aiogram-3.27-blue.svg?logo=telegram&logoColor=white)](https://docs.aiogram.dev/)
  [![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg?logo=docker&logoColor=white)](https://www.docker.com/)
</div>

---

## 🚀 Що це таке?
**ShitHead** — це потужний архітектурний фреймворк та "Майстер-бот" для створення та управління персоналізованими **ШІ-коментаторами** у Telegram. Він використовує нову фічу Telegram — [Managed Bots](https://core.telegram.org/bots/features#managed-bots) (Керовані боти), що дозволяє прямо в чаті створювати нових ботів і налаштовувати їх поведінку без зайвого кодингу.

Кожен створений бот наділений розумом **DeepSeek** (через бібліотеку [OpenDeep](https://github.com/cmpdchtr/opendeep)) та пам'ятає контекст вашого каналу завдяки **ChromaDB**.

## ✨ Головні фічі
- 🤖 **Керовані Боти (Managed Bots):** Створюй нових ботів в один клік прямо через інтерфейс Майстер-бота.
- 🧠 **Інтелектуальні коментарі:** Боти самостійно коментують нові пости у вашому каналі за допомогою DeepSeek.
- 💬 **Взаємодія з аудиторією:** Боти вміють відповідати на реплаї та вести дискусію, запам'ятовуючи короткострокову історію (через JSON).
- 📚 **Довгострокова пам'ять:** Інтеграція з векторною базою **ChromaDB** дозволяє ботам "згадувати" схожі старі пости для максимальної контекстності відповідей.
- ⚙️ **Динамічний системний промпт:** Налаштовуй характер та роль кожного бота командою `/setprompt` (наприклад: *"Ти токсичний дід-інсайд"* або *"Ти життєрадісний кіт"*).
- 🐳 **Docker Ready:** Легкий деплой в один клік.

---

## 🛠 Технологічний стек
- **Мова:** Python 3.11+
- **Telegram API:** [aiogram 3.27+](https://docs.aiogram.dev/)
- **Штучний інтелект:** [OpenDeep](https://github.com/cmpdchtr/opendeep) (швидкий клієнт DeepSeek)
- **Векторна БД:** [ChromaDB](https://www.trychroma.com/) (для довгострокової пам'яті)
- **Реляційна БД:** aiosqlite (асинхронний SQLite для збереження налаштувань ботів)

---

## ⚙️ Встановлення та Запуск

### Крок 1: Клонування та налаштування
```bash
git clone https://github.com/cmpdchtr/ShitHead.git
cd ShitHead
cp .env.example .env
```
Відкрийте файл `.env` та впишіть ваші токени:
- `MASTER_BOT_TOKEN` — токен головного бота, отриманий у [@BotFather](https://t.me/BotFather) (в налаштуваннях бота має бути увімкнений Bot Management Mode).
- `DEEPSEEK_USER_TOKEN` — ваш `userToken` з Local Storage сайту [chat.deepseek.com](https://chat.deepseek.com).

### Крок 2: Запуск (Docker - Рекомендовано)
```bash
docker build -t shithead-bot .

# Запуск з підключенням томів (volumes) для збереження БД та векторної пам'яті:
docker run -d --name shithead \
  --env-file .env \
  -v $(pwd)/chroma_data:/app/chroma_data \
  -v $(pwd)/shithead.db:/app/shithead.db \
  -v $(pwd)/short_term.json:/app/short_term.json \
  shithead-bot
```

### Крок 2 (Альтернатива): Запуск локально
```bash
# Створення та активація віртуального середовища
python3 -m venv venv
source venv/bin/activate

# Встановлення залежностей
pip install -r requirements.txt

# Запуск
python main.py
```

---

## 🎮 Як користуватися

1. **Запусти Майстер-бота:** Знайди свого `MASTER_BOT` у Telegram та напиши йому `/start`.
2. **Створи Керованого бота:** Перейди за згенерованим лінком у повідомленні Майстер-бота (вас перекине на створення бота в BotFather з автоматичною прив'язкою).
3. **Налаштуй характер:** Щойно бот буде створений, Майстер-бот пришле підтвердження. Задай йому характер командою:
   ```text
   /setprompt @GivnoidBot Ти — агресивний коментатор, який ненавидить понеділки. Завжди критикуй пости.
   ```
4. **Додай у канал:** Додай створеного бота (наприклад, @GivnoidBot) в адміністратори свого Telegram-каналу (щоб він бачив нові пости) та в групу обговорень (щоб міг писати коментарі і бачити реплаї).
5. **Насолоджуйся:** Публікуй пости, і твій персоналізований ШІ-посіпака миттєво залишить свій унікальний коментар та буде спілкуватися з підписниками!

---

<div align="center">
  <i>Зроблено з ❤️ (та великою кількістю мату) для Telegram спільноти.</i>
</div>
