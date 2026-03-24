import { useEffect, useRef } from 'react'
import { getCurrentWeather, shouldSendWeatherAlert } from '../lib/weather'
import { sendWeatherAlert } from '../lib/notifications'
import { getUserProfile } from '../lib/supabase'

/**
 * Hook to monitor weather and send alerts based on user location
 */
export function useWeatherMonitoring(userId, userEmail, enabled = true) {
  const intervalRef = useRef(null)
  const lastAlertTimeRef = useRef(0)

  useEffect(() => {
    if (!userId || !enabled) return

    const checkWeather = async () => {
      try {
        // Get user location from profile
        const profile = await getUserProfile(userId)
        const location = profile?.location

        if (!location?.latitude || !location?.longitude) {
          return // No location available
        }

        // Fetch current weather
        const weatherData = await getCurrentWeather(
          location.latitude,
          location.longitude
        )

        // Check if alert should be sent (avoid spamming - max once per hour)
        const now = Date.now()
        const oneHour = 60 * 60 * 1000
        if (now - lastAlertTimeRef.current < oneHour) {
          return
        }

        if (shouldSendWeatherAlert(weatherData)) {
          await sendWeatherAlert(userEmail, weatherData, userId)
          lastAlertTimeRef.current = now
        }
      } catch (err) {
        console.warn('Weather monitoring error:', err)
      }
    }

    // Check weather immediately
    checkWeather()

    // Then check every 30 minutes
    intervalRef.current = setInterval(checkWeather, 30 * 60 * 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [userId, userEmail, enabled])
}
