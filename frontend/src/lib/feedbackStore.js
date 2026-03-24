import { supabase } from './supabaseClient'

const BUCKET = 'feedback-screenshots'
const TABLE = 'feedback'

function sanitizeFileName(name = '') {
  return String(name).replace(/[^a-zA-Z0-9.-]/g, '_')
}

/**
 * Upload screenshots to Supabase Storage and store feedback in Supabase DB.
 */
export async function submitFeedbackToSupabase({
  userId,
  userEmail,
  type,
  message,
  rating = null,
  survey = null,
  screenshotFiles = [],
}) {
  if (!supabase) throw new Error('Supabase client not configured')
  if (!userId) throw new Error('userId is required')

  const uploaded = await Promise.all(
    screenshotFiles.map(async (file, idx) => {
      const ts = Date.now()
      const path = `${userId}/feedback/${ts}_${idx}_${sanitizeFileName(file.name)}`

      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })

      if (uploadErr) {
        throw new Error(uploadErr.message || 'Failed to upload screenshot')
      }

      return { path }
    }),
  )

  const screenshot_paths = uploaded.map((u) => u.path)

  // Signed URLs for backend email + immediate download links.
  // We still store paths so the admin panel can re-generate later.
  const signedExpirySeconds = 60 * 60 * 24 * 7 // 7 days
  const screenshot_signed_urls = await Promise.all(
    screenshot_paths.map(async (path) => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, signedExpirySeconds)
      if (error) return null
      return data?.signedUrl || null
    }),
  )

  const cleanSignedUrls = screenshot_signed_urls.filter(Boolean)

  const { data: row, error: insertErr } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      user_email: userEmail || null,
      type,
      message,
      rating,
      survey,
      screenshot_paths,
    })
    .select('id, created_at')
    .maybeSingle()

  if (insertErr) {
    throw new Error(insertErr.message || 'Failed to save feedback record')
  }

  return {
    id: row?.id,
    createdAt: row?.created_at,
    screenshot_signed_urls: cleanSignedUrls,
  }
}

