import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Download, RefreshCw } from 'lucide-react'
import { useTranslation } from '../contexts/AppSettingsContext'
import { dashboardPath } from '../constants/routes'

const SETTINGS_KEY = 'cropcare-app-settings'

function loadLocalSettings() {
  try {
    const s = localStorage.getItem(SETTINGS_KEY)
    return s ? JSON.parse(s) : {}
  } catch {
    return {}
  }
}

export default function DataManagementSidebar({ collapsed }) {
  const navigate = useNavigate()
  const t = useTranslation()
  const [local, setLocal] = useState(loadLocalSettings)
  
  const defaultLocal = {
    syncFrequency: 'real',
  }
  
  const mergedLocal = { ...defaultLocal, ...local }

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear local cache? This will remove all cached settings.')) {
      localStorage.removeItem(SETTINGS_KEY)
      setLocal({})
    }
  }

  const handleBackupExport = () => {
    navigate(`${dashboardPath('history')}#export`)
  }

  const handleSyncChange = (value) => {
    const next = { ...local, syncFrequency: value }
    setLocal(next)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  }

  return (
    <div className="border-t border-emerald-700/30 pt-4 mt-auto">
      <h3 className={`text-white font-semibold mb-3 px-3 ${collapsed ? 'sr-only' : ''}`}>
        {t('dataManagement')}
      </h3>
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleClearCache}
          title={collapsed ? t('clearCache') : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-white hover:bg-emerald-700/50 transition-colors text-left w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600 ${collapsed ? 'justify-center' : ''}`}
          aria-label={t('clearCache')}
        >
          <Trash2 className="shrink-0 w-5 h-5" aria-hidden="true" />
          <span className={`truncate whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden absolute pointer-events-none' : 'opacity-100'}`}>
            {t('clearCache')}
          </span>
        </button>
        
        <button
          type="button"
          onClick={handleBackupExport}
          title={collapsed ? t('backupExport') : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-white hover:bg-emerald-700/50 transition-colors text-left w-full min-h-[44px] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600 ${collapsed ? 'justify-center' : ''}`}
          aria-label={t('backupExport')}
        >
          <Download className="shrink-0 w-5 h-5" aria-hidden="true" />
          <span className={`truncate whitespace-nowrap transition-opacity duration-200 ${collapsed ? 'opacity-0 w-0 overflow-hidden absolute pointer-events-none' : 'opacity-100'}`}>
            {t('backupExport')}
          </span>
        </button>
        
        <div className={`px-3 py-2.5 ${collapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center gap-3 ${collapsed ? 'flex-col' : ''}`}>
            <RefreshCw className={`shrink-0 w-5 h-5 text-white ${collapsed ? '' : 'hidden'}`} aria-hidden="true" />
            <span className={`text-white text-sm ${collapsed ? 'sr-only' : ''}`}>{t('sync')}:</span>
            <select
              value={mergedLocal.syncFrequency}
              onChange={(e) => handleSyncChange(e.target.value)}
              className={`rounded-lg border border-emerald-500/50 bg-emerald-700/30 text-white text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-emerald-600 ${collapsed ? 'w-full' : ''}`}
              title={collapsed ? `${t('sync')}: ${mergedLocal.syncFrequency}` : undefined}
              aria-label={t('sync')}
              style={{ colorScheme: 'dark' }}
            >
              <option value="real">{t('realTime')}</option>
              <option value="hourly">{t('hourly')}</option>
              <option value="daily">{t('daily')}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
