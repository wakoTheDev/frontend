import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import compression from 'compression'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { analyzeRouter } from './routes/analyze.js'
import { recommendationsRouter } from './routes/recommendations.js'
import { insightsRouter } from './routes/insights.js'
import { accountRouter } from './routes/account.js'
import { feedbackRouter } from './routes/feedback.js'
import { chatRouter } from './routes/chat.js'
import { logger } from './utils/logger.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

app.use(compression())
app.use(morgan('dev', { stream: { write: (msg) => process.stdout.write(msg) } }))

app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.options('*', cors())
app.use(express.json())

app.use('/api', analyzeRouter)
app.use('/api', recommendationsRouter)
app.use('/api', insightsRouter)
app.use('/api', feedbackRouter)
app.use('/api', chatRouter)
app.use('/api/account', accountRouter)

// ── Serve Frontend (built React app) ──────────────────────────────────────────
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist')
app.use(express.static(frontendDistPath))

// ── SPA Fallback: Serve index.html for all unmatched routes ───────────────────
app.get('*', (req, res) => {
  // Don't fallback for API routes
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendDistPath, 'index.html'))
  } else {
    res.status(404).json({ message: 'API endpoint not found' })
  }
})

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => {
  const apiKeyConfigured = !!process.env.OPEN_ROUTER_API_KEY?.trim()
  const apiKeyValid = apiKeyConfigured && process.env.OPEN_ROUTER_API_KEY.trim().startsWith('sk-or-v1-')
  const supabaseConfigured = !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    services: {
      openrouter: {
        configured: apiKeyConfigured,
        valid: apiKeyValid,
        message: !apiKeyConfigured
          ? 'OPEN_ROUTER_API_KEY not set'
          : apiKeyValid ? 'API key is configured' : 'API key format appears invalid'
      },
      supabase: {
        configured: supabaseConfigured,
        message: supabaseConfigured ? 'Supabase URL is configured' : 'SUPABASE_URL not set'
      }
    }
  })
})

// ── Ping (lightweight liveness check) ────────────────────────────────────────
app.get('/api/ping', (_, res) => {
  res.status(200).json({ status: 'ok', message: 'pong' })
})

app.listen(PORT, () => {
  logger.info(`CropCare API running at http://localhost:${PORT}`)
  logger.info(`Log level: ${process.env.LOG_LEVEL || 'info'} (set LOG_LEVEL=debug for more output)`)

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