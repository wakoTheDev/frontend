import { useState, useRef } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { useTranslation } from '../contexts/AppSettingsContext'
import { useAuth } from '../contexts/AuthContext'
import { getOfflineAnalysisCache, requestChat } from '../lib/api'
import { getCurrentWeather, getWeatherForecast } from '../lib/weather'
import { getUserProfile } from '../lib/supabase'

export default function ChatbotWidget() {
  const t = useTranslation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi! I am your CropCare assistant. Ask me anything about your crop analysis, diseases, treatments, or how to use this dashboard.',
    },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const listRef = useRef(null)

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }

  const handleToggle = () => {
    setOpen((prev) => !prev)
    setError(null)
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const question = input.trim()
    if (!question || loading) return

    setError(null)
    setLoading(true)

    // Build next history (include this new user message) for the backend
    const nextMessages = [...messages, { role: 'user', content: question }]
    setMessages(nextMessages)
    setInput('')

    // Try to pass latest analysis context if available (offline cache)
    const context = getOfflineAnalysisCache() || {}

    // If the question is about weather/forecast, try to attach live weather data
    const isWeatherQuestion = /weather|forecast|rain|temperature|humidity|wind/i.test(question)
    if (isWeatherQuestion && user?.uid) {
      try {
        const profile = await getUserProfile(user.uid)
        const loc = profile?.location
        if (loc?.latitude && loc?.longitude) {
          const current = await getCurrentWeather(loc.latitude, loc.longitude)
          const forecast = await getWeatherForecast(loc.latitude, loc.longitude)
          let forecastSummary = ''
          if (Array.isArray(forecast) && forecast.length) {
            forecastSummary = forecast
              .slice(0, 3)
              .map(
                (f) =>
                  `${f.date.toLocaleDateString()} - ${f.condition} ${f.temperature}°C`
              )
              .join('; ')
          }
          context.weather = {
            ...current,
            forecastSummary,
          }
        }
      } catch (weatherErr) {
        console.warn('Chatbot weather lookup failed:', weatherErr)
      }
    }

    // Convert recent conversation into compact history for the backend (avoid very long prompts)
    const history = nextMessages
      .filter((m) => m && typeof m.content === 'string')
      .slice(-10)
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }))

    try {
      const res = await requestChat(question, context, history)
      const answer = res.answer || res.text || 'Sorry, I could not generate a response.'
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }])
    } catch (err) {
      setError(err.message || 'Failed to get a response. Please try again.')
    } finally {
      setLoading(false)
      setTimeout(scrollToBottom, 50)
    }
  }

  return (
    <>
      {/* Floating chat button bottom-right */}
      <button
        type="button"
        onClick={handleToggle}
        className="fixed z-40 bottom-5 right-5 md:bottom-6 md:right-6 rounded-full bg-emerald-600 text-white shadow-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-transparent p-3 md:p-4"
        aria-label="Open CropCare assistant chat"
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed z-40 bottom-20 right-4 md:right-6 w-[90vw] max-w-sm sm:max-w-md">
          <div className="glass-modal dark:glass-modal-dark rounded-2xl shadow-2xl border border-emerald-500/60 overflow-hidden flex flex-col max-h-[70vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 dark:border-slate-700/60 bg-emerald-600/90 dark:bg-emerald-700/90">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-white" />
                <span className="text-sm font-semibold text-white">CropCare Assistant</span>
              </div>
              <button
                type="button"
                onClick={handleToggle}
                className="text-white/80 hover:text-white"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>

            <div
              ref={listRef}
              className="flex-1 px-3 py-2 space-y-2 overflow-y-auto custom-scrollbar bg-white/70 dark:bg-slate-900/80"
            >
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {error && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/40 border border-red-300/60 dark:border-red-700/80 rounded-lg px-2 py-1">
                  {error}
                </p>
              )}
              {loading && (
                <p className="text-xs text-slate-500 italic px-2 py-1">Thinking…</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-slate-200/70 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/90 px-3 py-2 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your crop or analysis..."
                className="flex-1 rounded-full px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white p-2 disabled:opacity-50 hover:bg-emerald-700"
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

