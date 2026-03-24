import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Smartphone, Sparkles } from 'lucide-react'
import ImageCarousel from './ImageCarousel'
import GetStartedModal from './GetStartedModal'
import { getUserProfile } from '../lib/supabase'

export default function HeroSection() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    // Check if user has already dismissed the guide
    if (user?.uid) {
      getUserProfile(user.uid).then((profile) => {
        if (!profile?.getStartedGuideDismissed) {
          // Show guide if user hasn't dismissed it
          setShowGuide(true)
        }
      })
    }
  }, [user?.uid])

  const handleGetStarted = () => {
    if (user) {
      // Show guide for authenticated users
      setShowGuide(true)
    } else {
      navigate('/signup')
    }
  }

  const handleGuideComplete = () => {
    setShowGuide(false)
  }

  return (
    <section className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-slate-800 dark:to-slate-900 py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left: Headline */}
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
              AI-Powered Crop Disease Detection for Higher Profits
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Get instant, accurate diagnosis of crop diseases using your smartphone. Protect your harvest and maximize yields with AI-driven insights.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleGetStarted}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                Get Started Free
              </button>
              <a
                href="#how-it-works"
                className="px-6 py-3 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-600 dark:border-emerald-500 rounded-lg font-semibold hover:bg-emerald-50 dark:hover:bg-slate-700 transition-all hover:scale-105"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Right: Image Carousel */}
          <div className="relative">
            <ImageCarousel />
          </div>
        </div>
      </div>
      <GetStartedModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        onComplete={handleGuideComplete}
      />
    </section>
  )
}
