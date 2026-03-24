import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useAppSettings, useTranslation } from '../contexts/AppSettingsContext'
import { getUserProfile, setUserProfile } from '../lib/supabase'
import Toggle from '../components/Toggle'
import { requestNotificationPermission } from '../lib/notifications'

const SETTINGS_KEY = 'cropcare-app-settings'

function loadLocalSettings() {
  try {
    const s = localStorage.getItem(SETTINGS_KEY)
    return s ? JSON.parse(s) : {}
  } catch {
    return {}
  }
}

function saveLocalSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export default function Settings() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { refreshSettings } = useAppSettings()
  const t = useTranslation()
  const [profile, setProfile] = useState(null)
  const [local, setLocal] = useState(loadLocalSettings)
  const [pendingTheme, setPendingTheme] = useState(theme)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)

  const defaultLocal = {
    language: 'en',
    units: 'metric',
    fontSize: 'medium',
    offlineMode: false,
    pushNotifications: true,
    emailAlerts: true,
    analysisAlerts: true,
    weatherAlerts: false,
    marketingComms: false,
    defaultCropTypes: '',
    imageQuality: 'high',
    autoSaveResults: true,
    shareAnonymousData: false,
    syncFrequency: 'real',
  }

  const mergedLocal = { ...defaultLocal, ...local }

  const [locationStatus, setLocationStatus] = useState(null)

  useEffect(() => {
    if (!user?.uid) return
    getUserProfile(user.uid).then((profileData) => {
      setProfile(profileData)
      // Load notification preferences from cloud if available
      if (profileData?.notificationPreferences) {
        setLocal((prev) => ({
          ...prev,
          ...profileData.notificationPreferences,
        }))
      }
      // Load app-level settings from cloud if available (language, units, etc.)
      if (profileData?.appSettings && typeof profileData.appSettings === 'object') {
        setLocal((prev) => ({
          ...prev,
          ...profileData.appSettings,
        }))
      }
      // Check location status
      if (profileData?.location) {
        setLocationStatus({
          granted: true,
          latitude: profileData.location.latitude,
          longitude: profileData.location.longitude,
          lastUpdated: profileData.location.lastUpdated,
        })
      } else if (profileData?.locationPermissionGranted === false) {
        setLocationStatus({ granted: false })
      } else {
        setLocationStatus({ granted: null })
      }
    })
  }, [user?.uid])

  useEffect(() => {
    setPendingTheme(theme)
  }, [theme])

  const handleLocalChange = async (key, value) => {
    setLocal((prev) => ({ ...prev, [key]: value }))
    setSaveStatus(null)
    
    // If it's a notification preference, save to Supabase immediately
    const notificationKeys = ['pushNotifications', 'emailAlerts', 'analysisAlerts', 'weatherAlerts', 'marketingComms']
    if (notificationKeys.includes(key) && user?.uid) {
      try {
        const currentPrefs = profile?.notificationPreferences || {}
        await setUserProfile(user.uid, {
          notificationPreferences: {
            ...currentPrefs,
            [key]: value,
          },
        })
        
        // Request notification permission if enabling push notifications
        if (key === 'pushNotifications' && value) {
          await requestNotificationPermission()
        }
      } catch (err) {
        console.warn('Could not sync notification preference to cloud:', err)
      }
    }
  }

  const handleSaveAll = async (e) => {
    e.preventDefault()
    if (!user?.uid) return
    setSaving(true)
    setSaveStatus(null)
    setTheme(pendingTheme)
    saveLocalSettings(local)
    refreshSettings()
    setSaveStatus('saved')
    setSaving(false)
    try {
      // Save all settings/preferences to Supabase profile so they roam across devices
      await setUserProfile(user.uid, {
        emailPreferences: !!mergedLocal.emailAlerts,
        notificationPreferences: {
          pushNotifications: mergedLocal.pushNotifications,
          emailAlerts: mergedLocal.emailAlerts,
          analysisAlerts: mergedLocal.analysisAlerts,
          weatherAlerts: mergedLocal.weatherAlerts,
          marketingComms: mergedLocal.marketingComms,
        },
        appSettings: {
          language: mergedLocal.language,
          units: mergedLocal.units,
          fontSize: mergedLocal.fontSize,
          offlineMode: mergedLocal.offlineMode,
          imageQuality: mergedLocal.imageQuality,
          autoSaveResults: mergedLocal.autoSaveResults,
          shareAnonymousData: mergedLocal.shareAnonymousData,
          syncFrequency: mergedLocal.syncFrequency,
        },
      })
    } catch (err) {
      console.warn('Could not sync account preferences to cloud:', err)
      // Settings are saved locally; cloud sync is optional — do not show warning
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('settings')}</h1>

      {saveStatus === 'saved' && (
        <div className="p-4 rounded-lg bg-emerald-500/30 backdrop-blur-sm border border-emerald-400/50 text-emerald-800 dark:text-emerald-200 text-sm" role="status">
          {t('settingsSaved')}
        </div>
      )}
      <form onSubmit={handleSaveAll} className="space-y-6">
        <section className="glass-card dark:glass-card-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('accountSettings')}</h2>
          <ul className="space-y-2 text-slate-600 dark:text-slate-400 text-sm">
            <li><Link to="/forgot-password" className="text-emerald-600 dark:text-emerald-400 hover:underline">{t('changePassword')}</Link></li>
            <li>{t('twoFactorComingSoon')}</li>
            <li>{t('emailPreferencesLabel')}: <label className="inline-flex items-center gap-2 ml-2"><input type="checkbox" checked={mergedLocal.emailAlerts} onChange={(e) => handleLocalChange('emailAlerts', e.target.checked)} className="rounded border-slate-300" /> {t('emailAlerts')}</label></li>
            <li>{t('deleteAccountContact')}</li>
          </ul>
        </section>

        <section className="glass-card dark:glass-card-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('appPreferences')}</h2>
          <div className="space-y-3 text-slate-700 dark:text-slate-300 text-sm">
            <div className="flex items-center gap-3">
              <span>{t('theme')}:</span>
              <select value={pendingTheme} onChange={(e) => setPendingTheme(e.target.value)} className="rounded-lg glass-input px-3 py-1.5 text-slate-900 dark:text-slate-100 backdrop-blur-sm">
                <option value="light">{t('light')}</option>
                <option value="dark">{t('dark')}</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span>{t('language')}:</span>
              <select value={mergedLocal.language} onChange={(e) => handleLocalChange('language', e.target.value)} className="rounded-lg glass-input px-3 py-1.5 text-slate-900 dark:text-slate-100 backdrop-blur-sm">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="sw">Swahili</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span>{t('units')}:</span>
              <select value={mergedLocal.units} onChange={(e) => handleLocalChange('units', e.target.value)} className="rounded-lg glass-input px-3 py-1.5 text-slate-900 dark:text-slate-100 backdrop-blur-sm">
                <option value="metric">{t('metric')}</option>
                <option value="imperial">{t('imperial')}</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span>{t('fontSize')}:</span>
              <select value={mergedLocal.fontSize} onChange={(e) => handleLocalChange('fontSize', e.target.value)} className="rounded-lg glass-input px-3 py-1.5 text-slate-900 dark:text-slate-100 backdrop-blur-sm">
                <option value="small">{t('small')}</option>
                <option value="medium">{t('medium')}</option>
                <option value="large">{t('large')}</option>
              </select>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={mergedLocal.offlineMode} onChange={(e) => handleLocalChange('offlineMode', e.target.checked)} className="rounded border-slate-300" />
              {t('offlineMode')}
            </label>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">{t('offlineModeHelp')}</p>
          </div>
        </section>

        <section className="glass-card dark:glass-card-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('notificationSettings')}</h2>
          <div className="space-y-4">
            <Toggle
              checked={mergedLocal.pushNotifications}
              onChange={(value) => handleLocalChange('pushNotifications', value)}
              label={t('pushNotifications')}
              description={t('pushNotificationsDesc')}
              aria-label={t('pushNotifications')}
            />
            <Toggle
              checked={mergedLocal.emailAlerts}
              onChange={(value) => handleLocalChange('emailAlerts', value)}
              label={t('emailAlerts')}
              description={t('emailAlertsDesc')}
              aria-label={t('emailAlerts')}
            />
            <Toggle
              checked={mergedLocal.analysisAlerts}
              onChange={(value) => handleLocalChange('analysisAlerts', value)}
              label={t('analysisAlerts')}
              description={t('analysisAlertsDesc')}
              aria-label={t('analysisAlerts')}
            />
            <div className="space-y-2">
              <Toggle
                checked={mergedLocal.weatherAlerts}
                onChange={(value) => handleLocalChange('weatherAlerts', value)}
                label={t('weatherAlerts')}
                description={t('weatherAlertsDesc')}
                aria-label={t('weatherAlerts')}
              />
              {locationStatus && (
                <div className="ml-14 text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-1">
                  {locationStatus.granted === true ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {t('locationGranted')} ({locationStatus.latitude?.toFixed(2)}, {locationStatus.longitude?.toFixed(2)})
                    </span>
                  ) : locationStatus.granted === false ? (
                    <div className="space-y-1">
                      <span className="text-amber-600 dark:text-amber-400 block">
                        {t('locationDenied')}
                      </span>
                      {mergedLocal.weatherAlerts && (
                        <span className="text-amber-600 dark:text-amber-400 italic block">
                          {t('weatherAlertsRequireLocation')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-slate-400 block">
                        {t('locationNotSet')}
                      </span>
                      {mergedLocal.weatherAlerts && (
                        <span className="text-amber-600 dark:text-amber-400 italic block">
                          {t('weatherAlertsRequireLocation')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <Toggle
              checked={mergedLocal.marketingComms}
              onChange={(value) => handleLocalChange('marketingComms', value)}
              label={t('marketingComms')}
              description={t('marketingCommsDesc')}
              aria-label={t('marketingComms')}
            />
          </div>
        </section>

        <section className="glass-card dark:glass-card-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('analysisSettings')}</h2>
          <div className="space-y-3 text-slate-700 dark:text-slate-300 text-sm">
            <label className="block">
              {t('defaultCropTypes')}: <input type="text" value={mergedLocal.defaultCropTypes} onChange={(e) => handleLocalChange('defaultCropTypes', e.target.value)} className="ml-2 rounded-lg glass-input px-3 py-1.5 w-48 text-slate-900 dark:text-slate-100 backdrop-blur-sm" placeholder="e.g. Maize, Tomato" />
            </label>
            <div className="flex items-center gap-3">
              {t('imageQuality')}: <select value={mergedLocal.imageQuality} onChange={(e) => handleLocalChange('imageQuality', e.target.value)} className="rounded-lg glass-input px-3 py-1.5 text-slate-900 dark:text-slate-100 backdrop-blur-sm">
                <option value="low">{t('low')}</option>
                <option value="medium">{t('medium')}</option>
                <option value="high">{t('high')}</option>
              </select>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={mergedLocal.autoSaveResults} onChange={(e) => handleLocalChange('autoSaveResults', e.target.checked)} className="rounded border-slate-300" /> {t('autoSaveResults')}</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={mergedLocal.shareAnonymousData} onChange={(e) => handleLocalChange('shareAnonymousData', e.target.checked)} className="rounded border-slate-300" /> {t('shareAnonymousData')}</label>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg glass-button text-white font-medium disabled:opacity-50 transition-all">
            {saving ? t('saving') : t('saveChanges')}
          </button>
        </div>
      </form>
    </div>
  )
}
