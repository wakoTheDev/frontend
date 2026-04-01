import { Router } from 'express'
import multer from 'multer'
import Anthropic from '@anthropic-ai/sdk'
import { logger } from '../utils/logger.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export const validateRouter = Router()

validateRouter.post('/validate', upload.single('file'), async (req, res) => {
  try {
    const file = req.file

    if (!file) {
      return res.status(400).json({
        isValid: false,
        message: '❌ No image provided.'
      })
    }

    logger.info(`Validating image via Claude: ${file.originalname} (${file.size} bytes)`)

    const base64Image = file.buffer.toString('base64')
    const mimeType = file.mimetype || 'image/jpeg'

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: base64Image
              }
            },
            {
              type: 'text',
              text: `You are a crop disease detection assistant.
Look at this image carefully.
Is this a crop or plant leaf? Only crop/plant leaves are valid.
Reject anything else — cars, people, animals, buildings, food, random objects, etc.
Reply with ONLY one of these two responses:
VALID - if it is clearly a crop or plant leaf
INVALID - if it is anything else`
            }
          ]
        }
      ]
    })

    const answer = response.content?.[0]?.text?.trim().toUpperCase() ?? 'INVALID'
    logger.info(`Claude validation response: ${answer}`)

    const isValid = answer.startsWith('VALID')

    return res.json({
      isValid,
      message: isValid
        ? '✅ Image validated. Proceeding with disease analysis.'
        : '❌ Invalid image. Please upload a crop leaf image to continue analyzing.'
    })

  } catch (err) {
    logger.error('Validation route error:', err)
    return res.json({
      isValid: true,
      message: '✅ Validation service unavailable, proceeding anyway.'
    })
  }
})
