import { supabase } from './supabaseClient'

// Base URL for backend API.
// In development we proxy `/api` to http://localhost:3001 via Vite.
// In production (e.g. Vercel), set VITE_API_BASE_URL to your backend URL, e.g. https://your-backend.onrender.com/api
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
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

/**
 * Get cached analysis for offline use. Call setOfflineAnalysisCache(record) after each successful analysis.
 */
export function getOfflineAnalysisCache() {
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Store a serializable analysis record for offline use. Omit non-serializable fields (e.g. imageFile).
 */
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

  const formData = new FormData()
  formData.append('image', file)
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Analysis failed')
  }
  return res.json()
}

async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
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

// General chat endpoint for the in-app assistant
export async function requestChat(question, context = {}, history = []) {
  return request('/chat', {
    method: 'POST',
    body: JSON.stringify({ question, context, history }),
  })
}

// Send feedback to backend so it can email the system owners
export async function sendFeedback(payload) {
  return request('/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// Allow admins to reply to a feedback submission via email (optional feature).
export async function replyToFeedback(payload) {
  const session = await supabase?.auth?.getSession?.().catch(() => null)
  const token = session?.data?.session?.access_token
  return request('/feedback/reply', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}
