import { Link } from 'react-router-dom'
import { useTranslation } from '../contexts/AppSettingsContext'

import { memo } from 'react'
import { dashboardPath } from '../constants/routes'
import { SUPPORT_EMAIL } from '../constants/support'

function MainFooter() {
  const t = useTranslation()
  return (
    <footer className="bg-black text-slate-300 mt-auto py-8 px-4 sm:px-6 lg:px-8 glass-footer-border shrink-0" role="contentinfo" aria-label="Main footer" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-6">
          <div>
            <h3 className="text-white font-semibold mb-3">{t('footerAbout')}</h3>
            <p className="text-sm text-slate-400 mb-2">{t('footerCompany')}</p>
            <p className="text-sm text-slate-400 mb-3">{t('footerMission')}</p>
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm">
              <Link to={dashboardPath('terms')} className="text-emerald-400 hover:text-emerald-300">
                {t('termsOfService')}
              </Link>
              <span className="text-slate-500">|</span>
              <Link to={dashboardPath('privacy')} className="text-emerald-400 hover:text-emerald-300">
                {t('privacyPolicy')}
              </Link>
              <span className="text-slate-500">|</span>
              <Link to={`${dashboardPath('privacy')}#cookies`} className="text-emerald-400 hover:text-emerald-300">
                {t('cookiePolicy')}
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">{t('contactUs')}</h3>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-400 hover:text-emerald-300">{SUPPORT_EMAIL}</a></li>
              <li>Phone: +254 115-199-770</li>
              <li>Support: Mon–Sat, 9AM–6PM EST</li>
              <li>Business: <a href="mailto:partnerships@aicropcare.com" className="text-emerald-400 hover:text-emerald-300">partnerships@aicropcare.com</a></li>
            </ul>
            <Link to={dashboardPath('feedback')} className="inline-block mt-2 text-sm text-emerald-400 hover:text-emerald-300 hover:underline">
              {t('contactForm')}
            </Link>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">{t('followUs')}</h3>
            <div className="flex flex-wrap gap-3 mb-4">
              <a href="#" className="text-emerald-400 hover:text-emerald-300 transition-colors" aria-label="Twitter">Twitter</a>
              <a href="#" className="text-emerald-400 hover:text-emerald-300 transition-colors" aria-label="LinkedIn">LinkedIn</a>
              <a href="#" className="text-emerald-400 hover:text-emerald-300 transition-colors" aria-label="Facebook">Facebook</a>
              <a href="#" className="text-emerald-400 hover:text-emerald-300 transition-colors" aria-label="Instagram">Instagram</a>
            </div>
            <div className="mb-3">
              <Link to={dashboardPath('accessibility')} className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline">
                {t('accessibilityStatement')}
              </Link>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                {t('appStore')}
              </a>
              <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                {t('googlePlay')}
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">{t('stayUpdated')}</h3>
            <p className="text-sm text-slate-400 mb-2">{t('newsletter')}</p>
            <a href="mailto:newsletter@aicropcare.com" className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline">
              {t('signUpLink')}
            </a>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <div className="text-center text-sm text-slate-400 space-y-1">
            <p>{t('copyright')}</p>
            <p className="text-xs">Intellectual property of AI-Powered CropCare. Trademarks where applicable.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default memo(MainFooter)
