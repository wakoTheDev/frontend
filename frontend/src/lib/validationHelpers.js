/**
 * Leaf Validation Error Utilities
 * Helps the frontend detect and handle leaf validation errors specially
 */

/**
 * Checks if an error message came from the leaf validation step
 * @param {string} errorMessage - Error message from the API response
 * @returns {boolean}
 */
export function isLeafValidationError(errorMessage) {
  if (!errorMessage) return false
  const message = errorMessage.toLowerCase()
  return (
    message.includes('Please upload a clear image of a crop leaf') ||
    message.includes('image does not appear to be a plant') ||
    message.includes('human') ||
    message.includes('animal') ||
    message.includes('blurry') ||
    message.includes('validationfailed')
  )
}

/**
 * Get a helpful suggestion based on the validation error
 * @param {string} errorMessage - Error message from the validation
 * @returns {string}
 */
export function getValidationSuggestion(errorMessage) {
  if (!errorMessage) return ''
  const message = errorMessage.toLowerCase()

  if (message.includes('human') && message.includes('face')) {
    return 'Tip: Make sure the image only shows the plant leaf, not your face or hands.'
  }
  if (message.includes('animal')) {
    return 'Tip: Remove any animals from the image and focus on the plant leaf.'
  }
  if (message.includes('blurry')) {
    return 'Tip: Take a clearer photo with better lighting and focus on the affected leaf.'
  }
  if (message.includes('does not') && message.includes('plant')) {
    return 'Tip: Upload a close-up photo of a crop leaf with visible disease symptoms.'
  }

  return 'Tip: Make sure the image clearly shows a plant or crop leaf.'
}

export default {
  isLeafValidationError,
  getValidationSuggestion,
}
