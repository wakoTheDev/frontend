import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from '../contexts/AppSettingsContext'
import { SUPPORT_EMAIL } from '../constants/support'

export default function Privacy() {
  const t = useTranslation()
  const location = useLocation()

  useEffect(() => {
    if (location.hash === '#cookies') {
      const el = document.getElementById('cookies')
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    }
  }, [location.hash, location.pathname])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="glass-card dark:glass-card-dark rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{t('privacyTitle')}</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">Last updated: 2026.</p>
        <div className="prose prose-slate dark:prose-invert text-slate-600 dark:text-slate-400 text-sm space-y-6">
          <p>
            We collect account information (email, profile data) and analysis data (images, results) to provide the
            service. Data is stored securely. We do not sell your personal data. You can request deletion by
            contacting{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">{SUPPORT_EMAIL}</a>.
          </p>

          <section id="cookies" className="scroll-mt-24 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t('cookiePolicy')}</h2>
            <p>
              We use essential cookies for authentication and preferences. You can control cookies in your browser;
              disabling them may limit sign-in or saved settings.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
