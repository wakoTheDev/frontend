import { supabase } from './supabaseClient'

const PREDICT_URL = "https://web-production-0845d.up.railway.app/predict"
const EXPRESS_BASE = "http://localhost:3001/api"
const SETTINGS_KEY = 'cropcare-app-settings'
const OFFLINE_CACHE_KEY = 'cropcare-offline-analysis-cache'

function getAppSettings() {
  try {
    const s = localStorage.getItem(SETTINGS_KEY)
    return s ? JSON.parse(s) : {}
  } catch {
    return {}
  }
}

function isOfflineModeEnabled() {
  return !!getAppSettings().offlineMode
}

export function getOfflineAnalysisCache() {
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setOfflineAnalysisCache(record) {
  if (!record) return
  const payload = {
    timeTaken: record.timeTaken,
    accuracyRate: record.accuracyRate,
    recoveryRate: record.recoveryRate,
    cropType: record.cropType || null,
    recommendations: record.recommendations,
    insights: record.insights,
    imageUrl: record.imageUrl || null,
    timestamp: record.timestamp || new Date().toISOString(),
    offline: false,
  }
  try {
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(payload))
  } catch (e) {
    console.warn('Could not cache analysis for offline use', e)
  }
}

export async function analyzeCropImage(file) {
  const offline = !navigator.onLine
  const offlineMode = isOfflineModeEnabled()

  if (offline && offlineMode) {
    const cached = getOfflineAnalysisCache()
    if (cached) {
      return { ...cached, offline: true }
    }
    throw new Error('No cached analysis. Connect to the internet, run an analysis, then you can view cached results offline.')
  }

  // ✅ Step 1 — Validate image via Express → Claude vision
  const validateForm = new FormData()
  validateForm.append('file', file)

  const validateRes = await fetch(`${EXPRESS_BASE}/validate`, {
    method: 'POST',
    body: validateForm,
  })

  if (validateRes.ok) {
    const validation = await validateRes.json()
    if (!validation.isValid) {
      const error = new Error(validation.message || '❌ Invalid image. Please upload a crop leaf image to continue analyzing.')
      error.validationFailed = true
      throw error
    }
  }

  // ✅ Step 2 — Image passed, send to Python model
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(PREDICT_URL, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const error = new Error(err.message || err.detail || 'Analysis failed')
    if (err.validationFailed) {
      error.validationFailed = true
      error.reason = err.reason
    }
    throw error
  }

  const data = await res.json()

  const confidence = data.confidence ?? 0
  const accuracyRate = confidence <= 1
    ? Math.round(confidence * 100)
    : Math.round(confidence)

  const predictedClass = data.predicted_class ?? data.class_name ?? data.label ?? ''

  if (!predictedClass || accuracyRate < 20) {
    const error = new Error('❌ Invalid image. Please upload a crop leaf image to continue analyzing.')
    error.validationFailed = true
    throw error
  }

  return {
    cropType: predictedClass,
    accuracyRate,
    recoveryRate: data.is_healthy === true ? 95 : 60,
    timeTaken: data.time_taken ?? null,
    recommendations: data.recommendations ?? null,
    insights: data.insights ?? null,
    all_predictions: data.all_predictions ?? [],
    is_healthy: data.is_healthy ?? null,
    timestamp: new Date().toISOString(),
  }
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${EXPRESS_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err.message || err.error || err.detail || res.statusText || 'Request failed'
    throw new Error(msg)
  }
  return res.json()
}

export async function getRecommendations(analysisSummary) {
  if (!navigator.onLine && isOfflineModeEnabled()) {
    const cached = getOfflineAnalysisCache()
    if (cached?.recommendations) return { recommendations: cached.recommendations }
    throw new Error('Offline. Recommendations are available from cached analysis.')
  }
  return request('/recommendations', {
    method: 'POST',
    body: JSON.stringify({ analysisSummary }),
  })
}

export async function getInsights(analysisSummary) {
  if (!navigator.onLine && isOfflineModeEnabled()) {
    const cached = getOfflineAnalysisCache()
    if (cached?.insights) return { insights: cached.insights }
    throw new Error('Offline. Insights are available from cached analysis.')
  }
  return request('/insights', {
    method: 'POST',
    body: JSON.stringify({ analysisSummary }),
  })
}

export async function requestChat(question, context = {}, history = []) {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({ question, context, history }),
  })
}

export async function sendFeedback(payload) {
  return request('/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function replyToFeedback(payload) {
  const session = await supabase?.auth?.getSession?.().catch(() => null)
  const token = session?.data?.session?.access_token
  return request('/feedback/reply', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}