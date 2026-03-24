import { useEffect, useState, useRef, memo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePrefetch } from '../contexts/PrefetchContext'
import { useTranslation } from '../contexts/AppSettingsContext'
import { getAnalysisHistory } from '../lib/analysisStore'
import { exportAnalyses, exportStatisticsReport } from '../lib/exportHelpers'
import DataVisualization from '../components/DataVisualization'
import { useDelayedLoading } from '../hooks/useDelayedLoading'
import { Download, RefreshCw } from 'lucide-react'

function StatisticsPage() {
  const t = useTranslation()
  const { user } = useAuth()
  const { getCachedHistory, setCachedHistory } = usePrefetch()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState('pdf')
  const [includeImages, setIncludeImages] = useState(true)
  const refreshIntervalRef = useRef(null)
  const showLoadingIndicator = useDelayedLoading(loading && history.length === 0, 1000)

  const loadHistory = async () => {
    if (!user?.uid) return
    try {
      const list = await getAnalysisHistory(user.uid)
      setCachedHistory(user.uid, list)
      setHistory(list)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user?.uid) return
    
    // Load cached data immediately
    const cached = getCachedHistory(user.uid)
    if (Array.isArray(cached)) {
      setHistory(cached)
      setLoading(false)
    }
    
    // Load fresh data
    loadHistory()
    
    // Set up real-time refresh (every 30 seconds)
    refreshIntervalRef.current = setInterval(() => {
      loadHistory()
    }, 30000)
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [user?.uid, getCachedHistory, setCachedHistory])

  const handleRefresh = () => {
    setLoading(true)
    loadHistory()
  }

  const [exportMessage, setExportMessage] = useState('')

  const handleExport = async () => {
    if (!history.length) {
      setExportMessage(t('noDataToExport'))
      setTimeout(() => setExportMessage(''), 3000)
      return
    }
    
    setExporting(true)
    setExportMessage('')
    try {
      if (exportFormat === 'pdf') {
        // For PDF, export a statistics-focused report that mirrors the charts/visualizations.
        await exportStatisticsReport(history, { includeImages })
      } else {
        // Other formats (CSV/JSON/Excel) export raw analysis data.
        await exportAnalyses(history, {
          format: exportFormat,
          includeImages,
        })
      }
      setExportMessage(t('exportCompleteDownload'))
      setTimeout(() => setExportMessage(''), 5000)
    } catch (err) {
      setExportMessage(err?.message || t('exportFailed'))
      setTimeout(() => setExportMessage(''), 5000)
    } finally {
      setExporting(false)
    }
  }

  if (showLoadingIndicator) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">{t('loadingStatistics')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('statistics')}</h1>
          {lastUpdate && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('lastUpdated')}: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg glass-input text-slate-900 dark:text-slate-100 hover:bg-white/40 backdrop-blur-sm transition-colors disabled:opacity-50"
            aria-label={t('refreshData')}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('refresh')}</span>
          </button>
        </div>
      </div>

      {/* Export Section */}
      {history.length > 0 && (
        <div className="glass-card dark:glass-card-dark rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-5 h-5" />
              {t('exportStatistics')}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{t('format')}</span>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="mt-1 block w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 backdrop-blur-sm"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="excel">Excel (CSV)</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={includeImages}
                onChange={(e) => setIncludeImages(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-slate-700 dark:text-slate-300 text-sm">{t('includeImages')}</span>
            </label>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || !history.length}
            className="mt-4 px-6 py-2.5 rounded-lg glass-button text-white font-medium disabled:opacity-50 transition-all"
          >
            {exporting ? t('exporting') : t('exportNow')}
          </button>
          {exportMessage && (
            <p className={`mt-3 text-sm ${exportMessage.includes('failed') || exportMessage.includes('Error') ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
              {exportMessage}
            </p>
          )}
        </div>
      )}

      {/* Real-time Data Visualization */}
      {history.length > 0 ? (
        <div className="space-y-6">
          <div className="bg-blue-500/30 backdrop-blur-sm border border-blue-400/50 dark:border-blue-700 rounded-xl p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" aria-hidden="true"></span>
              {t('realTimeDataSync')}
            </p>
          </div>
          <DataVisualization history={history} />
        </div>
      ) : (
        <div className="glass-card dark:glass-card-dark rounded-xl p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">{t('noStatisticsData')}</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm">{t('runAnalysisToSeeStatistics')}</p>
        </div>
      )}
    </div>
  )
}

export default memo(StatisticsPage)
