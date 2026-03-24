/**
 * Analysis history and crop image storage using Supabase.
 * - Images: Supabase Storage bucket "crop-images" (path: {userId}/{timestamp}_{filename})
 * - Records: Supabase table "analysis_history"
 *
 * Supabase setup:
 * 1. Create a storage bucket named "crop-images" (public so image URLs work in PDFs/exports).
 * 2. Create table:
 *    create table public.analysis_history (
 *      id uuid primary key default gen_random_uuid(),
 *      user_id uuid not null references auth.users(id) on delete cascade,
 *      time_taken numeric,
 *      accuracy_rate numeric,
 *      recovery_rate numeric,
 *      recommendations text,
 *      insights text,
 *      image_url text,
 *      timestamp timestamptz not null default now(),
 *      crop_type text
 *    );
 *    alter table public.analysis_history enable row level security;
 *    create policy "Users can manage own analyses" on public.analysis_history
 *      for all using (auth.uid() = user_id);
 * 3. Storage RLS: allow authenticated users to upload/list/read in their own folder.
 */

import { supabase } from './supabaseClient'

const BUCKET = 'crop-images'
const TABLE = 'analysis_history'

const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000

function getCacheKey(uid, filters = {}) {
  return `history_${uid}_${JSON.stringify(filters)}`
}

function getCached(key) {
  const cached = cache.get(key)
  if (!cached) return null
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return cached.data
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() })
}

/**
 * Upload image to Supabase Storage. Returns public URL or null on failure.
 * @param {string} uid - User id (Supabase auth user id)
 * @param {File|Blob} fileOrBlob
 * @param {string} [fileName] - Optional filename (e.g. crop-image.jpg)
 */
export async function uploadAnalysisImage(uid, fileOrBlob, fileName = 'crop-image.jpg') {
  if (!supabase || !uid) return null
  const timestamp = Date.now()
  const sanitized = (fileName || 'crop-image.jpg').replace(/[^a-zA-Z0-9.-]/g, '_')
  const path = `${uid}/${timestamp}_${sanitized}`

  const options = {}
  if (fileOrBlob instanceof File) {
    options.upsert = true
    options.contentType = fileOrBlob.type || 'image/jpeg'
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, fileOrBlob, options)
  if (error) {
    console.error('Supabase storage upload failed:', error)
    return null
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

/**
 * Save analysis: upload image to Supabase Storage (if imageFile/data URL provided), then insert row.
 * Returns the inserted record with id and imageUrl.
 */
export async function saveAnalysis(uid, record) {
  if (!supabase || !uid) throw new Error('Supabase not configured or user not signed in')

  let imageUrl = record.imageUrl || null

  if (record.imageFile && record.imageFile instanceof File) {
    const url = await uploadAnalysisImage(uid, record.imageFile, record.imageFile.name)
    if (url) {
      imageUrl = url
      console.log('Image uploaded to Supabase Storage:', imageUrl)
    }
  }

  if (!imageUrl && record.imageUrl && typeof record.imageUrl === 'string' && record.imageUrl.startsWith('data:')) {
    try {
      const response = await fetch(record.imageUrl)
      const blob = await response.blob()
      const url = await uploadAnalysisImage(uid, blob, 'crop-image.jpg')
      if (url) {
        imageUrl = url
        console.log('Data URL image uploaded to Supabase Storage:', imageUrl)
      } else {
        imageUrl = record.imageUrl
      }
    } catch (e) {
      console.error('Failed to upload data URL image to Supabase:', e)
      imageUrl = record.imageUrl
    }
  }

  const payload = {
    user_id: uid,
    time_taken: record.timeTaken ?? null,
    accuracy_rate: record.accuracyRate ?? null,
    recovery_rate: record.recoveryRate ?? null,
    recommendations: record.recommendations ?? '',
    insights: record.insights ?? '',
    image_url: imageUrl || record.imageUrl || null,
    timestamp: record.timestamp || new Date().toISOString(),
    crop_type: record.cropType ?? null,
  }

  const { data: row, error } = await supabase.from(TABLE).insert(payload).select('id, user_id, time_taken, accuracy_rate, recovery_rate, recommendations, insights, image_url, timestamp, crop_type').single()
  if (error) {
    console.error('Supabase analysis_history insert failed:', error)
    throw new Error(error.message || 'Failed to save analysis')
  }

  invalidateHistoryCache(uid)

  return {
    id: row.id,
    userId: row.user_id,
    timeTaken: row.time_taken,
    accuracyRate: row.accuracy_rate,
    recoveryRate: row.recovery_rate,
    recommendations: row.recommendations,
    insights: row.insights,
    imageUrl: row.image_url,
    timestamp: row.timestamp,
    cropType: row.crop_type,
  }
}

/**
 * Get analysis history with optional filters.
 */
export async function getAnalysisHistory(uid, filters = {}) {
  if (!supabase || !uid) return []

  const cacheKey = getCacheKey(uid, filters)
  if (!filters.dateFrom && !filters.dateTo) {
    const cached = getCached(cacheKey)
    if (cached) return cached
  }

  let q = supabase
    .from(TABLE)
    .select('id, user_id, time_taken, accuracy_rate, recovery_rate, recommendations, insights, image_url, timestamp, crop_type')
    .eq('user_id', uid)
    .order('timestamp', { ascending: false })

  if (filters.dateFrom) {
    const from = filters.dateFrom instanceof Date ? filters.dateFrom : new Date(filters.dateFrom)
    q = q.gte('timestamp', from.toISOString())
  }
  if (filters.dateTo) {
    const to = filters.dateTo instanceof Date ? filters.dateTo : new Date(filters.dateTo)
    to.setHours(23, 59, 59, 999)
    q = q.lte('timestamp', to.toISOString())
  }

  const { data: rows, error } = await q
  if (error) {
    console.error('Supabase analysis_history query failed:', error)
    return []
  }

  let results = (rows || []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    timeTaken: r.time_taken,
    accuracyRate: r.accuracy_rate,
    recoveryRate: r.recovery_rate,
    recommendations: r.recommendations,
    insights: r.insights,
    imageUrl: r.image_url,
    timestamp: r.timestamp,
    cropType: r.crop_type,
  }))

  if (filters.cropType) {
    const cropLower = filters.cropType.toLowerCase()
    results = results.filter((r) => {
      const identifiedCrop = (r.cropType || '').toLowerCase()
      const recText = (r.recommendations || '').toLowerCase()
      const insightsText = (r.insights || '').toLowerCase()
      return identifiedCrop.includes(cropLower) || recText.includes(cropLower) || insightsText.includes(cropLower)
    })
  }
  if (filters.location) {
    const locLower = filters.location.toLowerCase()
    results = results.filter((r) => {
      const recText = (r.recommendations || '').toLowerCase()
      const insightsText = (r.insights || '').toLowerCase()
      return recText.includes(locLower) || insightsText.includes(locLower)
    })
  }
  if (filters.diseasePestCategory) {
    const categoryLower = filters.diseasePestCategory.toLowerCase()
    const keywords = {
      fungal: ['fungus', 'fungal', 'mold', 'mildew', 'blight', 'rot', 'spot'],
      bacterial: ['bacterial', 'bacteria', 'blight', 'wilt'],
      viral: ['virus', 'viral', 'mosaic'],
      pest: ['pest', 'insect', 'aphid', 'mite', 'worm', 'beetle', 'caterpillar'],
      nutrient: ['nutrient', 'deficiency', 'nitrogen', 'phosphorus', 'potassium'],
      environmental: ['drought', 'water', 'moisture', 'temperature', 'humidity'],
    }
    const keywordsToCheck = keywords[categoryLower] || [categoryLower]
    results = results.filter((r) => {
      const recText = (r.recommendations || '').toLowerCase()
      const insightsText = (r.insights || '').toLowerCase()
      const combined = recText + ' ' + insightsText
      return keywordsToCheck.some((kw) => combined.includes(kw))
    })
  }

  if (!filters.dateFrom && !filters.dateTo) {
    setCache(cacheKey, results)
  }

  return results
}

export function invalidateHistoryCache(uid) {
  const keysToDelete = []
  for (const key of cache.keys()) {
    if (key.startsWith(`history_${uid}_`)) keysToDelete.push(key)
  }
  keysToDelete.forEach((k) => cache.delete(k))
}
