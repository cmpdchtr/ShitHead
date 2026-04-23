import { useState, useEffect } from 'react'
import WebApp from '@twa-dev/sdk'
import axios from 'axios'
import { Bot, Settings, RefreshCw, MessageSquare, Shield, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Determine API base URL (in dev it's localhost, in prod it might be same origin or a specific domain)
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
  ? 'http://localhost:8000/api' 
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
}

export default function App() {
  const [bots, setBots] = useState<ManagedBot[]>([]);
  const [selectedBot, setSelectedBot] = useState<ManagedBot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'rules' | 'memory'>('prompt');

  // Form states
  const [prompt, setPrompt] = useState('');
  const [probability, setProbability] = useState(100);
  const [delay, setDelay] = useState(0);
  const [keywords, setKeywords] = useState('');
  const [ignoreUsers, setIgnoreUsers] = useState('');

  useEffect(() => {
    WebApp.ready();
    WebApp.expand();
    
    // Set theme colors based on Telegram theme
    document.documentElement.style.setProperty('--tg-theme-bg-color', WebApp.themeParams.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', WebApp.themeParams.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-hint-color', WebApp.themeParams.hint_color || '#999999');
    document.documentElement.style.setProperty('--tg-theme-link-color', WebApp.themeParams.link_color || '#2481cc');
    document.documentElement.style.setProperty('--tg-theme-button-color', WebApp.themeParams.button_color || '#2481cc');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', WebApp.themeParams.button_text_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', WebApp.themeParams.secondary_bg_color || '#f1f1f1');

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
      WebApp.showAlert("Помилка завантаження ботів. Перевірте з'єднання з API.");
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
      
    } catch (err) {
      console.error("Error loading bot details", err);
      WebApp.showAlert("Помилка завантаження деталей бота.");
    } finally {
      setLoading(false);
    }
  };

  const savePrompt = async () => {
    if (!selectedBot) return;
    setSaving(true);
    try {
      await axios.put(`${API_BASE}/bots/${selectedBot.id}/prompt`, { system_prompt: prompt });
      WebApp.showAlert("Промпт успішно збережено! ✅");
    } catch (err) {
      console.error(err);
      WebApp.showAlert("Помилка збереження промпту ❌");
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
      WebApp.showAlert("Правила успішно збережено! ✅");
    } catch (err) {
      console.error(err);
      WebApp.showAlert("Помилка збереження правил ❌");
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
        <div className="px-4">
          
          {/* Tabs */}
          <div className="flex space-x-2 mb-6 bg-[var(--color-bg)] p-1 rounded-xl shadow-sm">
            <button 
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${activeTab === 'prompt' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-hint)] hover:bg-[var(--color-secondary-bg)]'}`}
              onClick={() => setActiveTab('prompt')}
            >
              <MessageSquare className="w-4 h-4" /> Промпт
            </button>
            <button 
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${activeTab === 'rules' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-hint)] hover:bg-[var(--color-secondary-bg)]'}`}
              onClick={() => setActiveTab('rules')}
            >
              <Shield className="w-4 h-4" /> Правила
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* PROMPT TAB */}
            {activeTab === 'prompt' && (
              <motion.div 
                key="prompt"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
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
                    className="w-full mt-4 bg-[var(--color-button)] text-[var(--color-button-text)] font-bold py-3 rounded-xl shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
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
              <motion.div 
                key="rules"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-[var(--color-bg)] p-5 rounded-2xl shadow-sm border border-[var(--color-secondary-bg)] space-y-6">
                  
                  <div>
                    <label className="flex justify-between font-bold mb-2">
                      <span>Ймовірність коментаря</span>
                      <span className="text-[var(--color-primary)]">{probability}%</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={probability} 
                      onChange={(e) => setProbability(Number(e.target.value))}
                      className="w-full accent-[var(--color-primary)]"
                    />
                    <p className="text-xs text-[var(--color-hint)] mt-1">Як часто бот буде реагувати на нові пости у відсотках.</p>
                  </div>

                  <div>
                    <label className="flex justify-between font-bold mb-2">
                      <span>Затримка (секунди)</span>
                      <span className="text-[var(--color-primary)]">{delay} сек</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" max="300" step="10"
                      value={delay} 
                      onChange={(e) => setDelay(Number(e.target.value))}
                      className="w-full accent-[var(--color-primary)]"
                    />
                    <p className="text-xs text-[var(--color-hint)] mt-1">Час очікування перед публікацією коментаря для імітації живої людини.</p>
                  </div>

                  <div>
                    <label className="block font-bold mb-2">Тригер-слова (через кому)</label>
                    <input
                      type="text"
                      className="w-full bg-[var(--color-secondary-bg)] text-[var(--color-text)] border-none rounded-xl p-3 focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="новина, апдейт, терміново"
                    />
                    <p className="text-xs text-[var(--color-hint)] mt-1">Якщо вказані, бот коментуватиме лише пости з цими словами. Залиште порожнім для всіх постів.</p>
                  </div>

                  <div>
                    <label className="block font-bold mb-2">Ігнорувати користувачів (через кому)</label>
                    <input
                      type="text"
                      className="w-full bg-[var(--color-secondary-bg)] text-[var(--color-text)] border-none rounded-xl p-3 focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                      value={ignoreUsers}
                      onChange={(e) => setIgnoreUsers(e.target.value)}
                      placeholder="@username1, @username2"
                    />
                  </div>

                  <button 
                    className="w-full mt-2 bg-[var(--color-button)] text-[var(--color-button-text)] font-bold py-3 rounded-xl shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                    onClick={saveRules}
                    disabled={saving}
                  >
                    {saving ? <RefreshCw className="animate-spin w-5 h-5" /> : <><Settings className="w-5 h-5"/> Зберегти Правила</>}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}
    </div>
  )
}
