import { useState, useEffect } from 'react'
import { MapPin, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../contexts/AppSettingsContext'
import { getUserProfile } from '../lib/supabase'
import { requestLocationPermission } from '../lib/location'
import { setUserProfile } from '../lib/supabase'

/**
 * Banner component that shows when weather alerts are enabled but location is denied
 */
export default function LocationWarningBanner() {
  const { user } = useAuth()
  const t = useTranslation()
  const [show, setShow] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if (!user?.uid) return

    const checkLocationStatus = async () => {
      try {
        const profile = await getUserProfile(user.uid)
        const localSettings = JSON.parse(localStorage.getItem('cropcare-app-settings') || '{}')
        const weatherAlertsEnabled = localSettings.weatherAlerts === true
        
        // Show banner if weather alerts are enabled but location is denied/not set
        if (weatherAlertsEnabled && !profile?.locationPermissionGranted) {
          setShow(true)
        } else {
          setShow(false)
        }
      } catch (err) {
        console.warn('Failed to check location status:', err)
      }
    }

    checkLocationStatus()
    
    // Check periodically (every 30 seconds) in case settings change
    const interval = setInterval(checkLocationStatus, 30000)
    return () => clearInterval(interval)
  }, [user?.uid])

  const handleEnableLocation = async () => {
    if (!user?.uid) return
    
    setRequesting(true)
    try {
      const result = await requestLocationPermission()
      
      if (result.granted && result.location) {
        await setUserProfile(user.uid, {
          location: {
            latitude: result.location.latitude,
            longitude: result.location.longitude,
            accuracy: result.location.accuracy,
            lastUpdated: new Date().toISOString(),
          },
          locationPermissionGranted: true,
        })
        setShow(false)
      } else {
        // Show error but keep banner visible
        console.warn('Failed to get location:', result.error)
      }
    } catch (err) {
      console.error('Failed to enable location:', err)
    } finally {
      setRequesting(false)
    }
  }

  const handleDismiss = () => {
    setShow(false)
    // Don't show again for this session
    sessionStorage.setItem('location-warning-dismissed', 'true')
  }

  // Check if dismissed in this session
  useEffect(() => {
    if (sessionStorage.getItem('location-warning-dismissed') === 'true') {
      setShow(false)
    }
  }, [])

  if (!show) return null

  return (
    <div
      className="bg-amber-50 dark:bg-amber-900/30 border-l-4 border-amber-400 dark:border-amber-500 p-4 mb-4"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <MapPin className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {t('weatherAlertsRequireLocation')}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            {t('enableLocationForWeatherAlerts')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleEnableLocation}
            disabled={requesting}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {requesting ? t('requesting') : t('enableLocation')}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
            aria-label={t('dismiss')}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
