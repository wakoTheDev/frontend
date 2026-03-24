/** Public support / developer contact (mailto, email footers). */
export const DEFAULT_SUPPORT_EMAIL = 'aipoweredcropcare@zohomail.com'

/** Support address shown to users and in templates. Override with SUPPORT_EMAIL in .env */
export function getSupportEmail() {
  return process.env.SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL
}

/**
 * From address for admin feedback replies (must match your SMTP account for deliverability).
 * Defaults to the Zoho support mailbox. Override with FEEDBACK_REPLY_FROM.
 */
export function getFeedbackReplyFromEmail() {
  // Prefer explicit reply-from, then EMAIL_FROM (must match a sender verified in Brevo/Gmail).
  return process.env.FEEDBACK_REPLY_FROM || process.env.EMAIL_FROM || getSupportEmail()
}

/** Nodemailer + Brevo often put extra detail on the error object */
function formatSmtpError(err) {
  if (!err) return 'Unknown error'
  const parts = [err.message || String(err)]
  if (err.response) parts.push(String(err.response).trim())
  if (err.responseCode != null) parts.push(`smtp=${err.responseCode}`)
  if (err.code) parts.push(`code=${err.code}`)
  const joined = parts.filter(Boolean).join(' — ')
  const lower = joined.toLowerCase()
  let hint = ''
  if (/535|authentication failed|invalid login|535 5\.7\.8/i.test(lower)) {
    hint +=
      ' For Brevo: use the SMTP key from Brevo → SMTP & API → SMTP (create/copy SMTP key). Do not use the "API keys" xkeysib key as the password.'
  }
  if (/sender|not verified|invalid from|from address/i.test(lower)) {
    hint +=
      ' Set EMAIL_FROM / FEEDBACK_REPLY_FROM to an address verified in Brevo (Senders).'
  }
  return joined + hint
}

// Dynamically import nodemailer to handle cases where it's not installed
let nodemailer = null
let nodemailerLoaded = false

async function loadNodemailer() {
  if (nodemailerLoaded) return nodemailer !== null
  nodemailerLoaded = true
  
  try {
    const nodemailerModule = await import('nodemailer')
    nodemailer = nodemailerModule.default
    return true
  } catch (err) {
    console.warn('⚠️  nodemailer not installed. Email sending will be disabled.')
    console.warn('   Install with: npm install nodemailer')
    nodemailer = null
    return false
  }
}

// Initialize email transporter
let transporter = null
let transporterInitialized = false

async function initializeEmailService() {
  if (transporterInitialized) return transporter
  transporterInitialized = true

  const nodemailerAvailable = await loadNodemailer()
  if (!nodemailerAvailable || !nodemailer) {
    console.warn('⚠️  Nodemailer not available. Email sending disabled.')
    return null
  }

  try {
    const smtpUser = process.env.SMTP_USER
    const smtpPassword = process.env.SMTP_PASSWORD
    const sendGridKey = process.env.SENDGRID_API_KEY?.trim()

    // Prefer explicit SMTP (Zoho, Gmail, etc.) when set — avoids mis-detecting Brevo/other keys as SendGrid.
    // SendGrid API keys start with "SG."; keys like "xkeysib-..." are Brevo and must use Brevo SMTP, not SendGrid.
    const useSendGrid =
      sendGridKey &&
      sendGridKey.startsWith('SG.') &&
      (!smtpUser || !smtpPassword)

    if (useSendGrid) {
      transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: sendGridKey,
        },
      })
      return transporter
    }

    if (!smtpUser || !smtpPassword) {
      if (sendGridKey && !sendGridKey.startsWith('SG.')) {
        console.warn(
          '⚠️  SENDGRID_API_KEY is set but is not a SendGrid key (expected SG.*). Use SMTP_* for Zoho/Brevo/Gmail, or unset the wrong key.'
        )
      }
      console.warn('⚠️  Email service not configured. Set SMTP_USER and SMTP_PASSWORD (or a real SendGrid SG.* key).')
      return null
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com'
    const isBrevo = /brevo\.com|sendinblue\.com/i.test(host)

    const emailConfig = {
      host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false, // 587 + STARTTLS
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      // Brevo relay: STARTTLS + valid server cert (see https://developers.brevo.com/docs/smtp-integration)
      ...(isBrevo
        ? {
            requireTLS: true,
            tls: {
              minVersion: 'TLSv1.2',
              rejectUnauthorized: true,
            },
          }
        : {
            tls: {
              rejectUnauthorized: false,
            },
          }),
    }

    transporter = nodemailer.createTransport(emailConfig)
    
    // Verify connection asynchronously (don't block)
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Email service verification failed:', error.message)
      } else {
        console.log('✅ Email service ready')
      }
    })

    return transporter
  } catch (err) {
    console.error('❌ Email service initialization error:', err.message)
    return null
  }
}

/**
 * Send account deletion confirmation email
 * @param {string} to - Recipient email address
 * @param {string} deletionLink - Secure deletion link
 * @param {string} userName - User's display name (optional)
 */
export async function sendDeletionEmail(to, deletionLink, userName = '') {
  try {
    let emailTransporter
    try {
      emailTransporter = await initializeEmailService()
    } catch (initErr) {
      console.warn('Email service initialization error:', initErr.message)
      console.log(`[DELETE ACCOUNT] Deletion link for ${to}: ${deletionLink}`)
      return { success: false, message: 'Email service initialization failed', error: initErr.message }
    }
    
    if (!emailTransporter) {
      console.warn('Email service not configured. Logging deletion link instead.')
      console.log(`[DELETE ACCOUNT] Deletion link for ${to}: ${deletionLink}`)
      return { success: false, message: 'Email service not configured' }
    }

    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@aicropcare.com'
    const fromName = process.env.EMAIL_FROM_NAME || 'AI-Powered CropCare'

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: 'Confirm Account Deletion - AI-Powered CropCare',
      text: generatePlainTextEmail(deletionLink, userName),
      html: generateHtmlEmail(deletionLink, userName),
      // Email headers for deliverability
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'List-Unsubscribe': `<mailto:${fromEmail}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      // SPF/DKIM/DMARC are handled by the email service provider
      // Ensure your domain has proper DNS records configured
    }

    const info = await emailTransporter.sendMail(mailOptions)
    console.log('✅ Deletion email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Failed to send deletion email:', formatSmtpError(error))
    // Log the link for development/testing
    console.log(`[DELETE ACCOUNT] Deletion link for ${to}: ${deletionLink}`)
    return { success: false, error: formatSmtpError(error) }
  }
}

/**
 * Send user feedback to the system owners.
 * @param {string} to - Owner/operations inbox (defaults to SUPPORT_EMAIL / getSupportEmail())
 * @param {object} feedback - Feedback payload from the app
 */
export async function sendFeedbackEmail(to, feedback) {
  const {
    type,
    message,
    rating,
    survey,
    screenshotUrls = [],
    userEmail,
    userId,
  } = feedback || {}

  try {
    let emailTransporter
    try {
      emailTransporter = await initializeEmailService()
    } catch (initErr) {
      console.warn('Email service initialization error (feedback):', initErr.message)
      console.log('[FEEDBACK]', JSON.stringify(feedback, null, 2))
      return { success: false, message: 'Email service initialization failed', error: initErr.message }
    }

    if (!emailTransporter) {
      console.warn('Email service not configured. Logging feedback instead of emailing.')
      console.log('[FEEDBACK]', JSON.stringify(feedback, null, 2))
      return { success: false, message: 'Email service not configured' }
    }

    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@aicropcare.com'
    const fromName = process.env.EMAIL_FROM_NAME || 'AI-Powered CropCare'
    const ownerEmail = to || process.env.FEEDBACK_EMAIL || getSupportEmail()

    const subject = `[CropCare Feedback] ${type || 'Feedback'} from ${userEmail || 'unknown user'}`

    const lines = []
    lines.push(`Type: ${type || 'N/A'}`)
    if (userEmail) lines.push(`User email: ${userEmail}`)
    if (userId) lines.push(`User ID: ${userId}`)
    if (typeof rating === 'number' && rating > 0) lines.push(`Rating: ${rating} / 5`)
    lines.push('')
    lines.push('Message:')
    lines.push(message || '(empty)')
    if (survey) {
      lines.push('')
      lines.push('Additional comments / survey:')
      lines.push(survey)
    }
    if (screenshotUrls.length) {
      lines.push('')
      lines.push('Screenshots:')
      screenshotUrls.forEach((url, idx) => {
        lines.push(`${idx + 1}. ${url}`)
      })
    }

    const textBody = lines.join('\n')

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: ownerEmail,
      subject,
      text: textBody,
    }

    const info = await emailTransporter.sendMail(mailOptions)
    console.log('✅ Feedback email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Failed to send feedback email:', formatSmtpError(error))
    console.log('[FEEDBACK]', JSON.stringify(feedback, null, 2))
    return { success: false, error: formatSmtpError(error) }
  }
}

/**
 * Send an email reply directly to the user who submitted feedback.
 * @param {string} to - User email address
 * @param {object} payload - { replyMessage, type, message, rating, survey, userEmail }
 */
export async function sendFeedbackReplyEmail(to, payload) {
  const { replyMessage, type, message, rating, survey, userEmail } = payload || {}
  try {
    let emailTransporter
    try {
      emailTransporter = await initializeEmailService()
    } catch (initErr) {
      console.warn('Email service initialization error (feedback reply):', initErr.message)
      console.log('[FEEDBACK REPLY]', JSON.stringify(payload, null, 2))
      return { success: false, message: 'Email service initialization failed', error: initErr.message }
    }

    if (!emailTransporter) {
      console.warn('Email service not configured. Logging feedback reply instead of emailing.')
      console.log('[FEEDBACK REPLY]', JSON.stringify({ to, ...payload }, null, 2))
      return { success: false, message: 'Email service not configured' }
    }

    const fromEmail = getFeedbackReplyFromEmail()
    const fromName = process.env.EMAIL_FROM_NAME || 'AI-Powered CropCare'
    const supportAddr = getSupportEmail()
    const recipient = to || userEmail || null

    if (!recipient) {
      return { success: false, message: 'Recipient email is required' }
    }

    const subject = `[CropCare Reply] ${type || 'Your feedback'}`

    const lines = []
    lines.push('Hello,')
    lines.push('')
    lines.push(replyMessage ? String(replyMessage).trim() : '(empty reply)')
    lines.push('')
    lines.push('---')
    lines.push('Original feedback:')
    lines.push(`Type: ${type || 'N/A'}`)
    if (typeof rating === 'number' && rating > 0) lines.push(`Rating: ${rating} / 5`)
    if (message) lines.push(`Message: ${message}`)
    if (survey) lines.push(`Additional comments: ${survey}`)
    lines.push('')
    lines.push(`For reference, contact: ${supportAddr}`)
    lines.push('')
    lines.push('Best regards,')
    lines.push('AI-Powered CropCare Team')

    const textBody = lines.join('\n')

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: recipient,
      subject,
      text: textBody,
    }

    const info = await emailTransporter.sendMail(mailOptions)
    console.log('✅ Feedback reply email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    const detail = formatSmtpError(error)
    console.error('❌ Failed to send feedback reply email:', detail)
    return { success: false, error: detail }
  }
}

function generatePlainTextEmail(deletionLink, userName) {
  const greeting = userName ? `Hello ${userName},` : 'Hello,'
  const support = getSupportEmail()

  return `${greeting}

You requested to delete your account. Click the link below to confirm. If you did not request this, ignore this email.

This action cannot be undone. All your data including:
- Your profile
- Analysis history
- Notification preferences
- All synced data

will be permanently deleted.

To confirm account deletion, click the link below (expires in 1 hour):
${deletionLink}

If the link doesn't work, copy and paste it into your browser.

If you have any questions, contact us at ${support}

Best regards,
AI-Powered CropCare Team

---
This is an automated message. Please do not reply to this email.`
}

function generateHtmlEmail(deletionLink, userName) {
  const greeting = userName ? `Hello ${userName},` : 'Hello,'
  const support = getSupportEmail()

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Account Deletion</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">AI-Powered CropCare</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #dc2626; margin-top: 0; font-size: 20px;">Confirm Account Deletion</h2>
    
    <p>${greeting}</p>
    
    <p style="font-size: 16px; line-height: 1.8; margin-bottom: 20px;">
      <strong>You requested to delete your account.</strong> Click the link below to confirm. <strong>If you did not request this, ignore this email.</strong>
    </p>
    
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b; font-weight: 600;">⚠️ This action cannot be undone.</p>
      <p style="margin: 10px 0 0 0; color: #7f1d1d; font-size: 14px;">
        All your data including your profile, analysis history, notification preferences, and all synced data will be permanently deleted.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${deletionLink}" 
         style="display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Confirm Account Deletion
      </a>
    </div>
    
    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${deletionLink}" style="color: #10b981; word-break: break-all;">${deletionLink}</a>
    </p>
    
    <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        This link will expire in <strong>1 hour</strong>.<br>
        If you have any questions, contact us at <a href="mailto:${support}" style="color: #10b981;">${support}</a>
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p>© 2026 AI-Powered CropCare. All Rights Reserved.</p>
    <p style="margin: 5px 0;">This is an automated message. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `.trim()
}
