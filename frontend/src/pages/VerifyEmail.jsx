import { useLocation, useNavigate } from 'react-router-dom'
import logoImage from '../assets/logo.png'

export default function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()
  const emailFromState = location.state?.email
  const messageFromState = location.state?.message

  const emailText = emailFromState || 'your email address'
  const mainMessage =
    messageFromState ||
    `We have sent you a verification email to ${emailText}. Please verify it and log in.`

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
        <h2 className="text-xl font-semibold text-white mb-4 drop-shadow-sm">Verify Your Email</h2>
        <p className="text-sm text-white/90 mb-6 drop-shadow-sm">
          {mainMessage}
        </p>
        <button
          type="button"
          onClick={() => navigate('/signin', { replace: true })}
          className="mt-2 inline-flex items-center justify-center px-6 py-2.5 rounded-lg glass-button text-white font-medium"
        >
          Go to Login
        </button>
      </div>
    </div>
  )
}

