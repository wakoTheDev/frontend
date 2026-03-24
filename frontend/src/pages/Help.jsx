import { useState } from 'react'
import { useTranslation } from '../contexts/AppSettingsContext'
import { useAuth } from '../contexts/AuthContext'
import GetStartedModal from '../components/GetStartedModal'
import { SUPPORT_EMAIL } from '../constants/support'

const faqs = [
  { q: 'How do I analyze a plant image?', a: 'Go to the Dashboard, click "Load / Take" to upload or capture a photo, then click "Analyze". Results and recommendations appear in a few seconds.' },
  { q: 'What image format is supported?', a: 'We support common image formats: JPEG, PNG, WebP. For best results use a clear, well-lit photo of the affected leaves or plant.' },
  { q: 'Where is my analysis history stored?', a: 'Your history is stored securely in your account. Use "Download All Analysis History" to export as PDF, CSV, or JSON.' },
  { q: 'How do I contact support?', a: `Use the Feedback page to report issues, or email ${SUPPORT_EMAIL}. Support hours: Mon–Sat, 9AM–6PM EST.` },
]

export default function Help() {
  const t = useTranslation()
  const { user } = useAuth()
  const [openFaq, setOpenFaq] = useState(null)
  const [showGuide, setShowGuide] = useState(false)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('helpTitle')}</h1>

      <section className="glass-card dark:glass-card-dark rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('gettingStarted')}</h2>
          {user && (
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="px-4 py-2 rounded-lg glass-button text-white text-sm font-medium transition-all"
            >
              {t('showGuideAgain')}
            </button>
          )}
        </div>
        <ol className="list-decimal list-inside space-y-2 text-slate-600 dark:text-slate-400 text-sm">
          <li>Sign up or sign in to your account.</li>
          <li>On the Dashboard, use "Load / Take" to choose a plant image or take a photo.</li>
          <li>Click "Analyze" to run the AI analysis.</li>
          <li>Review time taken, accuracy rate, and recovery rate, plus recommendations and insights.</li>
          <li>Export or download your analysis history from the sidebar when needed.</li>
        </ol>
      </section>

      <section className="glass-card dark:glass-card-dark rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t('faqs')}</h2>
        <ul className="space-y-2">
          {faqs.map((faq, i) => (
            <li key={i} className="border-b border-white/20 dark:border-slate-700 last:border-0 pb-2 last:pb-0">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left font-medium text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                {faq.q} {openFaq === i ? '▼' : '▶'}
              </button>
              {openFaq === i && <p className="mt-1 text-slate-600 dark:text-slate-400 text-sm pl-2">{faq.a}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="glass-card dark:glass-card-dark rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t('tutorials')}</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">Step-by-step guides (screenshots available in-app):</p>
        <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 text-sm space-y-1">
          <li>First analysis: Upload → Analyze → Read results</li>
          <li>Exporting your history: Format options and date range</li>
          <li>Managing profile and farm information</li>
        </ul>
      </section>

      <section className="glass-card dark:glass-card-dark rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t('videoGuides')}</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Tutorial videos will be linked here when available.</p>
      </section>

      <section className="glass-card dark:glass-card-dark rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t('troubleshooting')}</h2>
        <ul className="space-y-2 text-slate-600 dark:text-slate-400 text-sm">
          <li><strong>Analysis fails:</strong> Check your internet connection and try a smaller or clearer image.</li>
          <li><strong>Login issues:</strong> Use "Forgot password" or ensure Email/Password sign-in is enabled for your account.</li>
          <li><strong>Export not downloading:</strong> Allow pop-ups/downloads for this site and try again.</li>
        </ul>
      </section>

      <section className="glass-card dark:glass-card-dark rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t('contactCommunity')}</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-2"><strong>Support:</strong> <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">{SUPPORT_EMAIL}</a></p>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-2"><strong>Community forum:</strong> <a href="#" className="text-emerald-600 dark:text-emerald-400 hover:underline">User discussions</a> (link when available)</p>
      </section>
      
      <GetStartedModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        onComplete={() => setShowGuide(false)}
      />
    </div>
  )
}
