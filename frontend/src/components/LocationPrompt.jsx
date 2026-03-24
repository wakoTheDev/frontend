import { useState, useEffect } from 'react'
import { MapPin, X } from 'lucide-react'
import { requestLocationPermission } from '../lib/location'
import { setUserProfile } from '../lib/supabase'
import { useTranslation } from '../contexts/AppSettingsContext'

/**
 * Location permission prompt component
 * Shows after user signs in to request location access
 */
export default function LocationPrompt({ userId, onComplete }) {
  const t = useTranslation()
  const [show, setShow] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [status, setStatus] = useState(null) // 'granted', 'denied', 'error'
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    // Check if location was already granted
    if (!userId) return
    
    // Show prompt if location not yet stored
    const checkLocation = async () => {
      // We'll check Supabase profile, but for now show prompt
      setShow(true)
    }
    checkLocation()
  }, [userId])

  const handleAllow = async () => {
    setRequesting(true)
    setStatus(null)
    setErrorMessage('')

    try {
      const result = await requestLocationPermission()
      
      if (result.granted && result.location && userId) {
        // Save location to Supabase
        try {
          await setUserProfile(userId, {
            location: {
              latitude: result.location.latitude,
              longitude: result.location.longitude,
              accuracy: result.location.accuracy,
              lastUpdated: new Date().toISOString(),
            },
            locationPermissionGranted: true,
          })
          
          setStatus('granted')
          setTimeout(() => {
            setShow(false)
            onComplete?.(result.location)
          }, 2000)
        } catch (saveErr) {
          console.error('Failed to save location:', saveErr)
          setStatus('error')
          setErrorMessage('Location obtained but failed to save. Please try again.')
        }
      } else {
        // Show specific error message
        setStatus('denied')
        const errorMsg = result.error || 'Location access denied'
        setErrorMessage(errorMsg)
        
        // Log error code for debugging
        if (result.errorCode) {
          console.log('Location error code:', result.errorCode)
        }
        
        if (userId) {
          try {
            await setUserProfile(userId, {
              locationPermissionGranted: false,
              locationError: result.errorCode || 'UNKNOWN',
            })
          } catch (saveErr) {
            console.warn('Failed to save permission status:', saveErr)
          }
        }
      }
    } catch (err) {
      console.error('Failed to get location:', err)
      setStatus('error')
      setErrorMessage(err.message || 'An unexpected error occurred')
    } finally {
      setRequesting(false)
    }
  }

  const handleDeny = async () => {
    setShow(false)
    if (userId) {
      await setUserProfile(userId, {
        locationPermissionGranted: false,
      })
    }
    onComplete?.(null)
  }

  if (!show) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-prompt-title"
      aria-describedby="location-prompt-description"
    >
      <div className="glass-modal dark:glass-modal-dark rounded-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3
                id="location-prompt-title"
                className="text-lg font-semibold text-slate-900 dark:text-white"
              >
                {t('locationPermissionTitle')}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDeny}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label={t('close')}
          >
            <X size={20} />
          </button>
        </div>

        <p
          id="location-prompt-description"
          className="text-slate-700 dark:text-slate-200 text-sm"
        >
          {t('locationPermissionDescription')}
        </p>

        {status === 'granted' && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm">
            {t('locationPermissionGranted')}
          </div>
        )}

        {status === 'denied' && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm space-y-2">
            <p className="font-medium">{t('locationPermissionDenied')}</p>
            <p className="text-xs font-medium mt-1 text-amber-800 dark:text-amber-200">
              {t('weatherAlertsRequireLocation')}. {t('enableLocationForWeatherAlerts')}
            </p>
            {errorMessage && (
              <p className="text-xs opacity-90 mt-1">{errorMessage}</p>
            )}
            <div className="text-xs mt-2 space-y-1">
              <p><strong>How to fix:</strong></p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Look for a lock 🔒 or location 📍 icon in your browser&apos;s address bar</li>
                <li>Click it and change location permission from &quot;Block&quot; to &quot;Allow&quot;</li>
                <li>Or go to browser Settings → Privacy → Site Settings → Location</li>
                <li>Refresh the page and click &quot;Try Again&quot;</li>
                {window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
                  <li className="text-red-600 dark:text-red-400 font-medium mt-1">⚠️ <strong>Important:</strong> Location access requires HTTPS. Please access this site via HTTPS (secure connection).</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm space-y-2">
            <p className="font-medium">{t('locationPermissionError')}</p>
            {errorMessage && (
              <p className="text-xs opacity-90">{errorMessage}</p>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {status === 'denied' || status === 'error' ? (
            <>
              <button
                type="button"
                onClick={handleDeny}
                className="flex-1 px-4 py-2 rounded-lg glass-input text-slate-800 dark:text-slate-200 font-medium hover:bg-white/30 backdrop-blur-sm transition-all"
              >
                {t('notNow')}
              </button>
              <button
                type="button"
                onClick={handleAllow}
                disabled={requesting}
                className="flex-1 px-4 py-2 rounded-lg glass-button text-white font-medium disabled:opacity-50 transition-all"
              >
                {requesting ? t('requesting') : t('tryAgain')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDeny}
                className="flex-1 px-4 py-2 rounded-lg glass-input text-slate-800 dark:text-slate-200 font-medium hover:bg-white/30 backdrop-blur-sm transition-all"
              >
                {t('notNow')}
              </button>
              <button
                type="button"
                onClick={handleAllow}
                disabled={requesting || status === 'granted'}
                className="flex-1 px-4 py-2 rounded-lg glass-button text-white font-medium disabled:opacity-50 transition-all"
              >
                {requesting ? t('requesting') : status === 'granted' ? t('granted') : t('allow')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
