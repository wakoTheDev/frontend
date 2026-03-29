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

const SIDEBAR_WIDTH_EXPANDED = 256
const SIDEBAR_WIDTH_COLLAPSED = 72

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const { collapsed, toggle } = useSidebar()
  const { prefetchProfile, prefetchHistory } = usePrefetch()
  const t = useTranslation()
  const navigate = useNavigate()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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
    await signOut()
    navigate('/signin', { replace: true, state: { message: 'You have been signed out successfully.' } })
  }

  // Close mobile sidebar when route changes
  const handleMobileNavClick = () => {
    setMobileOpen(false)
  }

  // Keyboard shortcut: Alt+M toggles menu
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

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED

  // Hamburger icon (3 lines)
  const HamburgerIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )

  // Close icon (X)
  const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )

  const SidebarContent = ({ isMobile = false }) => (
    <aside
      className="h-full text-white flex flex-col overflow-hidden glass-sidebar"
      style={isMobile ? { width: '256px' } : { width: `${width}px` }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header with logo and toggle */}
      <div className={`p-3 flex items-center border-b border-emerald-700/50 shrink-0 ${
        isMobile ? 'gap-2' : collapsed ? 'justify-between' : 'gap-2'
      }`}>
        <img
          src={logoImage}
          alt="AI-Powered CropCare Logo"
          className={`shrink-0 block object-cover object-center ${
            !isMobile && collapsed ? 'w-9 h-9' : 'w-10 h-10'
          }`}
          aria-hidden="true"
        />
        <span className="font-semibold text-lg truncate min-w-0">AI-Powered-CropCare</span>

        {/* Desktop collapse button */}
        {!isMobile && (
          <button
            type="button"
            onClick={toggle}
            className="shrink-0 ml-auto w-9 h-9 flex items-center justify-center rounded-lg text-white hover:bg-emerald-700/50 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand menu (Alt+M)' : 'Collapse menu (Alt+M)'}
          >
            <span className="inline-block transition-transform duration-300" aria-hidden="true">
              {collapsed ? '▶' : '◀'}
            </span>
          </button>
        )}

        {/* Mobile close button */}
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="shrink-0 ml-auto w-9 h-9 flex items-center justify-center rounded-lg text-white hover:bg-emerald-700/50 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto overflow-x-hidden" aria-label="Primary">
        {menuItems.map(({ to, icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end={to === DASHBOARD_BASE}
            title={!isMobile && collapsed ? t(labelKey) : undefined}
            onClick={isMobile ? handleMobileNavClick : undefined}
            onMouseEnter={to === dashboardPath('profile') ? onPrefetchProfile : (to === dashboardPath('history') || to === dashboardPath('statistics')) ? onPrefetchHistory : undefined}
            onFocus={to === dashboardPath('profile') ? onPrefetchProfile : (to === dashboardPath('history') || to === dashboardPath('statistics')) ? onPrefetchHistory : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all min-h-[44px] ${
                isActive ? 'bg-white/20 text-white backdrop-blur-sm' : 'text-white hover:bg-white/10'
              } ${!isMobile && collapsed ? 'justify-center' : ''}`
            }
          >
            <span className="shrink-0 w-6 text-center text-lg" aria-hidden="true">{icon}</span>
            <span className={`truncate whitespace-nowrap transition-opacity duration-200 ${
              !isMobile && collapsed
                ? 'opacity-0 w-0 overflow-hidden absolute pointer-events-none'
                : 'opacity-100'
            }`}>
              {t(labelKey)}
            </span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => { handleLogoutClick(); if (isMobile) setMobileOpen(false) }}
          title={!isMobile && collapsed ? t('logout') : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-white hover:bg-white/10 transition-all text-left w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-white ${
            !isMobile && collapsed ? 'justify-center' : ''
          }`}
          aria-label={t('logout')}
        >
          <span className="shrink-0 w-6 text-center text-lg" aria-hidden="true">🚪</span>
          <span className={`truncate whitespace-nowrap transition-opacity duration-200 ${
            !isMobile && collapsed
              ? 'opacity-0 w-0 overflow-hidden absolute pointer-events-none'
              : 'opacity-100'
          }`}>
            {t('logout')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setDeleteAccountOpen(true); if (isMobile) setMobileOpen(false) }}
          title={!isMobile && collapsed ? t('deleteAccount') : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-200 hover:bg-red-500/20 transition-all text-left w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-red-300 ${
            !isMobile && collapsed ? 'justify-center' : ''
          }`}
          aria-label={t('deleteAccount')}
        >
          <span className="shrink-0 w-6 text-center text-lg" aria-hidden="true">🗑️</span>
          <span className={`truncate whitespace-nowrap transition-opacity duration-200 ${
            !isMobile && collapsed
              ? 'opacity-0 w-0 overflow-hidden absolute pointer-events-none'
              : 'opacity-100'
          }`}>
            {t('deleteAccount')}
          </span>
        </button>
      </nav>

      <DataManagementSidebar collapsed={!isMobile && collapsed} />
    </aside>
  )

  return (
    <>
      {/* ===== MOBILE HAMBURGER BUTTON (top left, only on mobile) ===== */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-lg glass-sidebar text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Open menu"
      >
        <HamburgerIcon />
      </button>

      {/* ===== MOBILE OVERLAY ===== */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ===== MOBILE SIDEBAR (slides in from left) ===== */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent isMobile={true} />
      </div>

      {/* ===== DESKTOP SIDEBAR (always visible on md+) ===== */}
      <div
        className="hidden md:block min-h-screen shrink-0 transition-[width] duration-300 ease-in-out"
        style={{ width: `${width}px` }}
      >
        <SidebarContent isMobile={false} />
      </div>

      <LogoutModal isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={handleLogoutConfirm} />
      <DeleteAccountModal isOpen={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} />
    </>
  )
}