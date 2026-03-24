import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../contexts/AppSettingsContext'
import { Scan, User, Settings } from 'lucide-react'
import logoImage from '../assets/logo.png'
import { dashboardPath } from '../constants/routes'

export default function StickyNavbar() {
  const { user } = useAuth()
  const t = useTranslation()
  const navigate = useNavigate()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleScanNow = () => {
    if (user) {
      navigate(`${dashboardPath()}#scan`)
    } else {
      navigate('/signin')
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-slate-800 shadow-md border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Left: Logo */}
          <Link to={dashboardPath()} className="flex items-center gap-2 shrink-0 min-w-0">
            <img 
              src={logoImage} 
              alt="AI-Powered CropCare Logo" 
              className="w-8 h-8 object-cover object-center block"
            />
            <span className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate hidden sm:inline">AI-Powered-CropCare</span>
          </Link>

          {/* Center: Links */}
          <div className="hidden md:flex items-center gap-6 flex-1 justify-center min-w-0">
            <Link to={dashboardPath()} className="text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors">{t('home')}</Link>
            <Link to={dashboardPath('about')} className="text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors">{t('about')}</Link>
            <Link to={dashboardPath('mobile-app')} className="text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors">{t('mobileAppNav')}</Link>
            <Link to={dashboardPath('help')} className="text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors">{t('helpCenter')}</Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleScanNow}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              <Scan size={18} aria-hidden="true" />
              <span className="hidden sm:inline">{t('scanNow')}</span>
            </button>

            {/* Profile: icon only, top-right after Scan now */}
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((o) => !o)}
                  className="flex items-center justify-center w-11 h-11 rounded-full text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  aria-label={t('profileMenu')}
                >
                  <User className="w-6 h-6 shrink-0" aria-hidden="true" />
                </button>

                {profileMenuOpen && (
                  <div
                    className="absolute right-0 mt-1 w-56 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg py-1 z-[60]"
                    role="menu"
                    aria-label={t('profileMenu')}
                  >
                    <Link
                      to={dashboardPath('profile')}
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-slate-700"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      {t('editProfile')}
                    </Link>
                    <Link
                      to={dashboardPath('settings')}
                      role="menuitem"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-slate-700"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4 shrink-0 opacity-70" aria-hidden="true" />
                      {t('settings')}
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
