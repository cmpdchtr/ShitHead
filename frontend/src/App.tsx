import { useState, useEffect } from 'react'
import axios from 'axios'
import { Bot, Settings, RefreshCw, MessageSquare, Shield, Activity, User, Hash, Database, BarChart3, Trash2, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const WebApp = (window as any).Telegram?.WebApp;

// Determine API base URL (in dev it's localhost, in prod it might be same origin or a specific domain)
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:8088/api' 
  : '/api';

interface ManagedBot {
  id: number;
  name: string;
  username: string;
  system_prompt: string;
  probability?: number;
  delay_seconds?: number;
  keywords?: string[];
  ignore_users?: string[];
  about?: string;
  description?: string;
}

interface BotStats {
  comments_posted: number;
  replies_received: number;
  tokens_used: number;
}

export default function App() {
  const [bots, setBots] = useState<ManagedBot[]>([]);
  const [selectedBot, setSelectedBot] = useState<ManagedBot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'identity' | 'prompt' | 'rules' | 'channels' | 'memory' | 'stats'>('prompt');

  // Form states
  const [prompt, setPrompt] = useState('');
  const [probability, setProbability] = useState(100);
  const [delay, setDelay] = useState(0);
  const [keywords, setKeywords] = useState('');
  const [ignoreUsers, setIgnoreUsers] = useState('');
  
  // Identity states
  const [botName, setBotName] = useState('');
  const [botAbout, setBotAbout] = useState('');
  const [botDescription, setBotDescription] = useState('');

  // Channel states
  const [channels, setChannels] = useState<string[]>([]);
  const [newChannelId, setNewChannelId] = useState('');

  // Stats
  const [stats, setStats] = useState<BotStats>({ comments_posted: 0, replies_received: 0, tokens_used: 0 });

  useEffect(() => {
    WebApp?.ready?.();
    WebApp?.expand?.();
    
    // Set theme colors based on Telegram theme
    document.documentElement.style.setProperty('--tg-theme-bg-color', WebApp?.themeParams?.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', WebApp?.themeParams?.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-hint-color', WebApp?.themeParams?.hint_color || '#999999');
    document.documentElement.style.setProperty('--tg-theme-link-color', WebApp?.themeParams?.link_color || '#2481cc');
    document.documentElement.style.setProperty('--tg-theme-button-color', WebApp?.themeParams?.button_color || '#2481cc');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', WebApp?.themeParams?.button_text_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', WebApp?.themeParams?.secondary_bg_color || '#f1f1f1');

    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      const res = await axios.get(`${API_BASE}/bots`);
      setBots(res.data);
      if (res.data.length > 0 && !selectedBot) {
        loadBotDetails(res.data[0].id);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching bots", err);
      setLoading(false);
      if (WebApp?.showAlert) {
        WebApp.showAlert("Помилка завантаження ботів. Перевірте з'єднання з API.");
      } else {
        alert("Помилка завантаження ботів. Перевірте з'єднання з API.");
      }
    }
  };

  const loadBotDetails = async (id: number) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/bots/${id}`);
      const botData = res.data;
      const listBot = bots.find(b => b.id === id);
      
      const fullBot = { ...listBot, ...botData };
      setSelectedBot(fullBot);
      
      setPrompt(botData.system_prompt || '');
      setProbability(botData.probability ?? 100);
      setDelay(botData.delay_seconds ?? 0);
      setKeywords((botData.keywords || []).join(', '));
      setIgnoreUsers((botData.ignore_users || []).join(', '));
      setBotName(botData.name || '');
      setBotAbout(botData.about || '');
      setBotDescription(botData.description || '');

      // Fetch extra info
      fetchStats(id);
      fetchChannels(id);
      
    } catch (err) {
      console.error("Error loading bot details", err);
      if (WebApp?.showAlert) {
        WebApp.showAlert("Помилка завантаження деталей бота.");
      } else {
        alert("Помилка завантаження деталей бота.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (id: number) => {
    try {
      const res = await axios.get(`${API_BASE}/bots/${id}/stats`);
      setStats(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChannels = async (id: number) => {
    try {
      const res = await axios.get(`${API_BASE}/bots/${id}/channels`);
      setChannels(res.data.channels || []);
    } catch (e) {
      console.error(e);
    }
  };

  const addChannel = async () => {
    if (!selectedBot || !newChannelId) return;
    try {
      await axios.post(`${API_BASE}/bots/${selectedBot.id}/channels`, { channel_id: newChannelId });
      setNewChannelId('');
      fetchChannels(selectedBot.id);
    } catch (e) {
      console.error(e);
    }
  };

  const removeChannel = async (channelId: string) => {
    if (!selectedBot) return;
    try {
      await axios.delete(`${API_BASE}/bots/${selectedBot.id}/channels/${channelId}`);
      fetchChannels(selectedBot.id);
    } catch (e) {
      console.error(e);
    }
  };

  const clearMemory = async () => {
    if (!selectedBot) return;
    if (confirm("Ви впевнені, що хочете стерти пам'ять бота для всіх каналів? Це незворотньо!")) {
      try {
        await axios.delete(`${API_BASE}/bots/${selectedBot.id}/memory`);
        if (WebApp?.showAlert) WebApp.showAlert("Пам'ять очищено! 🧹");
        else alert("Пам'ять очищено! 🧹");
      } catch (e) {
        console.error(e);
      }
    }
  };

  const saveIdentity = async () => {
    if (!selectedBot) return;
    setSaving(true);
    try {
      await axios.put(`${API_BASE}/bots/${selectedBot.id}/identity`, { 
        name: botName, about: botAbout, description: botDescription 
      });
      if (WebApp?.showAlert) WebApp.showAlert("Профіль збережено! ✅");
      else alert("Профіль збережено! ✅");
    } catch (err) {
      console.error(err);
      if (WebApp?.showAlert) WebApp.showAlert("Помилка збереження ❌");
      else alert("Помилка збереження ❌");
    } finally {
      setSaving(false);
    }
  };

  const savePrompt = async () => {
    if (!selectedBot) return;
    setSaving(true);
    try {
      await axios.put(`${API_BASE}/bots/${selectedBot.id}/prompt`, { system_prompt: prompt });
      if (WebApp?.showAlert) {
        WebApp.showAlert("Промпт успішно збережено! ✅");
      } else {
        alert("Промпт успішно збережено! ✅");
      }
    } catch (err) {
      console.error(err);
      if (WebApp?.showAlert) {
        WebApp.showAlert("Помилка збереження промпту ❌");
      } else {
        alert("Помилка збереження промпту ❌");
      }
    } finally {
      setSaving(false);
    }
  };

  const saveRules = async () => {
    if (!selectedBot) return;
    setSaving(true);
    try {
      const kws = keywords.split(',').map(k => k.trim()).filter(k => k);
      const igns = ignoreUsers.split(',').map(k => k.trim()).filter(k => k);
      
      await axios.put(`${API_BASE}/bots/${selectedBot.id}/rules`, { 
        probability,
        delay_seconds: delay,
        keywords: JSON.stringify(kws),
        ignore_users: JSON.stringify(igns)
      });
      if (WebApp?.showAlert) {
        WebApp.showAlert("Правила успішно збережено! ✅");
      } else {
        alert("Правила успішно збережено! ✅");
      }
    } catch (err) {
      console.error(err);
      if (WebApp?.showAlert) {
        WebApp.showAlert("Помилка збереження правил ❌");
      } else {
        alert("Помилка збереження правил ❌");
      }
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (text: string) => {
    setPrompt(text);
  };

  const presets = [
    { label: '🎭 Троль', prompt: 'Ти — інтернет-троль. Твоя мета смішно та саркастично коментувати пости, шукати недоліки та іронізувати.' },
    { label: '🧐 Аналітик', prompt: 'Ти — серйозний аналітик. Коментуй пости, розкладаючи їх на факти, цифри та логічні висновки без зайвих емоцій.' },
    { label: '😈 Адвокат Диявола', prompt: 'Ти завжди береш протилежну сторону. Знайди аргументи, чому автор посту не правий, навіть якщо він пише очевидні речі.' },
    { label: '🔥 Хайпбіст', prompt: 'Ти дуже емоційний і використовуєш багато сленгу (база, крінж, імба). Твоя реакція завжди перебільшена.' },
    { label: '🤖 Сухий ШІ', prompt: 'Відповідай максимально коротко, як типовий бот. "Інформацію прийнято", "Зафіксовано", "Статистично ймовірно".' }
  ];

  if (loading && bots.length === 0) {
    return <div className="flex items-center justify-center h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <RefreshCw className="animate-spin w-8 h-8 text-[var(--color-primary)]" />
    </div>;
  }

  if (bots.length === 0) {
    return <div className="p-6 text-center text-[var(--color-text)] bg-[var(--color-bg)] min-h-screen">
      <Bot className="w-16 h-16 mx-auto mb-4 text-[var(--color-hint)]" />
      <h2 className="text-xl font-bold mb-2">Немає ботів</h2>
      <p className="text-[var(--color-hint)]">Спочатку створи бота в Telegram за допомогою команди /start.</p>
    </div>;
  }

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button 
      className={`py-2 px-3 rounded-lg font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap snap-center ${activeTab === id ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-hint)] hover:bg-[var(--color-secondary-bg)]'}`}
      onClick={() => setActiveTab(id)}
    >
      <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[var(--color-secondary-bg)] text-[var(--color-text)] pb-20">
      {/* Header / Bot Selector */}
      <div className="bg-[var(--color-bg)] p-4 shadow-sm mb-4 sticky top-0 z-10">
        <label className="block text-sm font-semibold mb-2 text-[var(--color-hint)] uppercase tracking-wider">Оберіть бота:</label>
        <div className="relative">
          <select 
            className="w-full bg-[var(--color-secondary-bg)] text-[var(--color-text)] border-none rounded-xl p-3 appearance-none font-medium focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
            value={selectedBot?.id || ''}
            onChange={(e) => loadBotDetails(Number(e.target.value))}
          >
            {bots.map(b => (
              <option key={b.id} value={b.id}>@{b.username} ({b.name})</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--color-hint)]">
            <Bot className="w-5 h-5" />
          </div>
        </div>
      </div>

      {loading && <div className="flex justify-center p-8"><RefreshCw className="animate-spin w-6 h-6 text-[var(--color-primary)]" /></div>}

      {!loading && selectedBot && (
        <div className="px-4 max-w-2xl mx-auto">
          
          {/* Scrollable Tabs */}
          <div className="flex overflow-x-auto snap-x space-x-2 mb-6 bg-[var(--color-bg)] p-1 rounded-xl shadow-sm hide-scrollbar">
            <TabButton id="identity" label="Профіль" icon={User} />
            <TabButton id="prompt" label="Промпт" icon={MessageSquare} />
            <TabButton id="rules" label="Правила" icon={Shield} />
            <TabButton id="channels" label="Канали" icon={Hash} />
            <TabButton id="memory" label="Пам'ять" icon={Database} />
            <TabButton id="stats" label="Стата" icon={BarChart3} />
          </div>

          <AnimatePresence mode="wait">
            {/* IDENTITY TAB */}
            {activeTab === 'identity' && (
              <motion.div key="identity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="bg-[var(--color-bg)] p-4 rounded-2xl shadow-sm border border-[var(--color-secondary-bg)] space-y-4">
                  <h3 className="font-bold flex items-center gap-2 mb-2"><User className="w-5 h-5 text-[var(--color-primary)]"/> Ідентичність бота</h3>
                  
                  <div>
                    <label className="block font-semibold mb-1 text-sm text-[var(--color-hint)]">Ім'я (Name)</label>
                    <input type="text" className="w-full bg-[var(--color-secondary-bg)] text-[var(--color-text)] border-none rounded-lg p-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)]" value={botName} onChange={(e)=>setBotName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-sm text-[var(--color-hint)]">Короткий опис (About)</label>
                    <input type="text" className="w-full bg-[var(--color-secondary-bg)] text-[var(--color-text)] border-none rounded-lg p-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)]" value={botAbout} onChange={(e)=>setBotAbout(e.target.value)} maxLength={120} placeholder="До 120 символів"/>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-sm text-[var(--color-hint)]">Опис (Description)</label>
                    <textarea className="w-full bg-[var(--color-secondary-bg)] text-[var(--color-text)] border-none rounded-lg p-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none h-24" value={botDescription} onChange={(e)=>setBotDescription(e.target.value)} placeholder="Текст перед натисканням /start"/>
                  </div>
                  
                  <button className="w-full mt-4 bg-[var(--color-button)] text-[var(--color-button-text)] font-bold py-3 rounded-xl shadow-md hover:opacity-90 flex items-center justify-center gap-2" onClick={saveIdentity} disabled={saving}>
                    {saving ? <RefreshCw className="animate-spin w-5 h-5" /> : 'Зберегти Профіль'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* PROMPT TAB */}
            {activeTab === 'prompt' && (
              <motion.div key="prompt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="bg-[var(--color-bg)] p-4 rounded-2xl shadow-sm border border-[var(--color-secondary-bg)]">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[var(--color-primary)]" />
                    Швидкі пресети
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {presets.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => applyPreset(p.prompt)}
                        className="bg-[var(--color-secondary-bg)] text-[var(--color-text)] px-3 py-1.5 rounded-full text-sm font-medium hover:bg-[var(--color-primary)] hover:text-white transition-colors border border-transparent hover:border-[var(--color-primary-dark)]"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <label className="block font-bold mb-2">Системний Промпт (Характер)</label>
                  <textarea
                    className="w-full bg-[var(--color-secondary-bg)] text-[var(--color-text)] border-none rounded-xl p-4 h-48 focus:ring-2 focus:ring-[var(--color-primary)] outline-none resize-none"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ти — веселий ШІ-коментатор..."
                  />
                  
                  <button 
                    className="w-full mt-4 bg-[var(--color-button)] text-[var(--color-button-text)] font-bold py-3 rounded-xl shadow-md hover:opacity-90 flex items-center justify-center gap-2"
                    onClick={savePrompt}
                    disabled={saving}
                  >
                    {saving ? <RefreshCw className="animate-spin w-5 h-5" /> : 'Зберегти Характер'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* RULES TAB */}
            {activeTab === 'rules' && (
              <motion.div key="rules" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="bg-[var(--color-bg)] p-5 rounded-2xl shadow-sm border border-[var(--color-secondary-bg)] space-y-6">
                  
                  <div>
                    <label className="flex justify-between font-bold mb-2">
                      <span>Ймовірність коментаря</span>
                      <span className="text-[var(--color-primary)]">{probability}%</span>
                    </label>
                    <input type="range" min="0" max="100" value={probability} onChange={(e) => setProbability(Number(e.target.value))} className="w-full accent-[var(--color-primary)]" />
                  </div>

                  <div>
                    <label className="flex justify-between font-bold mb-2">
                      <span>Затримка (секунди)</span>
                      <span className="text-[var(--color-primary)]">{delay} сек</span>
                    </label>
                    <input type="range" min="0" max="300" step="10" value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="w-full accent-[var(--color-primary)]" />
                  </div>

                  <div>
                    <label className="block font-bold mb-2">Тригер-слова (через кому)</label>
                    <input type="text" className="w-full bg-[var(--color-secondary-bg)] text-[var(--color-text)] border-none rounded-xl p-3 focus:ring-2 focus:ring-[var(--color-primary)] outline-none" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="новина, апдейт, терміново" />
                  </div>

                  <div>
                    <label className="block font-bold mb-2">Ігнорувати користувачів</label>
                    <input type="text" className="w-full bg-[var(--color-secondary-bg)] text-[var(--color-text)] border-none rounded-xl p-3 focus:ring-2 focus:ring-[var(--color-primary)] outline-none" value={ignoreUsers} onChange={(e) => setIgnoreUsers(e.target.value)} placeholder="@username1, @username2" />
                  </div>

                  <button className="w-full mt-2 bg-[var(--color-button)] text-[var(--color-button-text)] font-bold py-3 rounded-xl shadow-md hover:opacity-90 flex items-center justify-center gap-2" onClick={saveRules} disabled={saving}>
                    {saving ? <RefreshCw className="animate-spin w-5 h-5" /> : <><Settings className="w-5 h-5"/> Зберегти Правила</>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* CHANNELS TAB */}
            {activeTab === 'channels' && (
              <motion.div key="channels" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="bg-[var(--color-bg)] p-5 rounded-2xl shadow-sm border border-[var(--color-secondary-bg)]">
                  <h3 className="font-bold flex items-center gap-2 mb-4"><Hash className="w-5 h-5 text-[var(--color-primary)]"/> Маршрутизація каналів</h3>
                  <p className="text-sm text-[var(--color-hint)] mb-4">Бот буде зчитувати пости та коментувати лише у вказаних каналах. Додавайте ID каналів (наприклад, -100123456789).</p>
                  
                  <div className="flex gap-2 mb-6">
                    <input type="text" className="flex-1 bg-[var(--color-secondary-bg)] text-[var(--color-text)] border-none rounded-lg p-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="-100..." value={newChannelId} onChange={(e)=>setNewChannelId(e.target.value)} />
                    <button onClick={addChannel} className="bg-[var(--color-primary)] text-white px-4 rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {channels.length === 0 ? <p className="text-center text-[var(--color-hint)] py-4">Жодного каналу не прив'язано</p> : channels.map(c => (
                      <div key={c} className="flex justify-between items-center bg-[var(--color-secondary-bg)] p-3 rounded-lg">
                        <span className="font-mono text-sm">{c}</span>
                        <button onClick={() => removeChannel(c)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* MEMORY TAB */}
            {activeTab === 'memory' && (
              <motion.div key="memory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="bg-[var(--color-bg)] p-5 rounded-2xl shadow-sm border border-[var(--color-secondary-bg)] text-center">
                  <Database className="w-12 h-12 text-[var(--color-primary)] mx-auto mb-3" />
                  <h3 className="font-bold text-lg mb-2">ChromaDB Векторна Пам'ять</h3>
                  <p className="text-sm text-[var(--color-hint)] mb-6">Бот автоматично зберігає всі нові пости з прив'язаних каналів для довгострокового контексту.</p>
                  
                  <button onClick={clearMemory} className="w-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Trash2 className="w-5 h-5" /> Очистити Пам'ять
                  </button>
                  <p className="text-xs text-[var(--color-hint)] mt-3">Увага: це видалить усі вектори контексту для цього бота.</p>
                </div>
              </motion.div>
            )}

            {/* STATS TAB */}
            {activeTab === 'stats' && (
              <motion.div key="stats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--color-bg)] p-5 rounded-2xl shadow-sm border border-[var(--color-secondary-bg)] flex flex-col items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-[var(--color-primary)] mb-2" />
                    <span className="text-3xl font-black">{stats.comments_posted}</span>
                    <span className="text-xs font-semibold text-[var(--color-hint)] uppercase text-center mt-1">Коментарів</span>
                  </div>
                  <div className="bg-[var(--color-bg)] p-5 rounded-2xl shadow-sm border border-[var(--color-secondary-bg)] flex flex-col items-center justify-center">
                    <Activity className="w-8 h-8 text-green-500 mb-2" />
                    <span className="text-3xl font-black">{stats.replies_received}</span>
                    <span className="text-xs font-semibold text-[var(--color-hint)] uppercase text-center mt-1">Відповідей</span>
                  </div>
                  <div className="bg-[var(--color-bg)] p-5 rounded-2xl shadow-sm border border-[var(--color-secondary-bg)] col-span-2 flex flex-col items-center justify-center">
                    <Bot className="w-8 h-8 text-purple-500 mb-2" />
                    <span className="text-4xl font-black">{stats.tokens_used.toLocaleString()}</span>
                    <span className="text-xs font-semibold text-[var(--color-hint)] uppercase mt-1">Витрачено Токенів</span>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  )
}