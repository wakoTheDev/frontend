import { Router } from 'express'
import { getRecommendationsFromOpenAI } from '../services/openai.js'
import { logger } from '../utils/logger.js'

export const recommendationsRouter = Router()

function fallbackRecommendations(analysisSummary = {}) {
  const crop = analysisSummary?.cropType || 'crop'
  return [
    `• Inspect ${crop} leaves daily for spread and isolate severely affected leaves.`,
    '• Apply a registered treatment based on observed symptoms and local agronomy guidance.',
    '• Improve airflow and avoid overhead irrigation to reduce moisture-driven spread.',
    '• Reassess in 48-72 hours and escalate treatment if lesion expansion continues.',
  ].join('\n')
}

recommendationsRouter.post('/recommendations', async (req, res) => {
  try {
    const { analysisSummary } = req.body || {}
    logger.debug('POST /api/recommendations', { analysisSummary })
    const text = await getRecommendationsFromOpenAI(analysisSummary)
    logger.info('Recommendations generated successfully')
    res.json({ recommendations: text || fallbackRecommendations(analysisSummary) })
  } catch (err) {
    logger.error('Recommendations error:', err.message || err)
    // Return graceful fallback text so frontend always has recommendations
    const { analysisSummary } = req.body || {}
    res.status(200).json({
      recommendations: fallbackRecommendations(analysisSummary),
      degraded: true,
    })
  }
})
