import { Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { runCropAnalysis } from '../services/cropAnalysis.js'
import { logger } from '../utils/logger.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
})

export const analyzeRouter = Router()

/**
 * DEBUG ROUTE
 */
analyzeRouter.get('/analyze/test', (req, res) => {
  logger.info('Analyze router test hit')
  res.json({ status: 'analyze route working' })
})

async function hasLeafColors(imageBuffer) {
  const { data, info } = await sharp(imageBuffer)
    .resize(100, 100, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = info.width * info.height
  const channels = info.channels

  let greenPixels = 0
  let brownPixels = 0
  let skinPixels = 0
  let grayPixels = 0
  let bluePixels = 0

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    if (g > r + 10 && g > b + 10 && g > 40) greenPixels++
    if (r > 80 && g > 50 && b < 100 && r >= g && g > b && r - b > 20) brownPixels++
    if (r > 95 && g > 40 && b > 20 && r > g && r > b) skinPixels++
    if (
      Math.abs(r - g) < 25 &&
      Math.abs(g - b) < 25 &&
      Math.abs(r - b) < 25 &&
      r > 40
    ) grayPixels++
    if (b > r + 20 && b > g + 10) bluePixels++
  }

  const greenRatio = greenPixels / pixels
  const brownRatio = brownPixels / pixels
  const skinRatio = skinPixels / pixels
  const grayRatio = grayPixels / pixels
  const blueRatio = bluePixels / pixels

  logger.debug('COLOR ANALYSIS', { greenRatio, brownRatio, skinRatio, grayRatio, blueRatio })

  if (skinRatio > 0.20) return { valid: false, reason: 'human detected' }
  if (grayRatio > 0.45) return { valid: false, reason: 'non-plant object detected' }
  if (blueRatio > 0.40) return { valid: false, reason: 'sky or water detected' }
  if (skinRatio > 0.10 && greenRatio < 0.10) return { valid: false, reason: 'human detected' }

  if (greenRatio >= 0.20) return { valid: true }
  if (greenRatio >= 0.10 && brownRatio >= 0.08) return { valid: true }

  // ✅ Also accept yellow/pale leaves (diseased crops often lose green)
  const yellowPixels_approx = greenPixels + brownPixels
  const yellowRatio = yellowPixels_approx / pixels
  if (yellowRatio >= 0.15) return { valid: true }

  return { valid: false, reason: 'no plant colors detected' }
}

/**
 * MAIN ANALYZE ROUTE
 */
analyzeRouter.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    logger.info('POST /api/analyze triggered')

    const file = req.file

    if (!file) {
      logger.warn('No image uploaded')
      return res.status(400).json({ message: 'No image file provided' })
    }

    logger.debug(`Image received: ${file.size} bytes`)

    // Step 1: Color validation
    const colorCheck = await hasLeafColors(file.buffer)

    if (!colorCheck.valid) {
      logger.info(`Rejected by color filter: ${colorCheck.reason}`)
      return res.status(400).json({
        message: '❌ Invalid image. Please upload a clear photo of a crop leaf.',
        validationFailed: true,
        reason: colorCheck.reason,
        confidence: 0,
      })
    }

    // Step 2: AI model analysis
    const result = await runCropAnalysis(file)

    const predictedClass = result.cropType || ''
    const confidence = result.accuracyRate || 0

    // ✅ Removed hardcoded crop list check — trust the model for all crop types.
    // Only reject if model returned no class at all AND very low confidence.
    if (!predictedClass && confidence < 25) {
      logger.info(`Rejected: no crop type detected, confidence=${confidence}`)
      return res.status(400).json({
        message: '❌ Could not identify a crop in this image. Please upload a clear leaf photo.',
        validationFailed: true,
        confidence,
      })
    }

    logger.info(`SUCCESS: ${predictedClass} (${confidence}%)`)

    return res.json(result)

  } catch (err) {
    logger.error('Analyze route error:', err)
    return res.status(500).json({
      message: err.message || 'Analysis failed'
    })
  }
})