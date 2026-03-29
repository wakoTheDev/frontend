#!/usr/bin/env node

/**
 * Example: Testing the Leaf Validation Service
 * 
 * This file demonstrates how to test the leaf validation functionality
 * across different image scenarios.
 * 
 * Usage:
 *   node test-leaf-validation.js <path-to-image>
 */

import fs from 'fs'
import path from 'path'
import { validateLeafImage } from './src/services/leafValidator.js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function testValidation(imagePath) {
  console.log('🔍 Testing Leaf Validation Service\n')
  console.log(`📋 Image: ${imagePath}\n`)

  try {
    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath)
    const mimeType = getMimeType(imagePath)

    console.log(`📊 Image Details:`)
    console.log(`   Size: ${(imageBuffer.length / 1024).toFixed(2)} KB`)
    console.log(`   MIME Type: ${mimeType}\n`)

    // Run validation
    console.log('⏳ Validating image...\n')
    const result = await validateLeafImage(imageBuffer, mimeType)

    // Display results
    console.log('✨ Validation Result:')
    console.log(`   Valid: ${result.isValid ? '✅ YES' : '❌ NO'}`)
    console.log(`   Confidence: ${result.confidence}%`)
    console.log(`   Message: ${result.message}\n`)

    // Display decision
    if (result.isValid) {
      console.log('🎉 Image PASSED validation - Ready for crop disease analysis!')
    } else {
      console.log('⚠️  Image FAILED validation - User should upload a different image.')
      console.log('   Issue: ' + getIssueDescription(result.message))
    }
  } catch (error) {
    console.error('❌ Error during validation:', error.message)
    process.exit(1)
  }
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  }
  return mimeTypes[ext] || 'image/jpeg'
}

function getIssueDescription(message) {
  if (message.toLowerCase().includes('human')) {
    return 'Image contains human face or body parts'
  }
  if (message.toLowerCase().includes('animal')) {
    return 'Image contains an animal'
  }
  if (message.toLowerCase().includes('blurry')) {
    return 'Image is too blurry or unclear'
  }
  if (message.toLowerCase().includes('does not')) {
    return 'Image does not contain a recognizable plant'
  }
  return 'Unknown validation issue'
}

// Get image path from command line arguments
const imagePath = process.argv[2]

if (!imagePath) {
  console.log('Usage: node test-leaf-validation.js <path-to-image>')
  console.log('\nExample:')
  console.log('  node test-leaf-validation.js ./test-images/tomato-leaf.jpg')
  console.log('  node test-leaf-validation.js ./test-images/selfie.jpg')
  console.log('  node test-leaf-validation.js ./test-images/car.jpg')
  process.exit(1)
}

// Check if file exists
if (!fs.existsSync(imagePath)) {
  console.error(`❌ File not found: ${imagePath}`)
  process.exit(1)
}

// Run validation
await testValidation(imagePath)
