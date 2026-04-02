import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import logoImage from '../assets/logo.png'

export default function DeleteAccountConfirmation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // 'verifying', 'success', 'error', 'expired'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
    const token = searchParams.get('token')
    
    if (!token) {
      setStatus('error')
      setError('Invalid deletion link. Please request a new deletion link.')
      setLoading(false)
      return
    }

    const confirmDeletion = async () => {
      try {
        const response = await fetch('/api/account/delete-confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (!response.ok) {
          if (response.status === 410 || data.message?.includes('expired')) {
            setStatus('expired')
            setError('This deletion link has expired. Please request a new one.')
          } else {
            setStatus('error')
            setError(data.message || 'Failed to delete account. Please try again.')
          }
          return
        }

        setStatus('success')
        closeTimerRef.current = setTimeout(() => {
          try {
            window.close()
          } catch {
            // Ignore close failures; browsers may block tab closing.
          }
        }, 3000)

        redirectTimerRef.current = setTimeout(() => {
          navigate('/signin', {
            replace: true,
            state: {
              message: 'Your account has been permanently deleted. We\'re sorry to see you go.',
            },
          })
        }, 5000)
      } catch (err) {
        console.error('Delete account confirmation error:', err)
        setStatus('error')
        setError('Failed to delete account. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    confirmDeletion()
  }, [searchParams, navigate])

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
        <div className="flex items-center justify-center gap-3 mb-6">
          <img 
            src={logoImage} 
            alt="AI-Powered CropCare Logo" 
              className="w-12 h-12 object-cover object-center block"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-bold text-white drop-shadow-sm">AI-Powered-CropCare</h1>
        </div>

        {loading && status === 'verifying' && (
          <>
            <div className="inline-block w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" aria-hidden="true"></div>
            <h2 className="text-xl font-semibold text-white mb-2 drop-shadow-sm">Verifying deletion request...</h2>
            <p className="text-white/90 text-sm drop-shadow-sm">Please wait while we process your account deletion.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/30 mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-200" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2 drop-shadow-sm">Account Deleted</h2>
            <p className="text-white/90 text-sm mb-4 drop-shadow-sm">
              Your account and all associated data have been permanently deleted.
            </p>
            <p className="text-white/80 text-xs drop-shadow-sm">
              This tab will close automatically in a few seconds. If it stays open, you will be redirected to the sign in page.
            </p>
            <Link
              to="/signin"
              className="inline-block mt-4 px-6 py-2 rounded-lg glass-button text-white font-medium transition-all"
            >
              Go to Sign In
            </Link>
          </>
        )}

        {(status === 'error' || status === 'expired') && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/30 mb-4">
              {status === 'expired' ? (
                <XCircle className="w-8 h-8 text-red-200" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-red-200" />
              )}
            </div>
            <h2 className="text-xl font-semibold text-white mb-2 drop-shadow-sm">
              {status === 'expired' ? 'Link Expired' : 'Deletion Failed'}
            </h2>
            <p className="text-white/90 text-sm mb-4 drop-shadow-sm">
              {error || 'Failed to delete account. Please try again.'}
            </p>
            <div className="space-y-2">
              <Link
                to="/signin"
                className="inline-block w-full px-6 py-2 rounded-lg glass-button text-white font-medium transition-all"
              >
                Go to Sign In
              </Link>
              <p className="text-white/80 text-xs drop-shadow-sm">
                If you need to delete your account, please request a new deletion link from your account settings.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
