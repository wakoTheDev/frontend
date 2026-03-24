import { useEffect, useState } from 'react'
import { useTranslation } from '../contexts/AppSettingsContext'
import { formatTimestamp } from '../lib/formatDate'
import RecommendationsCard from './RecommendationsCard'
import ContentModal from './ContentModal'

export default function SecondaryInsightsFrame({
  recommendations,
  insights,
  history,
  accuracyRate,
  recoveryRate,
  onLoadHistory,
  onExportPDF,
}) {
  const t = useTranslation()
  const [openModal, setOpenModal] = useState(null) // 'recommendations', 'history', 'insights', or null

  useEffect(() => {
    onLoadHistory?.()
  }, [onLoadHistory])

  return (
    <section
      className="glass-modal dark:glass-modal-dark rounded-2xl p-6 flex flex-col"
      aria-labelledby="secondary-insights-heading"
    >
      <h2 id="secondary-insights-heading" className="sr-only">
        {t('secondaryInsights')}
      </h2>

      <div className="space-y-6 flex-1">
        {/* Recommendations */}
        <div>
          <button
            type="button"
            onClick={() => setOpenModal('recommendations')}
            className="w-full text-left"
          >
            <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2">
              {t('recommendations')}
              <span className="text-xs text-slate-500 dark:text-slate-400">(Click to expand)</span>
            </h3>
          </button>
          <div className="cursor-pointer" onClick={() => setOpenModal('recommendations')}>
            <RecommendationsCard
              recommendations={recommendations}
              accuracyRate={accuracyRate}
              recoveryRate={recoveryRate}
            />
          </div>
        </div>

        {/* Powerful Insights */}
        <div>
          <button
            type="button"
            onClick={() => setOpenModal('insights')}
            className="w-full text-left"
          >
            <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2">
              {t('powerfulInsights')}
              <span className="text-xs text-slate-500 dark:text-slate-400">(Click to expand)</span>
            </h3>
          </button>
          <div
            className="glass-input dark:glass-input-dark rounded-xl p-4 min-h-[80px] text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all"
            onClick={() => setOpenModal('insights')}
          >
            {insights || t('runAnalysisToSeeInsights')}
          </div>
        </div>

        {/* Analysis History – moved below Powerful Insights */}
        <div>
          <button
            type="button"
            onClick={() => setOpenModal('history')}
            className="w-full text-left"
          >
            <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-2 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-2">
              {t('analysisHistory')}
              <span className="text-xs text-slate-500 dark:text-slate-400">(Click to expand)</span>
            </h3>
          </button>
          <div
            className="glass-input dark:glass-input-dark rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all"
            onClick={() => setOpenModal('history')}
          >
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {history.length === 0 ? (
                <li className="text-slate-500 dark:text-slate-400 text-sm">{t('noHistoryYetShort')}</li>
              ) : (
                history.slice(0, 10).map((item, i) => (
                  <li key={item.id || i} className="text-sm text-slate-600 dark:text-slate-300">
                    {formatTimestamp(item.timestamp)} — {t('accShort')}: {item.accuracyRate}%
                    {item.cropType ? ` — ${item.cropType}` : ''}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Export */}
        <div>
          <h3 className="text-slate-800 dark:text-slate-100 font-semibold mb-2">
            {t('exportPDF')}
          </h3>
          <button
            type="button"
            onClick={onExportPDF}
            className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
          >
            {t('exportPDF')}
          </button>
        </div>
      </div>

      {/* Modals */}
      <ContentModal
        isOpen={openModal === 'recommendations'}
        onClose={() => setOpenModal(null)}
        title={t('recommendations')}
      >
        <div className="space-y-6">
          <RecommendationsCard
            recommendations={recommendations}
            accuracyRate={accuracyRate}
            recoveryRate={recoveryRate}
          />
        </div>
      </ContentModal>

      <ContentModal
        isOpen={openModal === 'history'}
        onClose={() => setOpenModal(null)}
        title={t('analysisHistory')}
      >
        <div className="space-y-4 md:space-y-6">
          {history.length === 0 ? (
            <p className="text-slate-700 dark:text-slate-300 text-center py-12 md:py-16 font-semibold text-lg">{t('noHistoryYetShort')}</p>
          ) : (
            <ul className="space-y-4 md:space-y-5">
              {history.map((item, i) => (
                <li
                  key={item.id || i}
                  className="glass-input dark:glass-input-dark rounded-xl p-5 md:p-6 bg-white/60 dark:bg-slate-800/60 shadow-lg border-2 border-emerald-200 dark:border-emerald-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
                    <span className="font-bold text-lg md:text-xl text-slate-900 dark:text-slate-100">
                      {formatTimestamp(item.timestamp)}
                    </span>
                    <div className="flex gap-4 md:gap-6 flex-wrap">
                      <span className="font-semibold bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 rounded-lg text-emerald-800 dark:text-emerald-200">
                        {t('accShort')}: <strong className="text-emerald-700 dark:text-emerald-300">{item.accuracyRate}%</strong>
                      </span>
                      {item.recoveryRate && (
                        <span className="font-semibold bg-blue-100 dark:bg-blue-900/50 px-3 py-1 rounded-lg text-blue-800 dark:text-blue-200">
                          {t('recovery')}: <strong className="text-blue-700 dark:text-blue-300">{item.recoveryRate}%</strong>
                        </span>
                      )}
                      {item.timeTaken && (
                        <span className="font-semibold bg-purple-100 dark:bg-purple-900/50 px-3 py-1 rounded-lg text-purple-800 dark:text-purple-200">
                          {t('timeTaken')}: <strong className="text-purple-700 dark:text-purple-300">{item.timeTaken}s</strong>
                        </span>
                      )}
                      {item.cropType && (
                        <span className="font-semibold bg-amber-100 dark:bg-amber-900/50 px-3 py-1 rounded-lg text-amber-800 dark:text-amber-200">
                          {t('cropTypeLabel')}: <strong className="text-amber-700 dark:text-amber-300">{item.cropType}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ContentModal>

      <ContentModal
        isOpen={openModal === 'insights'}
        onClose={() => setOpenModal(null)}
        title={t('powerfulInsights')}
      >
        <div className="glass-input dark:glass-input-dark rounded-xl p-6 md:p-8 bg-white/60 dark:bg-slate-800/60 shadow-lg border-2 border-emerald-200 dark:border-emerald-700">
          <div className="text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed font-medium text-base md:text-lg">
            {insights || <span className="text-slate-600 dark:text-slate-400">{t('runAnalysisToSeeInsights')}</span>}
          </div>
        </div>
      </ContentModal>
    </section>
  )
}
