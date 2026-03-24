import { useEffect, useState, useRef, memo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePrefetch } from '../contexts/PrefetchContext'
import { useTranslation } from '../contexts/AppSettingsContext'
import { getAnalysisHistory } from '../lib/analysisStore'
import { exportAnalyses, getSummaryStats } from '../lib/exportHelpers'
import DataVisualization from '../components/DataVisualization'
import { useDelayedLoading } from '../hooks/useDelayedLoading'
import { formatTimestamp } from '../lib/formatDate'

function HistoryPage() {
  const t = useTranslation()
  const { user } = useAuth()
  const { getCachedHistory, setCachedHistory } = usePrefetch()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const showLoadingIndicator = useDelayedLoading(loading && history.length === 0, 1000)
  const [format, setFormat] = useState('pdf')
  const [includeImages, setIncludeImages] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [delivery, setDelivery] = useState('download')
  const [exportMessage, setExportMessage] = useState('')
  const [exporting, setExporting] = useState(false)
  const exportSectionRef = useRef(null)

  useEffect(() => {
    if (!user?.uid) return
    const cached = getCachedHistory(user.uid)
    if (Array.isArray(cached)) {
      setHistory(cached)
      setLoading(false)
    }
    getAnalysisHistory(user.uid).then((list) => {
      setCachedHistory(user.uid, list)
      setHistory(list)
    }).finally(() => setLoading(false))
  }, [user?.uid, getCachedHistory, setCachedHistory])

  // Scroll to export section when opened via "Backup & export" (#export)
  useEffect(() => {
    if (window.location.hash !== '#export') return
    const el = exportSectionRef.current
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [loading])

  const stats = getSummaryStats(history)

  const handleExport = async () => {
    setExportMessage('')
    setExporting(true)
    try {
      await exportAnalyses(history, { format, includeImages, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      if (delivery === 'download') {
        setExportMessage(t('exportCompleteDownload'))
      } else if (delivery === 'email') {
        setExportMessage(t('exportCompleteEmail'))
      } else if (delivery === 'print') {
        setExportMessage(t('exportCompletePrint'))
      }
    } catch (err) {
      setExportMessage(err?.message || 'Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  if (showLoadingIndicator) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">{t('loadingHistory')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('history')}</h1>

      {/* Data Visualization */}
      {history.length > 0 && (
        <section className="bg-transparent">
          <DataVisualization history={history} />
        </section>
      )}

      <section ref={exportSectionRef} id="export" className="glass-card dark:glass-card-dark rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('exportOptions')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{t('format')}</span>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="mt-1 block w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 backdrop-blur-sm">
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="excel">Excel (CSV)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={includeImages} onChange={(e) => setIncludeImages(e.target.checked)} className="rounded border-slate-300" />
            <span className="text-slate-700 dark:text-slate-300 text-sm">{t('includeImages')}</span>
          </label>
          <label className="block">
            <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{t('dateRangeFrom')}</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 block w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 backdrop-blur-sm" />
          </label>
          <label className="block">
            <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{t('dateRangeTo')}</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 block w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 backdrop-blur-sm" />
          </label>
        </div>
        <div className="mt-4">
          <span className="text-slate-700 dark:text-slate-300 text-sm font-medium block mb-2">{t('delivery')}</span>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2"><input type="radio" name="delivery" value="download" checked={delivery === 'download'} onChange={() => setDelivery('download')} /> {t('downloadToDevice')}</label>
            <label className="inline-flex items-center gap-2"><input type="radio" name="delivery" value="email" checked={delivery === 'email'} onChange={() => setDelivery('email')} /> {t('sendToEmail')}</label>
            <label className="inline-flex items-center gap-2"><input type="radio" name="delivery" value="print" checked={delivery === 'print'} onChange={() => setDelivery('print')} /> {t('print')}</label>
          </div>
        </div>
        {exportMessage && <p className={`mt-3 text-sm ${exportMessage.startsWith('Export failed') ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{exportMessage}</p>}
        <button type="button" onClick={handleExport} disabled={!history.length || exporting} className="mt-4 px-6 py-2.5 rounded-lg glass-button text-white font-medium disabled:opacity-50 transition-all">
          {exporting ? '…' : t('exportNow')}
        </button>
      </section>

      {/* Summary statistics */}
      {history.length > 0 && (
        <section className="glass-card dark:glass-card-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t('summaryStatistics')}</h2>
          <ul className="text-slate-600 dark:text-slate-400 text-sm space-y-1">
            <li>{t('totalAnalyses')}: <strong>{stats.total}</strong></li>
            <li>{t('averageAccuracy')}: <strong>{stats.avgAccuracy}%</strong></li>
            <li>{t('averageRecovery')}: <strong>{stats.avgRecovery}%</strong></li>
            {stats.commonIssues.length > 0 && (
              <li>Common themes in recommendations: {stats.commonIssues.slice(0, 3).join('; ')}</li>
            )}
          </ul>
        </section>
      )}

      {/* Data included note */}
      <section className="glass-card dark:glass-card-dark rounded-xl p-4 text-slate-600 dark:text-slate-400 text-sm">
        {t('dataIncludedInExport')}      </section>

      {/* History list */}
      {history.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">{t('noAnalysisYet')}</p>
      ) : (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t('recentAnalyses')}</h2>
          <ul className="space-y-4">
            {history.slice(0, 15).map((item, i) => (
              <li key={item.id || i} className="glass-card dark:glass-card-dark rounded-xl p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">{formatTimestamp(item.timestamp)}</p>
                <p className="mt-1 text-slate-700 dark:text-slate-300">Accuracy: {item.accuracyRate}% · Recovery: {item.recoveryRate}% · Time: {item.timeTaken}s</p>
                {item.recommendations && <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm line-clamp-2">{item.recommendations}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default memo(HistoryPage)
