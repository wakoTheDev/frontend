import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import logoImage from '../assets/logo.png'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [validCode, setValidCode] = useState(false)
  const recoveryEstablished = useRef(false)

  useEffect(() => {
    let cancelled = false
    let subscription = null
    let timeoutId = null

    const finishFailure = (message) => {
      if (cancelled) return
      if (timeoutId) clearTimeout(timeoutId)
      setError(message || 'Invalid or expired reset link. Please request a new password reset.')
      setValidCode(false)
      setVerifying(false)
    }

    const finishSuccess = () => {
      if (cancelled) return
      if (timeoutId) clearTimeout(timeoutId)
      recoveryEstablished.current = true
      setValidCode(true)
      setError('')
      setVerifying(false)
    }

    async function init() {
      if (!supabase) {
        finishFailure('Supabase is not configured. Check your environment variables.')
        return
      }

      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      // PKCE / email link with ?code=
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return
        if (exErr) {
          finishFailure(exErr.message)
          return
        }
        window.history.replaceState({}, document.title, `${url.origin}${url.pathname}`)
        finishSuccess()
        return
      }

      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          finishSuccess()
        }
      })
      subscription = sub?.subscription ?? null

      // Implicit flow: tokens in hash — give the client a tick to parse
      await new Promise((r) => setTimeout(r, 50))
      if (cancelled) return

      const { data: { session } } = await supabase.auth.getSession()
      const hash = window.location.hash || ''
      if (session && (hash.includes('type=recovery') || hash.includes('type%3Drecovery'))) {
        finishSuccess()
        return
      }

      // If still verifying, wait for PASSWORD_RECOVERY or timeout
      timeoutId = window.setTimeout(() => {
        if (cancelled || recoveryEstablished.current) return
        finishFailure(null)
      }, 4000)
    }

    init()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
      subscription?.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }

    setLoading(true)
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) {
        throw updateErr
      }
      navigate('/signin', {
        state: {
          message: 'Password reset successfully! Please sign in with your new password.',
        },
      })
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite'
      }}>
        <style>{`
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
        <div className="w-full max-w-md glass-modal rounded-2xl p-8 text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" aria-hidden="true"></div>
          <p className="text-white drop-shadow-sm">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  if (!validCode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradient 15s ease infinite'
      }}>
        <style>{`
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
        <div className="w-full max-w-md glass-modal rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <img 
              src={logoImage} 
              alt="AI-Powered CropCare Logo" 
              className="w-12 h-12 object-cover object-center block"
              aria-hidden="true"
            />
            <h1 className="text-2xl font-bold text-white drop-shadow-sm">AI-Powered-CropCare</h1>
          </div>
          <div className="p-3 rounded-lg bg-red-500/30 backdrop-blur-sm border border-red-400/50 text-white text-sm mb-4" role="alert">
            {error}
          </div>
          <div className="flex gap-3">
            <Link 
              to="/forgot-password" 
              className="flex-1 px-4 py-2 rounded-lg glass-button text-white font-medium text-center transition-all"
            >
              Request New Link
            </Link>
            <Link 
              to="/signin" 
              className="flex-1 px-4 py-2 rounded-lg glass-input text-white font-medium text-center hover:bg-white/30 backdrop-blur-sm transition-all"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
      backgroundSize: '400% 400%',
      animation: 'gradient 15s ease infinite'
    }}>
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <div className="w-full max-w-md glass-modal rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <img 
            src={logoImage} 
            alt="AI-Powered CropCare Logo" 
            className="w-12 h-12 object-cover object-center block"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold text-white drop-shadow-sm">AI-Powered-CropCare</h1>
        </div>
        <h2 className="text-xl font-semibold text-white mb-4 drop-shadow-sm">Reset Password</h2>
        <p className="text-white/90 text-sm mb-4 drop-shadow-sm">
          Enter your new password below. Make sure it&apos;s at least 6 characters long.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/30 backdrop-blur-sm border border-red-400/50 text-white text-sm" role="alert">
              {error}
            </div>
          )}
          <label className="block">
            <span className="text-white font-medium drop-shadow-sm">New Password</span>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
                className="block w-full rounded-lg glass-input px-3 py-2 pr-10 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-white/50 focus:outline-none backdrop-blur-sm"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>
          <label className="block">
            <span className="text-white font-medium drop-shadow-sm">Confirm New Password</span>
            <div className="relative mt-1">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
                className="block w-full rounded-lg glass-input px-3 py-2 pr-10 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-white/50 focus:outline-none backdrop-blur-sm"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800 focus:outline-none"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg glass-button text-white font-medium disabled:opacity-50 transition-all"
          >
            {loading ? 'Resetting password...' : 'Reset Password'}
          </button>
        </form>
        <p className="mt-4 text-center text-white text-sm drop-shadow-sm">
          <Link to="/signin" className="text-emerald-200 font-medium hover:text-emerald-100 underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
