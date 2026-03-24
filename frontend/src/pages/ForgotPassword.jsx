import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import logoImage from '../assets/logo.png'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      if (!supabase) throw new Error('Supabase client not configured')

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        throw error
      }

      setMessage('Check your email for a link to reset your password.')
    } catch (err) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
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
        <h2 className="text-xl font-semibold text-white mb-4 drop-shadow-sm">Password Recovery</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/30 backdrop-blur-sm border border-red-400/50 text-white text-sm" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 rounded-lg bg-emerald-500/30 backdrop-blur-sm border border-emerald-400/50 text-white text-sm" role="status">
              {message}
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
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg glass-button text-white font-medium disabled:opacity-50 transition-all"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
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
