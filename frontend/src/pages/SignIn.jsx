import { useState } from 'react'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { getOAuthRedirectTo } from '../constants/routes'
import logoImage from '../assets/logo.png'

export default function SignIn() {
  const { user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'
  const successMessage = location.state?.message

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900" role="status" aria-live="polite">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }
  if (user) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (!supabase) throw new Error('Supabase client not configured')

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw signInError
      }

      const u = data.user

      // If email confirmation is required, check email_confirmed_at
      if (!u?.email_confirmed_at) {
        // Supabase will have already sent confirmation email at sign-up.
        // Guide user to verification screen.
        await supabase.auth.signOut()
        navigate('/verify-email', {
          replace: true,
          state: {
            email: u?.email,
            message: `We have sent you a verification email to ${u?.email}. Please verify it and log in.`,
          },
        })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setSocialLoading('google')
    try {
      if (!supabase) throw new Error('Supabase client not configured')
      // redirectTo must match a URL listed in Supabase → Auth → URL Configuration → Redirect URLs
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getOAuthRedirectTo(),
        },
      })
      if (error) throw error
      // Success: Supabase redirects the browser to Google; do not navigate() here — it races
      // with that redirect and can land on the dashboard without a session.
    } catch (err) {
      setError(err.message || 'Failed to sign in with Google')
      setSocialLoading(null)
    }
  }

  const handleAppleSignIn = async () => {
    setError('')
    setSocialLoading('apple')
    try {
      if (!supabase) throw new Error('Supabase client not configured')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: getOAuthRedirectTo(),
        },
      })
      if (error) throw error
    } catch (err) {
      setError(err.message || 'Failed to sign in with Apple')
      setSocialLoading(null)
    }
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
        <h2 className="text-xl font-semibold text-white mb-4 drop-shadow-sm">Sign In</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/30 backdrop-blur-sm border border-emerald-400/50 text-white text-sm" role="status">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/30 backdrop-blur-sm border border-red-400/50 text-white text-sm" role="alert">
              {error}
            </div>
          )}
          <label className="block">
            <span className="text-white font-medium drop-shadow-sm">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-lg glass-input px-3 py-2 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-white/50 focus:outline-none backdrop-blur-sm"
              placeholder="Enter your email"
            />
          </label>
          <label className="block">
            <span className="text-white font-medium drop-shadow-sm">Password</span>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="block w-full rounded-lg glass-input px-3 py-2 pr-10 text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-white/50 focus:outline-none backdrop-blur-sm"
                placeholder="Enter your password"
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
          <div className="flex items-center justify-between">
            <Link to="/forgot-password" className="text-sm text-white hover:text-emerald-200 underline drop-shadow-sm">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg glass-button text-white font-medium disabled:opacity-50 transition-all"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 glass-input text-white backdrop-blur-sm">Or continue with</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={!!socialLoading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 glass-input rounded-lg text-slate-900 font-medium hover:bg-white/30 disabled:opacity-50 transition-all backdrop-blur-sm"
            >
              {socialLoading === 'google' ? (
                <span className="text-sm">Loading...</span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Google</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={!!socialLoading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 glass-input rounded-lg text-slate-900 font-medium hover:bg-white/30 disabled:opacity-50 transition-all backdrop-blur-sm"
            >
              {socialLoading === 'apple' ? (
                <span className="text-sm">Loading...</span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  <span>Apple</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-white text-sm drop-shadow-sm">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-emerald-200 font-medium hover:text-emerald-100 underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}
