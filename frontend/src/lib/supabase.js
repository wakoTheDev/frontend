/**
 * User profile + avatars — Supabase (`profiles` table + `avatars` storage bucket).
 * Uses the shared client from `supabaseClient.js`.
 * Analysis history: `analysisStore.js`; weather alerts: `weatherAlertsStore.js`.
 */
import { supabase } from './supabaseClient'

/**
 * Supabase `profiles` rows typically use snake_case columns. The UI uses camelCase.
 * Map both directions so upserts don't fail with PGRST204 / unknown column errors.
 */
const PROFILE_CAMEL_TO_SNAKE = {
  fullName: 'full_name',
  phone: 'phone',
  location: 'location',
  accountType: 'account_type',
  farmSize: 'farm_size',
  primaryCrops: 'primary_crops',
  growingZone: 'growing_zone',
  photoURL: 'photo_url',
  notificationPreferences: 'notification_preferences',
  appSettings: 'app_settings',
  emailPreferences: 'email_preferences',
  locationPermissionGranted: 'location_permission_granted',
  locationError: 'location_error',
  getStartedGuideDismissed: 'get_started_guide_dismissed',
  getStartedGuideDismissedAt: 'get_started_guide_dismissed_at',
}

const PROFILE_SNAKE_TO_CAMEL = Object.fromEntries(
  Object.entries(PROFILE_CAMEL_TO_SNAKE).map(([camel, snake]) => [snake, camel]),
)

/** Keys we never accept from the client on profile upsert (security / schema noise). */
const PROFILE_UPSERT_STRIP = new Set(['is_admin', 'role'])

function mapProfileRowToFrontend(row) {
  if (!row) return null
  const out = { id: row.id }
  for (const [k, v] of Object.entries(row)) {
    if (k === 'id') continue
    if (k === 'updated_at') {
      out.updatedAt = v
      continue
    }
    const camel = PROFILE_SNAKE_TO_CAMEL[k] ?? k
    out[camel] = v
  }
  return out
}

function buildProfileUpsertPayload(uid, data) {
  const safe = data && typeof data === 'object' ? { ...data } : {}
  delete safe.id
  delete safe.updatedAt
  delete safe.updated_at
  delete safe.email

  for (const k of PROFILE_UPSERT_STRIP) {
    delete safe[k]
  }

  const out = { id: uid }
  for (const [k, v] of Object.entries(safe)) {
    const dbKey = PROFILE_CAMEL_TO_SNAKE[k] ?? k
    out[dbKey] = v
  }
  out.updated_at = new Date().toISOString()
  return out
}

export async function getUserProfile(uid) {
  if (!uid || !supabase) return null

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()

    if (error) {
      console.error('Supabase getUserProfile error:', error)
      return null
    }

    if (!data) return null
    return mapProfileRowToFrontend(data)
  } catch (err) {
    console.error('getUserProfile (Supabase) failed:', err)
    return null
  }
}

export async function setUserProfile(uid, data) {
  if (!uid || !supabase) return

  const payload = buildProfileUpsertPayload(uid, data)

  try {
    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })

    if (error) {
      console.error('Supabase setUserProfile error:', error)
      throw new Error(error.message || 'Failed to update profile')
    }

    try {
      return mapProfileRowToFrontend(payload)
    } catch (mapErr) {
      // DB write succeeded; mapping should not block success
      console.warn('mapProfileRowToFrontend after upsert:', mapErr)
      return { id: uid }
    }
  } catch (err) {
    console.error('setUserProfile (Supabase) failed:', err)
    throw err
  }
}

const AVATAR_BUCKET = 'avatars'
const AVATAR_PATH = (uid) => `${uid}/avatar.jpg`

export async function uploadProfilePhoto(uid, fileOrBlob) {
  if (!uid || !supabase) {
    throw new Error('Supabase is not configured for avatar upload')
  }

  const path = AVATAR_PATH(uid)
  const options = {
    upsert: true,
    contentType: fileOrBlob.type || 'image/jpeg',
  }

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, fileOrBlob, options)
  if (error) {
    console.error('Supabase avatar upload failed:', error)
    throw new Error(error.message || 'Failed to upload profile photo')
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return data?.publicUrl || null
}

export async function deleteProfilePhoto(uid) {
  if (!uid || !supabase) return

  const path = AVATAR_PATH(uid)
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path])
  if (error && !String(error.message || '').toLowerCase().includes('not found')) {
    console.error('Supabase avatar delete failed:', error)
    throw new Error(error.message || 'Failed to delete profile photo')
  }
}
