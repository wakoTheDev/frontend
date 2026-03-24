import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePrefetch } from '../contexts/PrefetchContext'
import { useTranslation } from '../contexts/AppSettingsContext'
import { getUserProfile, setUserProfile, uploadProfilePhoto, deleteProfilePhoto } from '../lib/supabase'
import { resizeImageForAvatar } from '../lib/imageUtils'
import { User, Camera, Trash2 } from 'lucide-react'

export default function Profile() {
  const { user } = useAuth()
  const t = useTranslation()
  const { getCachedProfile, setCachedProfile } = usePrefetch()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoRemoving, setPhotoRemoving] = useState(false)
  const fileInputRef = useRef(null)
  const autoSaveTimeoutRef = useRef(null)
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    location: '',
    accountType: 'Free',
    farmSize: '',
    primaryCrops: '',
    growingZone: '',
    photoURL: '',
  })
  const formRef = useRef(form)
  formRef.current = form

  /** Text fields must stay strings; `location` in DB can be JSON (GPS) from other flows — never call .trim() on that. */
  const locationForForm = (loc) => (typeof loc === 'string' ? loc : '')

  useEffect(() => {
    if (!user?.uid) return
    const cached = getCachedProfile(user.uid)
    if (cached !== undefined) {
      setProfile(cached)
      if (cached) {
        setForm((prev) => ({
          ...prev,
          ...cached,
          location: locationForForm(cached.location),
          photoURL: cached.photoURL ?? prev.photoURL ?? '',
        }))
      } else setForm((prev) => ({ ...prev, fullName: user.displayName || '', accountType: 'Free' }))
      setLoading(false)
    }
    getUserProfile(user.uid).then((p) => {
      setCachedProfile(user.uid, p)
      setProfile(p)
      if (p) {
        setForm((prev) => ({
          ...prev,
          ...p,
          location: locationForForm(p.location),
          photoURL: p.photoURL ?? prev.photoURL ?? '',
        }))
      } else setForm((prev) => ({ ...prev, fullName: user.displayName || '', accountType: 'Free' }))
    }).finally(() => setLoading(false))
  }, [user?.uid, user?.displayName, getCachedProfile, setCachedProfile])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setSaveStatus(null)
    
    // Auto-save to Supabase after a short delay (debounce)
    if (user?.uid) {
      // Clear previous timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      
      // Set new timeout to save after user stops typing
      autoSaveTimeoutRef.current = setTimeout(async () => {
        try {
          const currentForm = formRef.current
          await setUserProfile(user.uid, { [name]: value.trim() })
          console.log(`Auto-saved ${name} to Supabase`)
        } catch (err) {
          console.warn('Auto-save failed:', err)
        }
      }, 1500) // Save 1.5 seconds after user stops typing
    }
  }
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user?.uid) return
    if (!file.type.startsWith('image/')) {
      setSaveStatus('error')
      return
    }
    e.target.value = ''
    const previousPhotoURL = formRef.current.photoURL || ''
    setPhotoUploading(true)
    setSaveStatus(null)
    let previewUrl = null
    try {
      const blob = await resizeImageForAvatar(file)
      previewUrl = URL.createObjectURL(blob)
      setForm((prev) => ({ ...prev, photoURL: previewUrl }))
      const url = await uploadProfilePhoto(user.uid, blob)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      previewUrl = null
      const latest = formRef.current
      const next = { ...latest, photoURL: url }
      setForm(next)
      setProfile((prev) => (prev ? { ...prev, photoURL: url } : { photoURL: url }))
      setSaveStatus('saved')
      // Save photo URL to Supabase profile
      await setUserProfile(user.uid, { photoURL: url })
    } catch (err) {
      console.error('Failed to upload profile photo:', err)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setSaveStatus('error')
      setForm((prev) => ({ ...prev, photoURL: previousPhotoURL }))
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!user?.uid) return
    setPhotoRemoving(true)
    setSaveStatus(null)
    try {
      await deleteProfilePhoto(user.uid)
      const latest = formRef.current
      const next = { ...latest, photoURL: '' }
      setForm(next)
      setProfile((prev) => (prev ? { ...prev, photoURL: '' } : null))
      setSaveStatus('saved')
      // Save removal to Supabase profile
      await setUserProfile(user.uid, { photoURL: '' })
    } catch (err) {
      console.error('Failed to remove profile photo:', err)
      setSaveStatus('error')
    } finally {
      setPhotoRemoving(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!user?.uid) return
    setSaveStatus(null)
    setSaving(true)
    const previousForm = { ...form }
    
    try {
      const str = (v) => (typeof v === 'string' ? v.trim() : '')
      // If DB has GPS object in `location`, keep it when the address field is empty
      const address = str(form.location)
      const locationPayload =
        address !== ''
          ? address
          : profile?.location && typeof profile.location === 'object'
            ? profile.location
            : ''

      // Save all profile data to Supabase
      const profileData = {
        fullName: str(form.fullName),
        phone: str(form.phone),
        location: locationPayload,
        accountType: form.accountType || 'Free',
        farmSize: str(form.farmSize),
        primaryCrops: str(form.primaryCrops),
        growingZone: str(form.growingZone),
        photoURL: form.photoURL || '',
      }
      
      await setUserProfile(user.uid, profileData)
      
      // Update local state
      setProfile((prev) => (prev ? { ...prev, ...profileData } : profileData))
      setForm((prev) => ({ ...prev, ...profileData }))
      setSaveStatus('saved')
    } catch (err) {
      console.error('Failed to save profile:', err)
      setSaveStatus('error')
      setForm(previousForm)
      setProfile((prev) => (prev ? { ...prev, ...previousForm } : null))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('profileTitle')}</h1>

      {saveStatus === 'saved' && (
        <div className="p-4 rounded-lg bg-emerald-500/30 backdrop-blur-sm border border-emerald-400/50 text-emerald-800 dark:text-emerald-200 text-sm" role="status">
          {t('profileSaved')}
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="p-4 rounded-lg bg-red-500/30 backdrop-blur-sm border border-red-400/50 text-red-800 dark:text-red-200 text-sm" role="alert">
          Could not save. Please try again.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* User Details */}
        <section className="glass-card dark:glass-card-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">User Details</h2>
          <div className="flex flex-wrap gap-4 items-start">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center overflow-hidden border-2 border-slate-200 dark:border-slate-600">
                {form.photoURL ? (
                  <img src={form.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-slate-500" aria-hidden="true" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="sr-only"
                aria-label="Upload profile picture"
              />
              <div className="flex items-center justify-center gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors"
                  title="Add or change profile picture"
                  aria-label="Add or change profile picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
                {form.photoURL && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={photoRemoving}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                    title="Remove profile picture"
                    aria-label="Remove profile picture"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {photoUploading && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Uploading...</p>}
              {photoRemoving && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Removing...</p>}
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <label className="block">
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Full name</span>
                <input type="text" name="fullName" value={form.fullName} onChange={handleChange} className="mt-1 block w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 backdrop-blur-sm" />
              </label>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Email: {user?.email ?? '—'}</p>
              <label className="block">
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Phone (optional)</span>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="mt-1 block w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 backdrop-blur-sm" />
              </label>
              <label className="block">
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Location / Farm location</span>
                <input type="text" name="location" value={form.location} onChange={handleChange} className="mt-1 block w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 backdrop-blur-sm" placeholder="e.g. County, Region" />
              </label>
              <p className="text-slate-600 dark:text-slate-300 text-sm">Account type: <strong>{form.accountType}</strong> (Free / Premium)</p>
            </div>
          </div>
        </section>

        {/* Farm Information */}
        <section className="glass-card dark:glass-card-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Farm Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Farm size</span>
              <input type="text" name="farmSize" value={form.farmSize} onChange={handleChange} className="mt-1 block w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 backdrop-blur-sm" placeholder="e.g. 5 acres" />
            </label>
            <label className="block">
              <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Primary crops</span>
              <input type="text" name="primaryCrops" value={form.primaryCrops} onChange={handleChange} className="mt-1 block w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 backdrop-blur-sm" placeholder="e.g. Maize, Beans" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Growing zone / Region</span>
              <input type="text" name="growingZone" value={form.growingZone} onChange={handleChange} className="mt-1 block w-full rounded-lg glass-input px-3 py-2 text-slate-900 dark:text-slate-100 backdrop-blur-sm" placeholder="e.g. Zone 5, East Africa" />
            </label>
          </div>
        </section>

        {/* Subscription */}
        <section className="glass-card dark:glass-card-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Subscription</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">Current plan: <strong>{form.accountType}</strong></p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Upgrade/downgrade and billing history can be managed here when payments are integrated.</p>
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg glass-button text-white font-medium disabled:opacity-50 transition-all">
            {saving ? t('saving') : t('saveProfile')}
          </button>
        </section>
      </form>
    </div>
  )
}
