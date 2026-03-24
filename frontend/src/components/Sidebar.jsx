import { useState, useEffect, useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSidebar } from '../contexts/SidebarContext'
import { usePrefetch } from '../contexts/PrefetchContext'
import { useTranslation } from '../contexts/AppSettingsContext'
import LogoutModal from './LogoutModal'
import DeleteAccountModal from './DeleteAccountModal'
import DataManagementSidebar from './DataManagementSidebar'
import logoImage from '../assets/logo.png'
import { DASHBOARD_BASE, dashboardPath } from '../constants/routes'

const SIDEBAR_WIDTH_EXPANDED = 256  // w-64
const SIDEBAR_WIDTH_COLLAPSED = 72

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const { collapsed, toggle } = useSidebar()
  const { prefetchProfile, prefetchHistory } = usePrefetch()
  const t = useTranslation()
  const navigate = useNavigate()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)

  const menuItems = useMemo(() => [
    { to: dashboardPath(), icon: '🏠', labelKey: 'home' },
    { to: dashboardPath('about'), icon: 'ℹ️', labelKey: 'about' },
    { to: dashboardPath('help'), icon: '❓', labelKey: 'help' },
    { to: dashboardPath('feedback'), icon: '💬', labelKey: 'feedback' },
    { to: dashboardPath('admin-feedback'), icon: '🛡️', labelKey: 'adminFeedback' },
    { to: dashboardPath('profile'), icon: '👤', labelKey: 'profile' },
    { to: dashboardPath('settings'), icon: '⚙️', labelKey: 'settings' },
    { to: dashboardPath('statistics'), icon: '📊', labelKey: 'statistics' },
    { to: dashboardPath('history'), icon: '📥', labelKey: 'history' },
  ], [])

  const onPrefetchProfile = () => user?.uid && prefetchProfile(user.uid)
  const onPrefetchHistory = () => user?.uid && prefetchHistory(user.uid)
  const handleLogoutClick = () => setLogoutOpen(true)
  const handleLogoutConfirm = async () => {
    setLogoutOpen(false)
    // Sign out will clear all session data and redirect
    await signOut()
    // Force navigation to sign in page
    navigate('/signin', { replace: true, state: { message: 'You have been signed out successfully.' } })
  }

  // Keyboard shortcut: Alt+M toggles menu (avoid Ctrl+B as it may conflict with browser bookmark)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key?.toLowerCase() === 'm') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED

  return (
    <>
      <aside
        className="min-h-screen text-white flex flex-col shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out glass-sidebar"
        style={{ width: `${width}px` }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header with logo and toggle */}
        <div className={`p-3 flex items-center border-b border-emerald-700/50 shrink-0 ${collapsed ? 'justify-between' : 'gap-2'}`}>
          <img 
            src={logoImage} 
            alt="AI-Powered CropCare Logo" 
            className={`shrink-0 block object-cover object-center ${collapsed ? 'w-9 h-9' : 'w-10 h-10'}`}
            aria-hidden="true"
          />
          {!collapsed && <span className="font-semibold text-lg truncate min-w-0">AI-Powered-CropCare</span>}
          <button
            type="button"
            onClick={toggle}
            className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-white hover:bg-emerald-700/50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600 transition-colors ${collapsed ? '' : 'ml-auto'}`}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand menu (Alt+M)' : 'Collapse menu (Alt+M)'}
          >
            <span className="inline-block transition-transform duration-300" aria-hidden="true">
              {collapsed ? '▶' : '◀'}
            </span>
          </button>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto overflow-x-hidden" aria-label="Primary">
          {menuItems.map(({ to, icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === DASHBOARD_BASE}
              title={collapsed ? t(labelKey) : undefined}
              onMouseEnter={to === dashboardPath('profile') ? onPrefetchProfile : (to === dashboardPath('history') || to === dashboardPath('statistics')) ? onPrefetchHistory : undefined}
              onFocus={to === dashboardPath('profile') ? onPrefetchProfile : (to === dashboardPath('history') || to === dashboardPath('statistics')) ? onPrefetchHistory : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all min-h-[44px] ${
                  isActive ? 'bg-white/20 text-white backdrop-blur-sm' : 'text-white hover:bg-white/10'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <span className="shrink-0 w-6 text-center text-lg" aria-hidden="true">{icon}</span>
              <span className={`truncate whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden absolute pointer-events-none' : 'opacity-100'}`}>
                {t(labelKey)}
              </span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleLogoutClick}
            title={collapsed ? t('logout') : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-white hover:bg-white/10 transition-all text-left w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600 ${collapsed ? 'justify-center' : ''}`}
            aria-label={t('logout')}
          >
            <span className="shrink-0 w-6 text-center text-lg" aria-hidden="true">🚪</span>
            <span className={`truncate whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden absolute pointer-events-none' : 'opacity-100'}`}>
              {t('logout')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDeleteAccountOpen(true)}
            title={collapsed ? t('deleteAccount') : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-200 hover:bg-red-500/20 transition-all text-left w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 focus:ring-offset-emerald-600 ${collapsed ? 'justify-center' : ''}`}
            aria-label={t('deleteAccount')}
          >
            <span className="shrink-0 w-6 text-center text-lg" aria-hidden="true">🗑️</span>
            <span className={`truncate whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden absolute pointer-events-none' : 'opacity-100'}`}>
              {t('deleteAccount')}
            </span>
          </button>
        </nav>
        
        {/* Data Management Section */}
        <DataManagementSidebar collapsed={collapsed} />
      </aside>
      <LogoutModal isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={handleLogoutConfirm} />
      <DeleteAccountModal isOpen={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} />
    </>
  )
}
