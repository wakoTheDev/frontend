import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import logoImage from '../assets/logo.png'

export default function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emailFromState = location.state?.email
  const messageFromState = location.state?.message
  const [status, setStatus] = useState(emailFromState ? 'sent' : 'verifying')
  const [mainMessage, setMainMessage] = useState(
    messageFromState || `We have sent you a verification email to ${emailFromState || 'your email address'}. Please verify it and log in.`,
  )
  const closeTimerRef = useRef(null)
  const redirectTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function handleVerificationCallback() {
      const code = searchParams.get('code')
      const type = searchParams.get('type')
      const hash = window.location.hash || ''
      const looksLikeCallback = Boolean(
        code ||
        type === 'signup' ||
        hash.includes('access_token=') ||
        hash.includes('type=signup') ||
        hash.includes('type%3Dsignup')
      )

      if (!looksLikeCallback) {
        setStatus(emailFromState ? 'sent' : 'verifying')
        setMainMessage(
          messageFromState ||
            `We have sent you a verification email to ${emailFromState || 'your email address'}. Please verify it and log in.`,
        )
        return
      }

      if (code && supabase) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            throw error
          }
        } catch (err) {
          console.warn('Email verification session exchange failed:', err)
        }
      }

      if (cancelled) return

      setStatus('success')
      setMainMessage('Your email has been confirmed successfully. This tab will close automatically.')

      closeTimerRef.current = setTimeout(() => {
        try {
          window.close()
        } catch {
          // Browsers may block closing; keep the fallback redirect below.
        }
      }, 3000)

      redirectTimerRef.current = setTimeout(() => {
        navigate('/signin', {
          replace: true,
          state: {
            message: 'Your email has been confirmed successfully. Please sign in to continue.',
          },
        })
      }, 5000)
    }

    handleVerificationCallback()

    return () => {
      cancelled = true
    }
  }, [emailFromState, messageFromState, navigate, searchParams])

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite',
      }}
    >
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <div className="w-full max-w-md glass-modal rounded-2xl p-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img
            src={logoImage}
            alt="AI-Powered CropCare Logo"
            className="w-12 h-12 object-cover object-center block"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold text-white drop-shadow-sm">AI-Powered-CropCare</h1>
        </div>
        {status === 'success' ? (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/30 mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-200" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-4 drop-shadow-sm">Email Confirmed</h2>
            <p className="text-sm text-white/90 mb-3 drop-shadow-sm">{mainMessage}</p>
            <p className="text-xs text-white/80 drop-shadow-sm">
              This tab will close automatically in a few seconds.
            </p>
            <button
              type="button"
              onClick={() => navigate('/signin', { replace: true })}
              className="mt-4 inline-flex items-center justify-center px-6 py-2.5 rounded-lg glass-button text-white font-medium"
            >
              Go to Login
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-white mb-4 drop-shadow-sm">Verify Your Email</h2>
            <p className="text-sm text-white/90 mb-6 drop-shadow-sm">{mainMessage}</p>
            <button
              type="button"
              onClick={() => navigate('/signin', { replace: true })}
              className="mt-2 inline-flex items-center justify-center px-6 py-2.5 rounded-lg glass-button text-white font-medium"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}

