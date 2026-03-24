import { Router } from 'express'
import { logger } from '../utils/logger.js'
import { chatWithOpenAI } from '../services/openai.js'

export const chatRouter = Router()

// Simple chat endpoint reusing the same OpenAI/OpenRouter configuration
// Body: { question: string, context?: object, history?: Array<{role:'user'|'assistant', content:string}> }
chatRouter.post('/chat', async (req, res) => {
  try {
    const { question, context, history } = req.body || {}
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ message: 'question is required' })
    }

    logger.debug('POST /api/chat', { question, context, historyLength: Array.isArray(history) ? history.length : 0 })

    const answer = await chatWithOpenAI(question, context, history)
    logger.info('Chat response generated successfully')
    res.json({ answer })
  } catch (err) {
    logger.error('Chat error:', err.message || err)

    let statusCode = 500
    let errorMessage = err.message || 'Failed to get chat response'

    if (err.message?.includes('API key') || err.message?.includes('OPEN_ROUTER_API_KEY')) {
      statusCode = 503
      errorMessage = 'OpenRouter API key is not configured correctly. Please check backend/.env file.'
    } else if (err.message?.includes('quota') || err.message?.includes('rate limit')) {
      statusCode = 503
      errorMessage = 'OpenRouter API quota exceeded or rate limit reached. Please check your account.'
    }

    res.status(statusCode).json({
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    })
  }
})

