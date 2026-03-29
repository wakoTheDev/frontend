import { Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { runCropAnalysis } from '../services/cropAnalysis.js'
import { logger } from '../utils/logger.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
export const analyzeRouter = Router()

const KNOWN_CROP_CLASSES = [
  'apple', 'blueberry', 'cherry', 'corn', 'maize', 'grape',
  'orange', 'peach', 'pepper', 'potato', 'raspberry', 'soybean',
  'squash', 'strawberry', 'tomato'
]

function isKnownCropClass(className) {
  if (!className) return false
  const lower = className.toLowerCase()
  return KNOWN_CROP_CLASSES.some(crop => lower.includes(crop))
}

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

    // Green (healthy leaf)
    if (g > r + 10 && g > b + 10 && g > 40) greenPixels++

    // Brown/yellow (diseased or dried leaf)
    if (r > 80 && g > 50 && b < 100 && r >= g && g > b && r - b > 20) brownPixels++

    // Skin tone (human face/body)
    if (
      r > 95 && g > 40 && b > 20 &&
      r > g && r > b &&
      Math.abs(r - g) > 15 &&
      r - b > 25 &&
      g - b >= 0 && g - b < 90 &&
      r < 250 &&
      !(r > 200 && g > 200 && b > 200)
    ) skinPixels++

    // Gray (car, road, building, metal)
    if (
      Math.abs(r - g) < 25 &&
      Math.abs(g - b) < 25 &&
      Math.abs(r - b) < 25 &&
      r > 40
    ) grayPixels++

    // Blue (sky, water)
    if (b > r + 20 && b > g + 10) bluePixels++
  }

  const greenRatio = greenPixels / pixels
  const brownRatio = brownPixels / pixels
  const skinRatio = skinPixels / pixels
  const grayRatio = grayPixels / pixels
  const blueRatio = bluePixels / pixels

  console.log('=== COLOR ANALYSIS ===')
  console.log(`Green: ${(greenRatio * 100).toFixed(1)}%`)
  console.log(`Brown: ${(brownRatio * 100).toFixed(1)}%`)
  console.log(`Skin:  ${(skinRatio * 100).toFixed(1)}%`)
  console.log(`Gray:  ${(grayRatio * 100).toFixed(1)}%`)
  console.log(`Blue:  ${(blueRatio * 100).toFixed(1)}%`)
  console.log('======================')

  // Hard rejections
  if (skinRatio > 0.20) return { valid: false, reason: 'human detected' }
  if (grayRatio > 0.45) return { valid: false, reason: 'non-plant object detected' }
  if (blueRatio > 0.40) return { valid: false, reason: 'sky or water detected' }
  if (skinRatio > 0.10 && greenRatio < 0.10) return { valid: false, reason: 'human detected' }

  // Must have plant colors
  if (greenRatio >= 0.20) return { valid: true }
  if (greenRatio >= 0.10 && brownRatio >= 0.08) return { valid: true }

  return { valid: false, reason: 'no plant colors detected' }
}

analyzeRouter.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    logger.debug('POST /api/analyze received', req.file ? `image size ${req.file.size}` : 'no file')
    const file = req.file

    if (!file) {
      return res.status(400).json({ message: 'No image file provided' })
    }

    // Step 1: Color check first (fast, no API needed)
    const colorCheck = await hasLeafColors(file.buffer)
    if (!colorCheck.valid) {
      logger.info(`Color validation failed: ${colorCheck.reason}`)
      return res.status(400).json({
        message: '❌ Invalid image. Please take a photo of a leaf of a crop.',
        validationFailed: true,
        confidence: 0,
      })
    }

    // Step 2: Run crop model
    const result = await runCropAnalysis(file)

    // Step 3: Validate model returned a known crop class
    const predictedClass = result.cropType || ''
    const confidence = result.accuracyRate || 0
    const isValidCrop = isKnownCropClass(predictedClass) && confidence >= 25

    if (!isValidCrop) {
      logger.info(`Model validation failed: predicted="${predictedClass}", confidence=${confidence}%`)
      return res.status(400).json({
        message: '❌ Invalid image. Please take a photo of a leaf of a crop.',
        validationFailed: true,
        confidence,
      })
    }

    logger.info(`Validation passed: "${predictedClass}" at ${confidence}% confidence`)
    logger.info('Analyze completed successfully')
    res.json(result)

  } catch (err) {
    logger.error('Analyze error:', err.message || err)
    res.status(500).json({ message: err.message || 'Analysis failed' })
  }
})
