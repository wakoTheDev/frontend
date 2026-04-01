/**
 * Leaf Validator Service
 * Uses color-based analysis to validate that an uploaded image contains a plant/crop leaf
 * No external API required - works fully offline
 */

import { logger } from '../utils/logger.js'

/**
 * Analyze image colors to detect green/plant content
 */
async function analyzeImageColors(imageBuffer) {
  const bytes = new Uint8Array(imageBuffer)

  let greenPixels = 0
  let totalSampled = 0
  const sampleRate = 10

  for (let i = 100; i < bytes.length - 3; i += sampleRate * 3) {
    const r = bytes[i]
    const g = bytes[i + 1]
    const b = bytes[i + 2]

    if (r === undefined || g === undefined || b === undefined) continue

    totalSampled++

    const isGreenDominant = g > r * 0.8 && g > b * 0.8 && g > 30
    const isYellowGreen = g > 100 && r > 80 && b < 100
    const isDarkGreen = g > 40 && g > r && g > b

    if (isGreenDominant || isYellowGreen || isDarkGreen) {
      greenPixels++
    }
  }

  if (totalSampled === 0) {
    return { isValid: false, message: '❌ Invalid image. Please take a photo of a leaf of a crop.', confidence: 0 }
  }

  const greenRatio = greenPixels / totalSampled
  const confidence = Math.min(95, Math.round(greenRatio * 200))

  console.log(`=== COLOR ANALYSIS ===`)
  console.log(`Green pixels: ${greenPixels} / ${totalSampled}`)
  console.log(`Green ratio: ${(greenRatio * 100).toFixed(1)}%`)
  console.log(`======================`)

  if (greenRatio >= 0.08) {
    return {
      isValid: true,
      message: '✅ Image validated. Proceeding with disease analysis.',
      confidence,
    }
  }

  return {
    isValid: false,
    message: '❌ Invalid image. Please take a photo of a leaf of a crop.',
    confidence,
  }
}

/**
 * Validate if an image contains a plant/crop leaf
 * @param {Buffer} imageBuffer - Image file buffer
 * @param {string} mimeType - Image MIME type
 * @returns {Promise<{isValid: boolean, message: string, confidence: number}>}
 */
export async function validateLeafImage(imageBuffer, mimeType = 'image/jpeg') {
  try {
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
      return {
        isValid: false,
        message: '❌ Invalid image. Please take a photo of a leaf of a crop.',
        confidence: 0,
      }
    }

    if (imageBuffer.length === 0) {
      return {
        isValid: false,
        message: '❌ Invalid image. Please take a photo of a leaf of a crop.',
        confidence: 0,
      }
    }

    logger.debug(`Validating leaf image (size: ${imageBuffer.length} bytes)`)

    const result = await analyzeImageColors(imageBuffer)

    logger.info(`Leaf validation result: isValid=${result.isValid}, confidence=${result.confidence}%`)

    return result

  } catch (err) {
    logger.error(`Leaf validation error: ${err.message || err}`)
    return {
      isValid: false,
      message: '❌ Invalid image. Please take a photo of a leaf of a crop.',
      confidence: 0,
    }
  }
}

/**
 * Check if validation failure is due to a service error
 */
export function isValidationError(validationResult) {
  return (
    !validationResult.isValid &&
    validationResult.confidence === 0
  )
}

export default { validateLeafImage, isValidationError }