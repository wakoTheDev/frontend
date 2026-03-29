import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { analyzeRouter } from './routes/analyze.js'
import { recommendationsRouter } from './routes/recommendations.js'
import { insightsRouter } from './routes/insights.js'
import { accountRouter } from './routes/account.js'
import { feedbackRouter } from './routes/feedback.js'
import { chatRouter } from './routes/chat.js'
import { logger } from './utils/logger.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(morgan('dev', { stream: { write: (msg) => process.stdout.write(msg) } }))
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.use('/api', analyzeRouter)
app.use('/api', recommendationsRouter)
app.use('/api', insightsRouter)
app.use('/api', feedbackRouter)
app.use('/api', chatRouter)
app.use('/api/account', accountRouter)

app.get('/api/health', (_, res) => {
  const apiKeyConfigured = !!process.env.OPEN_ROUTER_API_KEY?.trim()
  const apiKeyValid = apiKeyConfigured && process.env.OPEN_ROUTER_API_KEY.trim().startsWith('sk-or-v1-')
  
  res.json({ 
    status: 'ok',
    openrouter: {
      configured: apiKeyConfigured,
      valid: apiKeyValid,
      message: apiKeyConfigured 
        ? (apiKeyValid ? 'API key is configured' : 'API key format appears invalid')
        : 'OPEN_ROUTER_API_KEY not set in .env file'
    }
  })
})

app.listen(PORT, () => {
  logger.info(`CropCare API running at http://localhost:${PORT}`)
  logger.info(`Log level: ${process.env.LOG_LEVEL || 'info'} (set LOG_LEVEL=debug for more output)`)

  // Gemini key check
  const geminiKey = process.env.GEMINI_API_KEY?.trim()
  if (!geminiKey) {
    logger.warn('GEMINI_API_KEY is not set - leaf validation will not work')
  } else {
    logger.info('Gemini API key is configured ✓')
  }

  // OpenRouter key check
  const apiKey = process.env.OPEN_ROUTER_API_KEY?.trim()
  if (!apiKey) {
    logger.warn('OPEN_ROUTER_API_KEY is not set in .env file')
    logger.warn('AI recommendations and insights will not work. Get your key at: https://openrouter.ai/keys')
  } else if (!apiKey.startsWith('sk-or-v1-')) {
    logger.warn('OPEN_ROUTER_API_KEY format appears invalid')
    logger.warn(`Current key starts with: "${apiKey.substring(0, 10)}..."`)
    logger.warn('Valid keys should start with "sk-or-v1-". Get your key at: https://openrouter.ai/keys')
  } else {
    logger.info('OpenRouter API key is configured')
    logger.info(`Model: ${process.env.OPENAI_MODEL || 'gpt-4o'}`)
  }
})