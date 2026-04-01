import express from 'express'
import dotenv from 'dotenv'
import compression from 'compression'
import cors from 'cors'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'

import { analyzeRouter } from './routes/analyze.js'
import { recommendationsRouter } from './routes/recommendations.js'
import { insightsRouter } from './routes/insights.js'
import { accountRouter } from './routes/account.js'
import { feedbackRouter } from './routes/feedback.js'
import { chatRouter } from './routes/chat.js'
import { validateRouter } from './routes/validate.js'  // ✅ new
import { logger } from './utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(compression())
app.use(morgan('dev'))
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// Routes
app.use('/api', validateRouter)        // ✅ new
app.use('/api', analyzeRouter)
app.use('/api', recommendationsRouter)
app.use('/api', insightsRouter)
app.use('/api', feedbackRouter)
app.use('/api', chatRouter)
app.use('/api/account', accountRouter)

// Serve frontend
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist')
app.use(express.static(frontendDistPath))

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendDistPath, 'index.html'))
  } else {
    res.status(404).json({ message: 'API endpoint not found' })
  }
})

// Health check
app.get('/api/health', (_, res) => {
  const apiKeyConfigured = !!process.env.OPEN_ROUTER_API_KEY?.trim()
  const apiKeyValid = apiKeyConfigured && process.env.OPEN_ROUTER_API_KEY.trim().startsWith('sk-or-v1-')
  res.json({
    status: 'ok',
    openrouter: {
      configured: apiKeyConfigured,
      valid: apiKeyValid
    }
  })
})

app.listen(PORT, () => {
  logger.info(`CropCare API running at http://localhost:${PORT}`)
})