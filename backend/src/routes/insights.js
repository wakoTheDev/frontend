import { Router } from 'express'
import { getInsightsFromOpenAI } from '../services/openai.js'
import { logger } from '../utils/logger.js'

export const insightsRouter = Router()

function fallbackInsights(analysisSummary = {}) {
  const crop = analysisSummary?.cropType || 'Crop'
  const accuracy = analysisSummary?.accuracyRate
  const accText = typeof accuracy === 'number' ? `${accuracy}%` : 'N/A'
  return `${crop} analysis completed. Current confidence is ${accText}. Continue monitoring leaf color changes, lesion spread, and moisture conditions over the next 3-5 days. If symptoms worsen, apply targeted treatment early and isolate heavily affected leaves.`
}

insightsRouter.post('/insights', async (req, res) => {
  try {
    const { analysisSummary } = req.body || {}
    logger.debug('POST /api/insights', { analysisSummary })
    const aiResult = await getInsightsFromOpenAI(analysisSummary)
    const insights =
      typeof aiResult === 'string'
        ? aiResult
        : (typeof aiResult?.insights === 'string' ? aiResult.insights : '')
    const recoveryRate =
      typeof aiResult === 'object' && typeof aiResult?.recoveryRate === 'number'
        ? aiResult.recoveryRate
        : null

    logger.info('Insights generated successfully')
    res.json({
      insights: insights || fallbackInsights(analysisSummary),
      recoveryRate,
    })
  } catch (err) {
    logger.error('Insights error:', err.message || err)
    // Return graceful fallback text so frontend always has insights
    const { analysisSummary } = req.body || {}
    res.status(200).json({
      insights: fallbackInsights(analysisSummary),
      recoveryRate: null,
      degraded: true,
    })
  }
})
