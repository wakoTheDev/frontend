# Quick Start Guide: Leaf Validation Testing

## Overview

This guide walks you through testing the newly implemented leaf validation feature in CropCare.

## What's New?

Before your image reaches the disease analysis model, it now goes through a pre-validation step that ensures it contains a crop/plant leaf. Invalid images are rejected with a user-friendly error message before wasting resources on analysis.

## Setup

### 1. Verify Environment Configuration

Make sure your `.env` file has the Gemini API key:

```bash
# .env
GEMINI_API_KEY=AIza_YOUR_API_KEY_HERE
GEMINI_MODEL=gemini-1.5-flash
```

⚠️ **Security Note:** Keep your API key in `.env` only. Never commit it to version control or documentation.

If not set, validation will be **skipped** with a warning. To enforce strict validation, see the documentation.

### 2. Restart Backend Server

After updating environment variables:

```bash
cd backend
npm install  # If dependencies changed
npm start    # Restart the server
```

## Testing Scenarios

### Scenario 1: Valid Crop Leaf (Should PASS ✅)

**Image:** Clear photo of a plant/crop leaf

**Expected Result:**
```
Status: 200 OK
Response: Full analysis with timeTaken, accuracyRate, cropType, etc.
```

**Steps:**
1. Open CropCare Dashboard
2. Upload a clear photo of a plant leaf with visible disease symptoms
3. Click "Analyze"
4. Should proceed to analysis and show results

---

### Scenario 2: Human Face in Photo (Should FAIL ❌)

**Image:** Selfie or photo with visible face

**Expected Result:**
```
Status: 400 Bad Request
Message: "Please upload a clear image of a crop leaf to continue analyzing. (Image contains a human face.)"
Suggestion: "Tip: Make sure the image only shows the plant leaf, not your face or hands."
```

**Steps:**
1. Open CropCare Dashboard
2. Upload a selfie or photo with a human face
3. Click "Analyze"
4. Should show error message with helpful suggestion
5. Image input is cleared, allowing retry

---

### Scenario 3: Animal in Photo (Should FAIL ❌)

**Image:** Photo including a pet or insect

**Expected Result:**
```
Status: 400 Bad Request
Message: "Please upload a clear image of a crop leaf to continue analyzing. (Image contains an animal.)"
```

---

### Scenario 4: Non-Plant Object (Should FAIL ❌)

**Image:** Photo of car, building, food, or sky

**Expected Result:**
```
Status: 400 Bad Request
Message: "Please upload a clear image of a crop leaf to continue analyzing. (Image does not contain a plant.)"
```

---

### Scenario 5: Blurry Image (Should FAIL ❌)

**Image:** Out-of-focus or low-quality photo

**Expected Result:**
```
Status: 400 Bad Request
Message: "Please upload a clear image of a crop leaf to continue analyzing. (Image is too blurry.)"
Suggestion: "Tip: Take a clearer photo with better lighting and focus on the affected leaf."
```

---

## Manual Testing via API

### Test Valid Leaf Image

```bash
curl -X POST http://localhost:3001/api/analyze \
  -F "image=@/path/to/healthy-leaf.jpg"
```

**Expected Response (200):**
```json
{
  "timeTaken": 2.3,
  "accuracyRate": 88,
  "recoveryRate": 82,
  "cropType": "Tomato",
  "recommendations": "...",
  "insights": "..."
}
```

### Test Invalid Image (Non-Plant)

```bash
curl -X POST http://localhost:3001/api/analyze \
  -F "image=@/path/to/car.jpg"
```

**Expected Response (400):**
```json
{
  "message": "Please upload a clear image of a crop leaf to continue analyzing. (Image does not contain a plant.)",
  "validationFailed": true,
  "isValidationError": false,
  "confidence": 92
}
```

---

## Checking Server Logs

Enable debug logs to see validation details:

**Backend Console Output:**
```
DEBUG: POST /api/analyze received image size 245982
DEBUG: Starting leaf validation...
INFO: Leaf validation result: isValid=true, confidence=95%, category=plant-leaf
```

Or for failed validation:
```
DEBUG: POST /api/analyze received image size 123456
DEBUG: Starting leaf validation...
INFO: Leaf validation failed: Please upload a clear image...
```

---

## Troubleshooting

### All Images Getting Rejected

**Potential Causes:**
- Gemini API key is invalid
- API quota is exceeded
- Validation prompt is too strict

**Solutions:**
1. Verify API key in `.env`
2. Check quota at https://makersuite.google.com/app/apikey
3. Review validation prompt in `leafValidator.js`

### Validation Always Passes (Even Non-Plant Images)

**Potential Causes:**
- API key not configured (validation is skipped)
- Gemini model not responding correctly

**Solutions:**
1. Confirm GEMINI_API_KEY is set in `.env`
2. Check server logs for API errors
3. Test with `test-leaf-validation.js` script

### Validation Service Error (0% Confidence)

**Causes:** Temporary API issue

**Solution:** Retry the request - it's usually transient

---

## Advanced Testing

### Using the Test Script

```bash
cd backend

# Test a valid leaf image
node test-leaf-validation.js ./test-images/tomato-leaf.jpg

# Test an invalid image
node test-leaf-validation.js ./test-images/dog.jpg
```

### Unit Testing

Create tests in `backend/__tests__/leafValidator.test.js`:

```javascript
import { validateLeafImage } from '../src/services/leafValidator.js'
import fs from 'fs'

describe('Leaf Validation', () => {
  it('should accept valid plant images', async () => {
    const buffer = fs.readFileSync('./test-images/leaf.jpg')
    const result = await validateLeafImage(buffer, 'image/jpeg')
    expect(result.isValid).toBe(true)
  })

  it('should reject non-plant images', async () => {
    const buffer = fs.readFileSync('./test-images/car.jpg')
    const result = await validateLeafImage(buffer, 'image/jpeg')
    expect(result.isValid).toBe(false)
  })
})
```

Run tests:
```bash
npm test
```

---

## Performance Observations

- **Validation latency:** 1-2 seconds per image
- **Cost:** Uses `gemini-1.5-flash` (most cost-effective)
- **Error rate:** Should be < 5% false positives

---

## Monitoring

### Key Metrics to Track

1. **Validation Pass Rate** - % of images that pass validation
2. **False Positive Rate** - Valid leaves rejected (should be low)
3. **False Negative Rate** - Non-plants accepted (should be zero)
4. **Average Confidence** - Validation confidence scores

### Sample Monitoring Dashboard

```
Validation Performance (Last 100 images)
Total Images: 100
Passed: 87 (87%)
Failed: 13 (13%)

Top Rejection Reasons:
- Non-plant: 7 (54%)
- Blurry: 4 (31%)
- Animal: 2 (15%)

Average Confidence: 91%
API Call Time: 1.2s avg
```

---

## Rollback (If Needed)

If you need to disable validation temporarily:

1. **Option 1:** Comment out validation in `analyze.js`:
```javascript
// const validation = await validateLeafImage(file.buffer, file.mimetype)
// Skip to direct analysis
const result = await runCropAnalysis(file)
```

2. **Option 2:** Modify validation to always pass:
```javascript
// In leafValidator.js
return { isValid: true, message: 'Validation skipped', confidence: 0 }
```

---

## Feature Flags (Optional Enhancement)

To make validation toggleable via environment variable:

```javascript
// In analyze.js
const ENABLE_VALIDATION = process.env.ENABLE_LEAF_VALIDATION !== 'false'

if (ENABLE_VALIDATION) {
  const validation = await validateLeafImage(file.buffer, file.mimetype)
  if (!validation.isValid) {
    return res.status(400).json({ message: validation.message })
  }
}
```

Then control via:
```bash
# Disable validation
ENABLE_LEAF_VALIDATION=false npm start

# Enable validation (default)
npm start
```

---

## Success Criteria

✅ Valid plant images pass and proceed to analysis  
✅ Invalid images are rejected with clear error messages  
✅ Error messages include helpful suggestions  
✅ UI doesn't crash on validation failure  
✅ User can retry after validation failure  
✅ Validation takes < 3 seconds per image  
✅ No valid plant images are incorrectly rejected  

---

## Support & Issues

If you encounter issues:

1. **Check logs:** Review backend console output
2. **Verify config:** Confirm `GEMINI_API_KEY` is set
3. **Test API:** Verify Gemini API is accessible
4. **Inspect response:** Look at the JSON response structure
5. **Review docs:** See `LEAF_VALIDATION_README.md` for details

---

**Last Updated:** March 27, 2026  
**Status:** Ready for Production Testing
