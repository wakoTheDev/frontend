/**
 * Notification service for handling different types of notifications
 * Supports push notifications, email alerts, and in-app notifications
 */

const SETTINGS_KEY = 'cropcare-app-settings'

function getNotificationSettings() {
  try {
    const s = localStorage.getItem(SETTINGS_KEY)
    const parsed = s ? JSON.parse(s) : {}
    return {
      pushNotifications: parsed.pushNotifications !== false, // Default true
      emailAlerts: parsed.emailAlerts !== false, // Default true
      analysisAlerts: parsed.analysisAlerts !== false, // Default true
      weatherAlerts: parsed.weatherAlerts === true, // Default false
      marketingComms: parsed.marketingComms === true, // Default false
    }
  } catch {
    return {
      pushNotifications: true,
      emailAlerts: true,
      analysisAlerts: true,
      weatherAlerts: false,
      marketingComms: false,
    }
  }
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

/**
 * Show a browser push notification
 */
export async function showPushNotification(title, options = {}) {
  const settings = getNotificationSettings()
  if (!settings.pushNotifications) {
    return
  }

  const hasPermission = await requestNotificationPermission()
  if (!hasPermission) {
    return
  }

  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    })

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close()
    }, 5000)

    return notification
  } catch (err) {
    console.warn('Failed to show notification:', err)
  }
}

/**
 * Send email alert (would integrate with backend email service)
 */
export async function sendEmailAlert(userEmail, subject, body) {
  const settings = getNotificationSettings()
  if (!settings.emailAlerts || !userEmail) {
    return
  }

  try {
    // In a real implementation, this would call a backend API
    // For now, we'll just log it
    console.log('Email alert would be sent:', { userEmail, subject, body })
    
    // TODO: Integrate with backend email service
    // await fetch('/api/send-email', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ to: userEmail, subject, body }),
    // })
  } catch (err) {
    console.error('Failed to send email alert:', err)
  }
}

/**
 * Notify user when analysis is complete
 */
export async function notifyAnalysisComplete(userEmail, analysisResult) {
  const settings = getNotificationSettings()
  if (!settings.analysisAlerts) {
    return
  }

  const { accuracyRate, recoveryRate, recommendations } = analysisResult || {}

  const acc = typeof accuracyRate === 'number' ? accuracyRate : null
  const rec = typeof recoveryRate === 'number' ? recoveryRate : null

  const accText = acc != null ? `${acc}%` : 'N/A'
  const recText = rec != null ? `${rec}%` : 'N/A'

  const hasIssue = (acc != null && acc < 85) || (rec != null && rec < 80)
  const title = hasIssue
    ? '⚠️ Crop Analysis Complete - Action Required'
    : '✅ Crop Analysis Complete'
  
  const message = hasIssue
    ? `Analysis detected potential issues. Accuracy: ${accText}, Recovery: ${recText}`
    : `Analysis complete! Accuracy: ${accText}, Recovery: ${recText}`

  // Show push notification
  await showPushNotification(title, {
    body: message,
    tag: 'analysis-complete',
    requireInteraction: hasIssue,
  })

  // Send email if enabled
  if (userEmail) {
    const emailBody = `
Your crop analysis has been completed.

Results:
- Accuracy Rate: ${accText}
- Recovery Rate: ${recText}

${hasIssue ? '⚠️ Action Required: ' : ''}${recommendations || 'No specific recommendations.'}

View full details in your dashboard.
    `.trim()

    await sendEmailAlert(
      userEmail,
      title,
      emailBody
    )
  }
}

/**
 * Send weather alert (integrates with weather API)
 */
export async function sendWeatherAlert(userEmail, weatherData, userId) {
  const settings = getNotificationSettings()
  if (!settings.weatherAlerts || !weatherData) {
    return
  }

  const { condition, temperature, description, humidity, windSpeed } = weatherData
  const title = '🌤️ Weather Alert'
  const message = `${condition} - ${temperature}°C. ${description || ''}`

  await showPushNotification(title, {
    body: message,
    tag: 'weather-alert',
  })

  if (userEmail) {
    const emailBody = `
Weather Alert for Your Location

Current Conditions:
- Condition: ${condition}
- Temperature: ${temperature}°C
- Description: ${description || 'N/A'}
- Humidity: ${humidity || 'N/A'}%
- Wind Speed: ${windSpeed || 'N/A'} m/s

${condition === 'Thunderstorm' || condition === 'Heavy Rain' ? '⚠️ Severe weather detected. Take necessary precautions for your crops.' : ''}
${temperature < 5 ? '⚠️ Low temperature warning. Protect sensitive crops.' : ''}
${temperature > 35 ? '⚠️ High temperature warning. Ensure adequate irrigation.' : ''}

Stay updated with real-time weather alerts in your dashboard.
    `.trim()

    await sendEmailAlert(
      userEmail,
      title,
      emailBody
    )
  }

  // Store weather alert in Supabase if userId provided
  if (userId) {
    try {
      const { storeWeatherAlert } = await import('./weather')
      await storeWeatherAlert(userId, weatherData, 'weather')
    } catch (err) {
      console.warn('Failed to store weather alert:', err)
    }
  }
}

/**
 * Send marketing communication (only if user opted in)
 */
export async function sendMarketingCommunication(userEmail, subject, content) {
  const settings = getNotificationSettings()
  if (!settings.marketingComms || !userEmail) {
    return
  }

  await sendEmailAlert(userEmail, subject, content)
}
