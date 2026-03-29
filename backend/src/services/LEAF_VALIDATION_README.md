# Leaf Image Validation System

## Overview

The Leaf Image Validation System is a pre-analysis filter that ensures only valid crop/plant leaf images reach the main disease detection model. It uses the Gemini Vision API to validate images before processing, rejecting non-plant images with clear, user-friendly error messages.

## Features

✅ **Pre-validation before analysis** - Validates images before expensive crop analysis  
✅ **Vision AI powered** - Uses Gemini-1.5-Flash for fast and accurate validation  
✅ **User-friendly error messages** - Clear rejection reasons with helpful tips  
✅ **Structured responses** - Returns JSON with validation status, message, and confidence  
✅ **Error resilience** - Gracefully handles API errors and invalid inputs  
✅ **Reusable service** - Central utility function for consistent validation across the app  

## Architecture

### Backend Flow

```
User uploads image
    ↓
POST /api/analyze
    ↓
Leaf Validation Service
    ├─→ Invalid? Return 400 with validation error
    └─→ Valid? Continue to crop analysis
    ↓
Crop Disease Analysis
    ↓
Return analysis results
```

### Validation Response Structure

```json
{
  "isValid": boolean,
  "message": "User-friendly message",
  "confidence": number (0-100)
}
```

## Implementation Details

### Backend Components

#### 1. **Leaf Validator Service** (`backend/src/services/leafValidator.js`)

Main validation service using Gemini Vision API.

**Key Functions:**

- **`validateLeafImage(imageBuffer, mimeType)`** - Returns validation result
  - Returns: `{isValid, message, confidence}`
  - Rejects: human faces/bodies, animals, non-plant objects, blurry images
  - Accepts: plant leaves, stems, foliage with plant characteristics

- **`isValidationError(validationResult)`** - Checks if failure is due to API issues

**Rejection Criteria:**

- ❌ Human face, hands, or body parts
- ❌ Animals (insects, pets, wildlife)
- ❌ Non-plant objects (cars, buildings, food, sky, soil only)
- ❌ Blurry or unrecognizable images
- ❌ Screenshots or digital content

**Acceptance Criteria:**

- ✅ Plant or crop leaf with visible structure
- ✅ Plant stem or plant parts
- ✅ Visible leaf texture, veins, or chlorophyll
- ✅ Multiple plant leaves or foliage

#### 2. **Updated Analyze Route** (`backend/src/routes/analyze.js`)

Integrates leaf validation before crop analysis:

```javascript
1. Receive image file
2. Call validateLeafImage()
3. If validation fails → Return 400 with error message
4. If validation succeeds → Proceed with runCropAnalysis()
```

**Response on Validation Failure (400):**
```json
{
  "message": "Please upload a clear image of a crop leaf to continue analyzing.",
  "validationFailed": true,
  "isValidationError": false,
  "confidence": 90
}
```

### Frontend Components

#### 1. **Validation Helpers** (`frontend/src/lib/validationHelpers.js`)

Utility functions for validation error detection and user guidance:

- **`isLeafValidationError(errorMessage)`** - Detects validation errors
- **`getValidationSuggestion(errorMessage)`** - Returns helpful tips based on error

#### 2. **Enhanced Dashboard** (`frontend/src/pages/Dashboard.jsx`)

Updated `handleAnalyze()` to:
- Detect validation errors via `isLeafValidationError()`
- Display suggestions via `getValidationSuggestion()`
- Clear image file after validation rejection
- Maintain smooth user experience with helpful feedback

## Usage

### Backend API

**Endpoint:** `POST /api/analyze`

**Request:**
```bash
curl -X POST http://localhost:3001/api/analyze \
  -F "image=@leaf.jpg"
```

**Success Response (200):**
```json
{
  "timeTaken": 2.5,
  "accuracyRate": 92,
  "recoveryRate": 85,
  "cropType": "Tomato",
  "recommendations": "Apply fungicide...",
  "insights": "Plant shows signs of..."
}
```

**Validation Failure Response (400):**
```json
{
  "message": "Please upload a clear image of a crop leaf to continue analyzing. (Image contains an animal.)",
  "validationFailed": true,
  "isValidationError": false,
  "confidence": 95
}
```

### Using the Validation Service Directly

```javascript
import { validateLeafImage } from '../services/leafValidator.js'

// Validate an image
const validation = await validateLeafImage(imageBuffer, 'image/jpeg')

if (validation.isValid) {
  console.log('Image valid, confidence:', validation.confidence)
  // Proceed with analysis
} else {
  console.log('Validation failed:', validation.message)
  // Show error to user
}
```

## Configuration

### Environment Variables

Ensure your `.env` file has the Gemini API key configured:

```bash
GEMINI_API_KEY=AIza_YOUR_KEY_HERE
GEMINI_MODEL=gemini-1.5-flash
```

### Behavior When API Key is Not Configured

If `GEMINI_API_KEY` is not set:
- Validation is **skipped** with a warning
- Images proceed directly to crop analysis
- A warning message is logged

To enforce strict validation, modify `leafValidator.js` to reject instead of skip:

```javascript
if (!GEMINI_API_KEY || !GEMINI_API_KEY.trim()) {
  return {
    isValid: false,  // Change to false to enforce validation
    message: 'Validation service not configured',
    confidence: 100,
  }
}
```

## Error Handling

### API Validation Errors

The service handles various error scenarios:

| Error | Response |
|-------|----------|
| Invalid API key | `isValid: false`, confidence: 0 |
| Quota exceeded | `isValid: false`, confidence: 0 |
| Empty image file | `isValid: false`, confidence: 100 |
| Invalid image buffer | `isValid: false`, confidence: 100 |
| JSON parsing error | `isValid: false`, confidence: 0 |

### Frontend Error Handling

The Dashboard component:
- Catches validation errors and displays user-friendly messages
- Provides contextual suggestions (e.g., "Make sure the image only shows the plant leaf")
- Clears the image file input to allow retry
- Doesn't crash or continue to analysis on validation failure

## Confidence Scoring

Confidence indicates how certain the validation result is:

- **95-100** - Very certain (clear plant/non-plant)
- **80-94** - Confident (clear validation decision)
- **60-79** - Moderate (some ambiguity in image)
- **<60** - Uncertain (poor image quality, unclear content)

When confidence is low, consider:
- Asking user to retake the photo
- Providing clearer instructions
- Allowing manual override (optional feature)

## Testing

### Manual Testing

1. **Valid Image (Should Pass):**
   - Clear photo of a plant leaf
   - Good lighting, focus on the leaf
   - Shows leaf texture and veins

2. **Invalid Images (Should Fail):**
   - Selfie with face visible
   - Photo with a pet or insect
   - Photo of a car or building
   - Blurry photo of a leaf
   - Empty sky or soil without plants

### Automated Testing

Add tests to verify validation logic:

```javascript
import { validateLeafImage } from '../services/leafValidator.js'

describe('Leaf Validation', () => {
  it('should accept plant leaf images', async () => {
    const result = await validateLeafImage(leafBuffer, 'image/jpeg')
    expect(result.isValid).toBe(true)
    expect(result.confidence).toBeGreaterThan(80)
  })

  it('should reject non-plant images', async () => {
    const result = await validateLeafImage(carBuffer, 'image/jpeg')
    expect(result.isValid).toBe(false)
    expect(result.message).toContain('crop leaf')
  })
})
```

## Performance Considerations

- **Validation latency:** ~1-2 seconds per image (Gemini API)
- **Cost:** Uses `gemini-1.5-flash` (fast and cost-effective)
- **Caching:** Consider adding validation result caching for identical images
- **Retry logic:** Implement retry for temporary API failures

### Performance Optimization Ideas

1. **Client-side pre-check** - Validate image dimensions/size before upload
2. **Image compression** - Compress images before validation
3. **Batch validation** - Validate multiple images in parallel
4. **Result caching** - Cache validation results for similar images
5. **Async validation** - Show placeholder while validating in background

## Maintenance & Debugging

### Enabling Debug Logs

The service uses the logger utility. Enable debug mode:

```javascript
// backend/src/utils/logger.js
const DEBUG_MODE = true
```

### Common Issues

**Issue:** Validation always passes or always fails

**Solution:** Check Gemini API key configuration and API response format

**Issue:** Response parsing error

**Solution:** Check that Gemini returns valid JSON in the expected format

**Issue:** High false-positive rate (rejecting valid leaves)

**Solution:** Review and adjust the validation prompt in `leafValidator.js`

## Future Enhancements

1. **Local model option** - Add support for lightweight local validation models
2. **Multi-stage validation** - Validate image quality before content validation
3. **Confidence feedback loop** - Collect user feedback to improve validation
4. **Manual override** - Allow users to force analysis despite validation failure
5. **Batch validation** - Support validating multiple images simultaneously

## Support & Troubleshooting

For issues or questions:

1. Check the logs in `backend/src/utils/logger.js`
2. Verify Gemini API key and quota in [Google AI Studio](https://makersuite.google.com)
3. Test with sample images from the `docs/` folder
4. Review the validation response structure for error codes

---

**Version:** 1.0  
**Last Updated:** March 2026  
**Maintained by:** CropCare Team
