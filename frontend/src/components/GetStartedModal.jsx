import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../contexts/AppSettingsContext'
import { setUserProfile, getUserProfile } from '../lib/supabase'
import { X, Camera, BarChart3, Lightbulb, Bell, Cloud, ChevronRight, ChevronLeft } from 'lucide-react'

const GUIDE_STEPS = [
  {
    id: 'scan',
    icon: Camera,
    titleKey: 'guideStep1Title',
    descriptionKey: 'guideStep1Description',
    detailsKey: 'guideStep1Details',
  },
  {
    id: 'results',
    icon: BarChart3,
    titleKey: 'guideStep2Title',
    descriptionKey: 'guideStep2Description',
    detailsKey: 'guideStep2Details',
  },
  {
    id: 'recommendations',
    icon: Lightbulb,
    titleKey: 'guideStep3Title',
    descriptionKey: 'guideStep3Description',
    detailsKey: 'guideStep3Details',
  },
  {
    id: 'notifications',
    icon: Bell,
    titleKey: 'guideStep4Title',
    descriptionKey: 'guideStep4Description',
    detailsKey: 'guideStep4Details',
  },
  {
    id: 'weather',
    icon: Cloud,
    titleKey: 'guideStep5Title',
    descriptionKey: 'guideStep5Description',
    detailsKey: 'guideStep5Details',
  },
]

export default function GetStartedModal({ isOpen, onClose, onComplete }) {
  const { user } = useAuth()
  const t = useTranslation()
  const [currentStep, setCurrentStep] = useState(0)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
      setDontShowAgain(false)
    }
  }, [isOpen])

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleGotIt = async () => {
    if (dontShowAgain && user?.uid) {
      try {
        await setUserProfile(user.uid, {
          getStartedGuideDismissed: true,
          getStartedGuideDismissedAt: new Date().toISOString(),
        })
      } catch (err) {
        console.warn('Failed to save guide preference:', err)
      }
    }
    onComplete?.()
    onClose()
  }

  const handleClose = async () => {
    if (dontShowAgain && user?.uid) {
      try {
        await setUserProfile(user.uid, {
          getStartedGuideDismissed: true,
          getStartedGuideDismissedAt: new Date().toISOString(),
        })
      } catch (err) {
        console.warn('Failed to save guide preference:', err)
      }
    }
    onClose()
  }

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  if (!isOpen) return null

  const step = GUIDE_STEPS[currentStep]
  const Icon = step.icon
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === GUIDE_STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="get-started-title"
    >
      <div
        className="glass-modal dark:glass-modal-dark rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 id="get-started-title" className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                {t('getStartedGuideTitle')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('step')} {currentStep + 1} {t('of')} {GUIDE_STEPS.length}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-2 rounded-lg hover:bg-white/10"
            aria-label={t('close')}
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex gap-2">
            {GUIDE_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full transition-all ${
                  index <= currentStep
                    ? 'bg-emerald-600 dark:bg-emerald-500'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
                aria-label={`${t('step')} ${index + 1} ${index <= currentStep ? t('completed') : t('pending')}`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-6 min-h-[200px]">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-4">
              <Icon className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-3">
              {t(step.titleKey)}
            </h3>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
              {t(step.descriptionKey)}
            </p>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-left">
              <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-line">
                {t(step.detailsKey)}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/20">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600"
            />
            <span>{t('dontShowAgain')}</span>
          </label>

          <div className="flex items-center gap-3">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handlePrevious}
                className="flex items-center gap-2 px-4 py-2 rounded-lg glass-input text-slate-900 dark:text-slate-100 hover:bg-white/40 backdrop-blur-sm transition-all"
                aria-label={t('previous')}
              >
                <ChevronLeft size={20} />
                <span>{t('previous')}</span>
              </button>
            )}
            {!isLastStep ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg glass-button text-white font-medium transition-all"
                aria-label={t('next')}
              >
                <span>{t('next')}</span>
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGotIt}
                className="px-6 py-2.5 rounded-lg glass-button text-white font-medium transition-all"
                aria-label={t('gotIt')}
              >
                {t('gotIt')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
