import { Download, WifiOff, History, BookOpen, CheckCircle } from 'lucide-react'
import { useTranslation } from '../contexts/AppSettingsContext'

const features = [
  {
    icon: WifiOff,
    title: 'Offline Mode',
    description: 'Scan and analyze crops even without internet connection. Perfect for remote farming areas.',
  },
  {
    icon: History,
    title: 'Scan History',
    description: 'Keep track of all your crop analyses with detailed history and treatment records.',
  },
  {
    icon: BookOpen,
    title: 'Treatment Guides',
    description: 'Access comprehensive guides for treating diseases, pests, and nutrient deficiencies.',
  },
]

const screenshots = [
  {
    title: 'Scan Interface',
    image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=400&h=800&fit=crop&q=80',
  },
  {
    title: 'Analysis Results',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=800&fit=crop&q=80',
  },
  {
    title: 'Treatment Plan',
    image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=800&fit=crop&q=80',
  },
]

export default function MobileApp() {
  const t = useTranslation()
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <section className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
          {t('mobileAppTitle')}
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
          Take AI-Powered CropCare analysis anywhere. Download our mobile app for iOS and Android.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 glass-button text-white rounded-lg font-semibold transition-all hover:scale-105"
          >
            <Download size={20} />
            <span>App Store</span>
          </a>
          <a
            href="https://play.google.com/store"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 glass-button text-white rounded-lg font-semibold transition-all hover:scale-105"
          >
            <Download size={20} />
            <span>Google Play</span>
          </a>
        </div>
      </section>

      {/* Offline Mode Highlight */}
      <section className="glass-card dark:glass-card-dark rounded-2xl p-8 md:p-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full mb-4">
              <WifiOff size={20} />
              <span className="font-semibold">Offline Mode</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Work Without Internet
            </h2>
            <p className="text-lg text-slate-700 dark:text-slate-300 mb-4">
              Our mobile app includes offline AI models, so you can scan crops and get instant analysis even in areas with no internet connection.
            </p>
            <ul className="space-y-2">
              {['Offline disease detection', 'Download treatment guides', 'Sync when online'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={20} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=800&fit=crop&q=80"
              alt="Mobile app offline mode"
              className="rounded-2xl shadow-2xl"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="800"%3E%3Crect fill="%23d1fae5" width="600" height="800"/%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="24" fill="%2310b981"%3EMobile App%3C/text%3E%3C/svg%3E'
              }}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div key={index} className="glass-card dark:glass-card-dark rounded-2xl p-6 hover:shadow-xl transition-shadow">
                <div className="bg-emerald-100 dark:bg-emerald-900/40 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                  <Icon className="text-emerald-600 dark:text-emerald-400" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Screenshots Gallery */}
      <section>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center">App Screenshots</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {screenshots.map((screenshot, index) => (
            <div key={index} className="glass-card dark:glass-card-dark rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
              <img
                src={screenshot.image}
                alt={screenshot.title}
                className="w-full h-auto object-cover"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="800"%3E%3Crect fill="%23d1fae5" width="400" height="800"/%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="20" fill="%2310b981"%3E' + screenshot.title + '%3C/text%3E%3C/svg%3E'
                }}
              />
              <div className="p-4">
                <p className="font-semibold text-slate-900 dark:text-white">{screenshot.title}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* App Store Badges */}
      <section className="text-center glass-card dark:glass-card-dark rounded-2xl p-12">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Download Now</h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">Available on iOS and Android</p>
        <div className="flex flex-wrap justify-center gap-6">
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <img
              src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&releaseDate=1609459200"
              alt="Download on the App Store"
              className="h-16 w-auto"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </a>
          <a
            href="https://play.google.com/store"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <img
              src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
              alt="Get it on Google Play"
              className="h-16 w-auto"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </a>
        </div>
      </section>
    </div>
  )
}
