import { Link } from 'react-router-dom'
import { useTranslation } from '../contexts/AppSettingsContext'
import { dashboardPath } from '../constants/routes'
import Testimonials from '../components/Testimonials'

const APP_VERSION = '1.0.0'

export default function About() {
  const t = useTranslation()
  return (
    <div className="space-y-0">
      <section className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-slate-800 dark:to-slate-900 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">{t('aboutTitle')}</h1>
              <h2 className="text-2xl md:text-3xl font-semibold text-emerald-600 dark:text-emerald-400 mb-4">Mission: Democratizing Tech</h2>
              <p className="text-lg text-slate-700 dark:text-slate-300 mb-4">
                We believe that cutting-edge AI technology should be accessible to every farmer, regardless of location or resources. Our mission is to democratize agricultural technology, making professional crop diagnosis and treatment recommendations available to smallholder farmers across Africa and beyond.
              </p>
              <p className="text-lg text-slate-700 dark:text-slate-300">
                By combining advanced machine learning with simple, intuitive mobile interfaces, we're empowering farmers to protect their harvests and increase yields—all from their smartphones.
              </p>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&h=600&fit=crop&q=80"
                alt="Farmers collaborating in a field"
                className="rounded-2xl shadow-2xl"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23d1fae5" width="800" height="600"/%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="24" fill="%2310b981"%3EFarmers Collaborating%3C/text%3E%3C/svg%3E'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* Content Sections */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('appInformation')}</h2>
          <ul className="space-y-2 text-slate-600 dark:text-slate-300 text-sm">
            <li><strong>App version:</strong> {APP_VERSION}</li>
            <li><strong>Description & mission:</strong> AI-Powered CropCare helps farmers and growers get accurate crop analysis, actionable recommendations, and reliable insights to solve plant health problems. Our mission is to make AI-driven agronomy accessible for everyone.</li>
            <li><strong>Developer/Creator:</strong> AI-Powered CropCare Team</li>
            <li><strong>Copyright:</strong> © 2024–2026 AI-Powered CropCare. All Rights Reserved.</li>
          </ul>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('legal')}</h2>
          <ul className="space-y-2 text-slate-600 dark:text-slate-300 text-sm">
            <li><Link to={dashboardPath('terms')} className="text-emerald-600 dark:text-emerald-400 hover:underline">{t('termsOfService')}</Link></li>
            <li><Link to={dashboardPath('privacy')} className="text-emerald-600 dark:text-emerald-400 hover:underline">{t('privacyPolicy')}</Link></li>
            <li><strong>Data handling:</strong> We store your account data and analysis history securely. Plant images and results are used only to provide the service and improve our models with your consent (see Settings).</li>
          </ul>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('recognition')}</h2>
          <ul className="space-y-2 text-slate-600 dark:text-slate-300 text-sm">
            <li><strong>Awards/Certifications:</strong> — (Add when available)</li>
            <li><strong>Partners & collaborators:</strong> Agricultural research partners, extension services.</li>
            <li><strong>Technologies used:</strong> AI/ML crop analysis models, OpenAI for recommendations and insights, Supabase (Authentication, Postgres, Storage), React, Node.js/Express.</li>
          </ul>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('rateTheApp')}</h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm mb-3">Enjoying CropCare? Leave a review to help other growers discover us.</p>
          <div className="flex flex-wrap gap-3">
            <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-all hover:scale-105">
              App Store
            </a>
            <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-all hover:scale-105">
              Google Play
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
