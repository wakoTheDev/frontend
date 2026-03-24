import { Router } from 'express'
import { logger } from '../utils/logger.js'
import { sendFeedbackEmail, sendFeedbackReplyEmail, getSupportEmail } from '../services/emailService.js'
import { supabaseAdmin } from '../services/supabaseAdmin.js'

export const feedbackRouter = Router()

// Receive feedback from frontend and email it to system owners
feedbackRouter.post('/feedback', async (req, res) => {
  try {
    const { type, message, rating, survey, screenshotUrls, userEmail, userId } = req.body || {}

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return res.status(400).json({ message: 'Feedback message is required.' })
    }

    const payload = {
      type: type || 'other',
      message: message.trim(),
      rating: rating ?? null,
      survey: survey?.trim?.() || null,
      screenshotUrls: Array.isArray(screenshotUrls) ? screenshotUrls : [],
      userEmail: userEmail || null,
      userId: userId || null,
    }

    logger.info('Received feedback submission', {
      type: payload.type,
      rating: payload.rating,
      hasScreenshots: payload.screenshotUrls.length > 0,
    })

    const ownerEmail = process.env.FEEDBACK_EMAIL || getSupportEmail()
    const result = await sendFeedbackEmail(ownerEmail, payload)

    if (!result.success) {
      logger.warn('Feedback email not sent, but feedback logged.', {
        reason: result.message || result.error,
      })
    }

    res.json({ message: 'Feedback received. Thank you!' })
  } catch (err) {
    logger.error('Feedback endpoint error:', err.message || err)
    res.status(500).json({ message: 'Failed to submit feedback. Please try again later.' })
  }
})

// Allow admins to reply to a feedback submission by email (optional).
// This endpoint does NOT store the reply in Supabase; it just sends an email to the user.
feedbackRouter.post('/feedback/reply', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
    if (!token) {
      return res.status(401).json({ message: 'Missing authorization token' })
    }

    // Admin-only check using service-role client.
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userRes?.user) {
      return res.status(401).json({ message: 'Invalid authorization' })
    }

    const adminUserId = userRes.user.id
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', adminUserId)
      .maybeSingle()

    if (pErr) {
      return res.status(403).json({ message: 'Admin check failed' })
    }

    if (!profile?.is_admin) {
      return res.status(403).json({ message: 'Admin privileges required' })
    }

    const { feedbackId, replyMessage, userEmail, type, message, rating, survey } = req.body || {}

    if (!replyMessage || typeof replyMessage !== 'string' || replyMessage.trim().length < 2) {
      return res.status(400).json({ message: 'Reply message is required.' })
    }

    if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
      return res.status(400).json({ message: 'Valid userEmail is required.' })
    }

    const payload = {
      replyMessage: replyMessage.trim(),
      type: type || 'Feedback',
      message: message || null,
      rating: typeof rating === 'number' ? rating : null,
      survey: survey || null,
      userEmail,
      feedbackId: feedbackId || null,
    }

    const result = await sendFeedbackReplyEmail(userEmail, payload)

    if (!result?.success) {
      const detail = result?.error || result?.message || 'Unknown error'
      logger.warn('Feedback reply email not sent:', detail)
      const status = /not configured|initialization failed/i.test(detail) ? 503 : 502
      return res.status(status).json({
        message: 'Could not send the reply email. Check server email settings (SMTP).',
        error: detail,
      })
    }

    res.json({ message: 'Reply processed.' })
  } catch (err) {
    logger.error('Feedback reply endpoint error:', err?.stack || err?.message || err)
    res.status(500).json({
      message: 'Failed to send reply. Please try again later.',
      error: err?.message || String(err),
    })
  }
})

