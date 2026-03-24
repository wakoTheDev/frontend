import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../contexts/AppSettingsContext'
import { sendFeedback } from '../lib/api'
import { X, Upload, CheckCircle } from 'lucide-react'
import { submitFeedbackToSupabase } from '../lib/feedbackStore'
import { SUPPORT_EMAIL } from '../constants/support'

const FEEDBACK_TYPES = [
  { id: 'suggestion', label: 'Send Feedback / Suggestion' },
  { id: 'bug', label: 'Report a Problem' },
  { id: 'feature', label: 'Feature Request' },
  { id: 'other', label: 'Other' },
]

export default function Feedback() {
  const { user } = useAuth()
  const t = useTranslation()
  const [type, setType] = useState('suggestion')
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState(0)
  const [survey, setSurvey] = useState('')
  const [screenshots, setScreenshots] = useState([])
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0 && files.length > 0) {
      setError('Please select image files only')
      return
    }
    setScreenshots((prev) => {
      const combined = [...prev, ...imageFiles]
      return combined.slice(0, 5) // Max 5 screenshots
    })
    setError('')
  }

  const removeScreenshot = (index) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!user?.uid) {
      setError('Please sign in to submit feedback.')
      return
    }
    
    // Validation
    if (!message.trim()) {
      setError('Please enter your feedback message')
      return
    }
    
    if (message.trim().length < 10) {
      setError('Please provide more details (at least 10 characters)')
      return
    }
    
    setLoading(true)
    try {
      // Upload screenshots + save to Supabase
      const submitRes = await submitFeedbackToSupabase({
        userId: user?.uid || user?.id || null,
        userEmail: user?.email ?? null,
        type,
        message: message.trim(),
        rating: rating || null,
        survey: survey.trim() || null,
        screenshotFiles: screenshots,
      })

      // Notify owners by email in real time (backend)
      try {
        await sendFeedback({
          type,
          message: message.trim(),
          rating: rating || null,
          survey: survey.trim() || null,
          screenshotUrls: submitRes?.screenshot_signed_urls || [],
          userEmail: user?.email ?? null,
          userId: user?.uid || user?.id || null,
        })
      } catch (emailErr) {
        console.warn('Feedback email dispatch failed (feedback still stored):', emailErr)
      }
      
      // Success - reset form
      setSent(true)
      setMessage('')
      setRating(0)
      setSurvey('')
      setScreenshots([])
      setError('')
    } catch (err) {
      console.error('Feedback submission error:', err)
      setError(err.message || 'Failed to send feedback. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-card dark:glass-card-dark rounded-2xl p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Help us improve CropCare by sharing your feedback, reporting issues, or suggesting new features.</h1>
          <div className="bg-emerald-500/30 dark:bg-emerald-900/30 backdrop-blur-sm border border-emerald-400/50 dark:border-emerald-700 rounded-xl p-6 text-emerald-800 dark:text-emerald-200 mb-6">
            <p className="font-medium text-lg">Thank you for your feedback! We’ll review it and get back to you if needed.</p>
          </div>
          <button 
            type="button" 
            onClick={() => {
              setSent(false)
              setMessage('')
              setRating(0)
              setSurvey('')
              setScreenshots([])
              setError('')
            }} 
            className="px-6 py-2.5 rounded-lg glass-button text-white font-medium transition-all"
          >
            {t('sendAnother')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Help us improve CropCare by sharing your feedback, reporting issues, or suggesting new features.</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Help us improve CropCare by sharing your feedback, reporting issues, or suggesting new features.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg bg-red-500/30 backdrop-blur-sm border border-red-400/50 text-red-800 dark:text-red-200 text-sm" role="alert">
            <p className="font-medium">{error}</p>
          </div>
        )}

        <section className="glass-card dark:glass-card-dark rounded-xl p-6">
          <label className="block">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
              {t('type')}
            </h2>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Feedback type"
              className="w-full rounded-lg glass-input px-4 py-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none backdrop-blur-sm"
            >
              {FEEDBACK_TYPES.map((typeOpt) => (
                <option key={typeOpt.id} value={typeOpt.id}>
                  {typeOpt.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="glass-card dark:glass-card-dark rounded-xl p-6">
          <label className="block">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
              {t('message')} <span className="text-red-500">*</span>
            </h2>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                setError('')
              }}
              rows={5}
              required
              minLength={10}
              className="w-full rounded-lg glass-input px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none backdrop-blur-sm"
              placeholder="Describe your feedback, bug report, or feature request in detail..."
              aria-describedby="message-help"
            />
            <p id="message-help" className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Minimum 10 characters required. {message.length > 0 && `${message.length} characters`}
            </p>
          </label>
        </section>

        <section className="glass-card dark:glass-card-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('rateExperience')} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">(Optional)</span></h2>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-3xl transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded ${
                  star <= rating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'
                }`}
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                aria-pressed={star <= rating}
              >
                {star <= rating ? '★' : '☆'}
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {rating === 5 && 'Excellent! We\'re glad you love CropCare!'}
              {rating === 4 && 'Great! Thanks for the positive feedback!'}
              {rating === 3 && 'Good! We\'d love to hear how we can improve.'}
              {rating === 2 && 'We appreciate your feedback. Please let us know how we can do better.'}
              {rating === 1 && 'We\'re sorry to hear that. Please share details so we can improve.'}
            </p>
          )}
        </section>

        <section className="glass-card dark:glass-card-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t('optionalSurvey')}</h2>
          <textarea
            value={survey}
            onChange={(e) => setSurvey(e.target.value)}
            rows={3}
            className="w-full rounded-lg glass-input px-4 py-3 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none backdrop-blur-sm"
            placeholder="Any additional comments or suggestions..."
          />
        </section>

        <section className="glass-card dark:glass-card-dark rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            {t('attachScreenshots')} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">(Optional, max 5)</span>
          </h2>
          <label className="block">
            <div className="flex items-center gap-3 mb-3">
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={handleFileChange} 
                disabled={screenshots.length >= 5}
                className="hidden"
                id="screenshot-upload"
              />
              <label
                htmlFor="screenshot-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                  screenshots.length >= 5
                    ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 cursor-not-allowed'
                    : 'glass-input text-slate-900 dark:text-slate-100 hover:bg-white/40 backdrop-blur-sm'
                }`}
              >
                <Upload size={18} />
                <span className="text-sm font-medium">
                  {screenshots.length >= 5 ? 'Maximum 5 files' : 'Choose Images'}
                </span>
              </label>
              {screenshots.length > 0 && (
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {screenshots.length} file{screenshots.length > 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            
            {screenshots.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {screenshots.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeScreenshot(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                      aria-label={`Remove screenshot ${index + 1}`}
                    >
                      <X size={16} />
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate" title={file.name}>
                      {file.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </label>
        </section>

        <div className="flex flex-wrap gap-3 pt-4">
          <button 
            type="submit" 
            disabled={loading || !user || !message.trim() || message.trim().length < 10} 
            className="px-6 py-2.5 rounded-lg glass-button text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Submitting...
              </span>
            ) : (
              t('submitFeedback')
            )}
          </button>
          <a 
            href={`mailto:${SUPPORT_EMAIL}`} 
            className="px-6 py-2.5 rounded-lg glass-input text-slate-900 dark:text-slate-100 font-medium hover:bg-white/40 backdrop-blur-sm transition-all"
          >
            {t('contactDeveloper')}
          </a>
        </div>
        
      </form>
    </div>
  )
}
