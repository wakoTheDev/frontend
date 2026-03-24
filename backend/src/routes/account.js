import express from 'express'
import { supabaseAdmin } from '../services/supabaseAdmin.js'

const router = express.Router()

// Email service - lazy load
let emailServiceModule = null
async function getEmailService() {
  if (emailServiceModule) return emailServiceModule

  try {
    emailServiceModule = await import('../services/emailService.js')
    return emailServiceModule
  } catch (err) {
    console.warn('⚠️  Email service not available:', err.message)
    return {
      sendDeletionEmail: async (to, deletionLink, userName) => {
        console.log(`[DELETE ACCOUNT] Deletion link for ${to}: ${deletionLink}`)
        return { success: false, message: 'Email service not available' }
      },
    }
  }
}

/**
 * Remove user files from Supabase Storage (best-effort; continues on errors).
 */
async function deleteUserStorageFiles(userId) {
  if (!userId) return

  // Avatar: fixed path
  await supabaseAdmin.storage.from('avatars').remove([`${userId}/avatar.jpg`]).catch(() => {})

  // Crop analysis images: {userId}/{timestamp}_*
  const { data: cropFiles } = await supabaseAdmin.storage.from('crop-images').list(userId)
  if (cropFiles?.length) {
    const paths = cropFiles.map((f) => `${userId}/${f.name}`)
    await supabaseAdmin.storage.from('crop-images').remove(paths).catch(() => {})
  }

  // Feedback screenshots: {userId}/feedback/...
  const { data: fbFiles } = await supabaseAdmin.storage
    .from('feedback-screenshots')
    .list(`${userId}/feedback`)
  if (fbFiles?.length) {
    const paths = fbFiles.map((f) => `${userId}/feedback/${f.name}`)
    await supabaseAdmin.storage.from('feedback-screenshots').remove(paths).catch(() => {})
  }
}

// Request account deletion - generates token and sends email
router.post('/delete-request', async (req, res) => {
  try {
    const { uid, email } = req.body

    if (!uid || !email) {
      return res.status(400).json({ message: 'User ID and email are required' })
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    const { data, error } = await supabaseAdmin
      .from('account_deletions')
      .insert({
        user_id: uid,
        email,
        expires_at: expiresAt.toISOString(),
      })
      .select('token')
      .maybeSingle()

    if (error) {
      console.error('Supabase account_deletions insert error:', error)
      return res.status(500).json({ message: 'Failed to start account deletion request.' })
    }

    const token = data?.token
    if (!token) {
      return res.status(500).json({ message: 'Failed to create deletion token.' })
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const deletionLink = `${frontendUrl}/delete-account-confirm?token=${token}`

    let userName = ''
    try {
      const { data: profileRow } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', uid)
        .maybeSingle()
      if (profileRow?.full_name) {
        userName = profileRow.full_name
      }
    } catch (err) {
      console.warn('Could not fetch Supabase profile for deletion email:', err.message)
    }

    let emailResult = { success: false }
    try {
      const emailService = await getEmailService()
      emailResult = await emailService.sendDeletionEmail(email, deletionLink, userName)
    } catch (emailErr) {
      console.error('Email sending error:', emailErr)
      emailResult = { success: false, error: emailErr.message }
    }

    if (!emailResult.success) {
      console.warn('Email sending failed (link still generated):', emailResult.error || emailResult.message)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Deletion link for ${email}: ${deletionLink}`)
      }
    }

    res.status(200).json({
      message: 'Deletion link sent to your email. Please check your inbox.',
      ...(process.env.NODE_ENV === 'development' && { deletionLink }),
    })
  } catch (err) {
    console.error('Delete account request error:', err)
    res.status(500).json({
      message: err.message || 'Failed to process deletion request',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    })
  }
})

// Confirm account deletion - deletes user data in Supabase + auth user
router.post('/delete-confirm', async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ message: 'Deletion token is required' })
    }

    const { data: deletionData, error } = await supabaseAdmin
      .from('account_deletions')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (error) {
      console.error('Supabase account_deletions fetch error:', error)
      return res.status(500).json({ message: 'Failed to verify deletion token' })
    }

    if (!deletionData) {
      return res.status(404).json({ message: 'Invalid deletion token' })
    }

    if (deletionData.used) {
      return res.status(400).json({ message: 'This deletion link has already been used' })
    }

    const expiresAt = deletionData.expires_at ? new Date(deletionData.expires_at) : null
    if (!expiresAt || expiresAt < new Date()) {
      return res.status(410).json({ message: 'This deletion link has expired' })
    }

    const userId = deletionData.user_id

    try {
      await supabaseAdmin.from('profiles').delete().eq('id', userId)
      await supabaseAdmin.from('analysis_history').delete().eq('user_id', userId)
      await supabaseAdmin.from('feedback').delete().eq('user_id', userId).catch(() => {})
      await supabaseAdmin.from('weather_alerts').delete().eq('user_id', userId).catch(() => {})

      await deleteUserStorageFiles(userId)

      try {
        await supabaseAdmin.auth.admin.deleteUser(userId)
      } catch (authErr) {
        console.warn('Failed to delete Supabase auth user:', authErr.message || authErr)
      }

      await supabaseAdmin
        .from('account_deletions')
        .update({ used: true, deleted_at: new Date().toISOString() })
        .eq('token', token)

      res.json({ message: 'Account deleted successfully' })
    } catch (deleteErr) {
      console.error('Error deleting Supabase user data:', deleteErr)
      res.status(500).json({ message: 'Failed to delete account data' })
    }
  } catch (err) {
    console.error('Delete account confirmation error:', err)
    res.status(500).json({ message: 'Failed to process deletion confirmation' })
  }
})

export { router as accountRouter }
