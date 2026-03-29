import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../contexts/AppSettingsContext'
import { analyzeCropImage, getRecommendations, getInsights, setOfflineAnalysisCache } from '../lib/api'
import { isLeafValidationError, getValidationSuggestion } from '../lib/validationHelpers'
import { saveAnalysis, getAnalysisHistory } from '../lib/analysisStore'
import { exportAnalysisPDF } from '../lib/pdfExport'
import { useWeatherMonitoring } from '../hooks/useWeatherMonitoring'
import { notifyAnalysisComplete } from '../lib/notifications'
import PrimaryAnalysisFrame from '../components/PrimaryAnalysisFrame'
import SecondaryInsightsFrame from '../components/SecondaryInsightsFrame'
import HeroSection from '../components/HeroSection'
import HowItWorks from '../components/HowItWorks'
import Testimonials from '../components/Testimonials'
import DemoTestButton from '../components/DemoTestButton'
import LocationWarningBanner from '../components/LocationWarningBanner'
import unhealthyCropLeavesImage from '../assets/unhealthy-crop-leaves.png'
import CameraCaptureModal from '../components/CameraCaptureModal'
import ChatbotWidget from '../components/ChatbotWidget'

const defaultResult = {
  timeTaken: null,
  accuracyRate: null,
  recoveryRate: null,
  cropType: null,
  recommendations: null,
  insights: null,
  imageUrl: null,
  timestamp: null,
}

const SETTINGS_KEY = 'cropcare-app-settings'

function loadLocalSettings() {
  try {
    const s = localStorage.getItem(SETTINGS_KEY)
    return s ? JSON.parse(s) : {}
  } catch {
    return {}
  }
}

export default function Dashboard() {
  const { user, updateActivity } = useAuth()
  const t = useTranslation()
  const location = useLocation()
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [result, setResult] = useState(defaultResult)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [isDemo, setIsDemo] = useState(false)
  const [showCameraModal, setShowCameraModal] = useState(false)
  const fileInputRef = useRef(null)
  const scanSectionRef = useRef(null)
  
  // Weather monitoring - check if weather alerts are enabled (reactive to settings changes)
  const [weatherAlertsEnabled, setWeatherAlertsEnabled] = useState(() => {
    const settings = loadLocalSettings()
    return settings.weatherAlerts === true
  })
  
  // Listen for settings changes
  useEffect(() => {
    const handleStorageChange = () => {
      const settings = loadLocalSettings()
      setWeatherAlertsEnabled(settings.weatherAlerts === true)
    }
    
    // Check on mount and when storage changes
    handleStorageChange()
    window.addEventListener('storage', handleStorageChange)
    
    // Also check periodically (in case settings are changed in another tab)
    const interval = setInterval(handleStorageChange, 2000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])
  
  useWeatherMonitoring(user?.uid, user?.email, weatherAlertsEnabled)

  // If the user clicks "Scan Now", we navigate to `/dashboard#scan`.
  // This effect scrolls the upload/take-picture section into view.
  useEffect(() => {
    const shouldScroll =
      location.hash === '#scan' || location.state?.scrollToScan
    if (!shouldScroll) return

    const timeoutId = window.setTimeout(() => {
      scanSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [location.hash, location.key])

  const loadHistory = async () => {
    if (!user?.uid) return
    const list = await getAnalysisHistory(user.uid)
    setHistory(list)
  }

  useEffect(() => {
    loadHistory()
  }, [user?.uid])

  // Track activity on dashboard
  useEffect(() => {
    if (user && updateActivity) {
      updateActivity()
    }
  }, [user, updateActivity])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError(t('pleaseSelectImage'))
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError(null)
    setResult(defaultResult)
    setIsDemo(false) // Clear demo flag when user uploads their own image
  }

  const handleCapture = () => {
    fileInputRef.current?.click()
  }

  const handleOpenCamera = () => {
    setError(null)
    setIsDemo(false)
    setShowCameraModal(true)
  }

  const handleCameraCaptured = (file, previewUrl) => {
    if (!file) return
    setImageFile(file)
    setImagePreview(previewUrl)
    setResult(defaultResult)
    setError(null)
    setIsDemo(false)
    setShowCameraModal(false)
  }

  const handleDemoTest = async () => {
    setIsDemo(true)
    setLoading(true)
    setError(null)
    setResult(defaultResult) // Reset previous results
    
    // Use the local unhealthy crop leaves image
    try {
      // Fetch the local demo image and create a File object
      let demoFile
      let imageUrl = unhealthyCropLeavesImage
      
      try {
        const response = await fetch(unhealthyCropLeavesImage)
        if (!response.ok) {
          throw new Error(`Failed to load demo image: ${response.status} ${response.statusText}`)
        }
        const blob = await response.blob()
        demoFile = new File([blob], 'demo-unhealthy-crop-leaves.png', { type: 'image/png' })
      } catch (fetchErr) {
        console.error('Failed to fetch demo image:', fetchErr)
        // Create a placeholder file if image fetch fails
        const placeholderBlob = new Blob([''], { type: 'image/png' })
        demoFile = new File([placeholderBlob], 'demo-unhealthy-crop-leaves.png', { type: 'image/png' })
        imageUrl = unhealthyCropLeavesImage // Still use the image path even if fetch fails
      }
      
      // Set image preview immediately
      setImageFile(demoFile)
      setImagePreview(unhealthyCropLeavesImage)
      
      // Simulate analysis delay (3 seconds to show scanning animation)
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Demo analysis metrics - simulating what the backend model would return (including crop/leaf type)
      const demoMetrics = {
        timeTaken: 4.8,
        accuracyRate: 94,
        recoveryRate: 88,
        cropType: 'Maize (corn) leaf',
      }
      
      // Get REAL recommendations and insights from OpenAI API
      const analysisSummary = {
        timeTaken: demoMetrics.timeTaken,
        accuracyRate: demoMetrics.accuracyRate,
        recoveryRate: demoMetrics.recoveryRate,
        cropType: demoMetrics.cropType,
        imageDescription: 'Unhealthy crop leaves showing brown spots, yellowing, and signs of fungal infection',
      }
      
      // Fetch recommendations and insights in parallel from OpenAI
      let recommendations = null
      let insights = null
      
      try {
        const [recRes, insRes] = await Promise.all([
          getRecommendations(analysisSummary).catch((err) => {
            console.warn('Recommendations API error:', err)
            return { recommendations: null }
          }),
          getInsights(analysisSummary).catch((err) => {
            console.warn('Insights API error:', err)
            return { insights: null }
          }),
        ])
        
        recommendations = recRes.recommendations ?? recRes.text ?? null
        insights = insRes.insights ?? insRes.text ?? null
        
        // Fallback to demo text if OpenAI fails
        if (!recommendations) {
          recommendations = '• Apply fungicide treatment within 48 hours\n• Remove affected leaves to prevent spread\n• Ensure proper spacing for air circulation\n• Monitor soil moisture levels\n• Consider organic alternatives like neem oil'
        }
        if (!insights) {
          insights = 'The analysis indicates early-stage leaf spot disease. Early intervention can prevent significant crop loss. The affected area shows characteristic brown spots with yellow halos, typical of fungal infections. Treatment success rate is high when applied promptly.'
        }
      } catch (apiErr) {
        console.error('OpenAI API error:', apiErr)
        // Use fallback recommendations and insights
        recommendations = '• Apply fungicide treatment within 48 hours\n• Remove affected leaves to prevent spread\n• Ensure proper spacing for air circulation\n• Monitor soil moisture levels\n• Consider organic alternatives like neem oil'
        insights = 'The analysis indicates early-stage leaf spot disease. Early intervention can prevent significant crop loss. The affected area shows characteristic brown spots with yellow halos, typical of fungal infections. Treatment success rate is high when applied promptly.'
      }
      
      // Create complete record with all required fields
      const record = {
        timeTaken: Number(demoMetrics.timeTaken),
        accuracyRate: Number(demoMetrics.accuracyRate),
        recoveryRate: Number(demoMetrics.recoveryRate),
        cropType: demoMetrics.cropType || null,
        recommendations: String(recommendations),
        insights: String(insights),
        imageUrl: imageUrl, // Temporary preview URL
        timestamp: new Date().toISOString(),
        imageFile: demoFile, // Always include imageFile so it gets uploaded to Supabase Storage
      }
      
      setOfflineAnalysisCache(record)
      setResult(record)
      setLoading(false)
      // Clear demo image from picker/preview after analysis is complete
      setImageFile(null)
      setImagePreview(null)
      if (fileInputRef.current) {
        try {
          fileInputRef.current.value = ''
        } catch {}
      }
      if (user?.uid) {
        saveAnalysis(user.uid, record).then(() => loadHistory()).catch((saveErr) => console.warn('Could not save demo analysis:', saveErr))
        // Notify user of analysis completion
        if (user?.email) {
          notifyAnalysisComplete(user.email, record).catch((err) => 
            console.warn('Failed to send analysis notification:', err)
          )
        }
      }
    } catch (err) {
      console.error('Demo test error:', err)
      const errorMessage = err?.message || 'Unknown error occurred'
      setError(`Demo test failed: ${errorMessage}. Please try uploading an image instead.`)
      setResult(defaultResult)
      setIsDemo(false)
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!imageFile) return
    if (!user?.uid) {
      setError(t('signInToAnalyze'))
      return
    }
    setIsDemo(false)
    setLoading(true)
    setError(null)
    try {
      const analysis = await analyzeCropImage(imageFile)
      // Log raw analysis payload coming back from the backend/model
      console.log('Raw analysis result from model/backend:', analysis)
      const isOfflineResult = !!analysis.offline

      let timeTaken = analysis.timeTaken ?? analysis.time_taken ?? null
      let accuracyRate = analysis.accuracyRate ?? analysis.accuracy_rate ?? null
      let recoveryRate = analysis.recoveryRate ?? analysis.recovery_rate ?? null
      const cropType = analysis.cropType ?? analysis.crop_type ?? analysis.leafType ?? analysis.leaf_type ?? null

      const normalizedCropType =
        cropType && String(cropType).trim() ? String(cropType).trim() : null

      // If the model could not recognize any crop/leaf type, treat it as a non-plant image.
      if (!normalizedCropType && !isOfflineResult) {
        setLoading(false)
        setError(
          'The uploaded image does not appear to be a plant or recognizable crop leaf. Please upload a clear photo of the affected crop.'
        )
        if (fileInputRef.current) {
          try {
            fileInputRef.current.value = ''
          } catch {}
        }
        return
      }

      // Always generate recommendations and insights from OpenRouter when online.
      // When offline, fall back to whatever came from the analysis or simple defaults.
      let recommendations = null
      let insights = null

      if (isOfflineResult) {
        recommendations = analysis.recommendations ?? 'No recommendations.'
        insights = analysis.insights ?? 'No insights.'
      } else {
        const analysisSummary = {
          timeTaken: typeof timeTaken === 'number' ? timeTaken : (timeTaken != null ? parseFloat(String(timeTaken)) : null),
          accuracyRate: typeof accuracyRate === 'number' ? accuracyRate : (accuracyRate != null ? parseInt(String(accuracyRate), 10) : null),
          recoveryRate: typeof recoveryRate === 'number' ? recoveryRate : (recoveryRate != null ? parseInt(String(recoveryRate), 10) : null),
          cropType: normalizedCropType,
          imageDescription: 'Crop leaf image captured by the user for health analysis.',
        }

        try {
          const [recRes, insRes] = await Promise.all([
            getRecommendations(analysisSummary).catch((err) => {
              console.warn('Recommendations API error:', err)
              return { recommendations: null }
            }),
            getInsights(analysisSummary).catch((err) => {
              console.warn('Insights API error:', err)
              return { insights: null }
            }),
          ])

          recommendations = recRes.recommendations ?? recRes.text ?? null
          insights = insRes.insights ?? insRes.text ?? null

          // If OpenRouter provided a numeric recoveryRate, prefer it.
          if (typeof insRes?.recoveryRate === 'number') {
            recoveryRate = insRes.recoveryRate
          }
        } catch (apiErr) {
          console.error('OpenRouter API error during live analysis:', apiErr)
        }

        if (!recommendations) {
          recommendations = 'No recommendations.'
        }
        if (!insights) {
          insights = 'No insights.'
        }
      }

      const record = {
        timeTaken: typeof timeTaken === 'number' ? timeTaken : (timeTaken != null ? parseFloat(String(timeTaken)) : null),
        accuracyRate: typeof accuracyRate === 'number' ? accuracyRate : (accuracyRate != null ? parseInt(String(accuracyRate), 10) : null),
        recoveryRate: typeof recoveryRate === 'number' ? recoveryRate : (recoveryRate != null ? parseInt(String(recoveryRate), 10) : null),
        cropType: normalizedCropType,
        recommendations,
        insights,
        imageUrl: imagePreview || analysis.imageUrl || null, // Temporary preview URL
        timestamp: analysis.timestamp || new Date().toISOString(),
        imageFile: imageFile, // Always include imageFile so it gets uploaded to Supabase Storage
        offline: isOfflineResult,
      }
      setOfflineAnalysisCache(record)
      setResult(record)
      setLoading(false)
      // Clear uploaded/captured image after analysis so user starts fresh
      setImageFile(null)
      setImagePreview(null)
      if (fileInputRef.current) {
        try {
          fileInputRef.current.value = ''
        } catch {}
      }
      if (!isOfflineResult) {
        saveAnalysis(user.uid, record).then(() => loadHistory()).catch((err) => console.warn('Save analysis failed:', err))
        // Notify user of analysis completion
        if (user?.email) {
          notifyAnalysisComplete(user.email, record).catch((err) => 
            console.warn('Failed to send analysis notification:', err)
          )
        }
      }
    } catch (err) {
      const errorMsg = err.message || 'Analysis failed'

      // If this came from backend leaf validation explicitly, mark it clearly.
      if (err.validationFailed || isLeafValidationError(errorMsg)) {
        const suggestion = getValidationSuggestion(errorMsg)
        setError(
          `Leaf validation failed: ${errorMsg}${suggestion ? `\n\n${suggestion}` : ''}`
        )
      } else {
        setError(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = async () => {
    const list = history.length ? history : (result.timestamp ? [result] : [])
    if (!list.length) {
      setError(t('noHistoryToExport'))
      return
    }
    try {
      await exportAnalysisPDF(list)
    } catch (err) {
      setError(err.message || t('pdfExportFailed'))
    }
  }

  return (
    <div className="space-y-0">
      <HeroSection />
      <HowItWorks />
      <Testimonials />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <LocationWarningBanner />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 max-w-4xl" id="dashboard-title">
            {t('dashboardTitle')}
          </h2>
          <DemoTestButton onDemoClick={handleDemoTest} disabled={loading} />
        </div>
        {isDemo && (
          <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-200 text-sm flex items-center gap-2" role="status">
            <span className="text-lg">🧪</span>
            <span>{t('demoModeBanner')}</span>
          </div>
        )}
        {result.offline && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-sm flex items-center gap-2" role="status">
            <span className="text-lg">📴</span>
            <span>{t('offlineBannerText')}</span>
          </div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm" role="alert">
            {error}
          </div>
        )}

        {/* Vertical flow: image & scan section at top, metrics in the middle (inside PrimaryAnalysisFrame), 
           then expandable insights (SecondaryInsightsFrame) below */}
        <div className="space-y-6">
          <div id="scan" ref={scanSectionRef}>
            <PrimaryAnalysisFrame
              imagePreview={imagePreview}
              result={result}
              loading={loading}
              onLoadOrTake={handleCapture}
              onCapture={handleOpenCamera}
              onAnalyze={handleAnalyze}
              fileInputRef={fileInputRef}
              onFileChange={handleFileChange}
              hasImage={!!imageFile}
            />
          </div>
          <SecondaryInsightsFrame
            recommendations={result.recommendations}
            insights={result.insights}
            history={history}
            accuracyRate={result.accuracyRate}
            recoveryRate={result.recoveryRate}
            onLoadHistory={loadHistory}
            onExportPDF={handleExportPDF}
          />
        </div>
      </div>
      <CameraCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCaptured}
      />
      {/* Floating AI assistant chat in bottom-right of the dashboard */}
      <ChatbotWidget />
    </div>
  )
}
