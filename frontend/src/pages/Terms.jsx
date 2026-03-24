import { useTranslation } from '../contexts/AppSettingsContext'
import { SUPPORT_EMAIL } from '../constants/support'

export default function Terms() {
  const t = useTranslation()
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="glass-card dark:glass-card-dark rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{t('termsTitle')}</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">Last updated: 2026. By using AI-Powered CropCare you agree to these terms.</p>
        <div className="prose prose-slate dark:prose-invert text-slate-600 dark:text-slate-400 text-sm space-y-4">
          <p>1. Use of the service for crop analysis and recommendations is subject to your compliance with these terms and applicable law.</p>
          <p>2. You retain ownership of your data. We use it to provide the service and, with your consent, to improve our models.</p>
          <p>3. The service is provided &quot;as is&quot;. We do not guarantee accuracy of analysis or outcomes. Always consult qualified agronomists for critical decisions.</p>
          <p>
            4. Contact:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-600 dark:text-emerald-400 hover:underline">{SUPPORT_EMAIL}</a>{' '}
            for questions.
          </p>
        </div>
      </div>
    </div>
  )
}
