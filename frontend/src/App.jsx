import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AppSettingsProvider } from './contexts/AppSettingsContext'
import { PrefetchProvider } from './contexts/PrefetchContext'
import ProtectedRoute from './components/ProtectedRoute'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import DashboardLayout from './components/DashboardLayout'
import LoadingSpinner from './components/LoadingSpinner'
import { DASHBOARD_BASE } from './constants/routes'

// Critical components - load immediately
import SignIn from './pages/SignIn'
import Dashboard from './pages/Dashboard'
import VerifyEmail from './pages/VerifyEmail'

// Lazy load non-critical pages
const SignUp = lazy(() => import('./pages/SignUp'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const DeleteAccountConfirmation = lazy(() => import('./pages/DeleteAccountConfirmation'))
const About = lazy(() => import('./pages/About'))
const Help = lazy(() => import('./pages/Help'))
const Feedback = lazy(() => import('./pages/Feedback'))
const AdminFeedbackPage = lazy(() => import('./pages/AdminFeedbackPage'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'))
const MobileApp = lazy(() => import('./pages/MobileApp'))
const Terms = lazy(() => import('./pages/Terms'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Accessibility = lazy(() => import('./pages/Accessibility'))

function RootRedirect() {
  const { user, loading, sessionExpired } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900" role="status" aria-live="polite">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }
  if (sessionExpired) {
    return <Navigate to="/signin" state={{ message: 'Your session has expired. Please sign in again.' }} replace />
  }
  return user ? <Navigate to={DASHBOARD_BASE} replace /> : <Navigate to="/signin" replace />
}

function AuthRedirect() {
  const { user, loading, sessionExpired } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900" role="status" aria-live="polite">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }
  if (sessionExpired) {
    return <Navigate to="/signin" state={{ message: 'Your session has expired. Please sign in again.' }} replace />
  }
  return user ? <Navigate to={DASHBOARD_BASE} replace /> : <Navigate to="/signin" replace />
}

function LazyRoute({ component: Component, ...props }) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Component {...props} />
    </Suspense>
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* Opening the site root always resolves to Sign in or Dashboard — never a guest dashboard */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/signup" element={<LazyRoute component={SignUp} />} />
      <Route path="/forgot-password" element={<LazyRoute component={ForgotPassword} />} />
      <Route path="/reset-password" element={<LazyRoute component={ResetPassword} />} />
      <Route path="/delete-account-confirm" element={<LazyRoute component={DeleteAccountConfirmation} />} />
      <Route path={DASHBOARD_BASE} element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="about" element={<LazyRoute component={About} />} />
        <Route path="mobile-app" element={<LazyRoute component={MobileApp} />} />
        <Route path="help" element={<LazyRoute component={Help} />} />
        <Route path="feedback" element={<LazyRoute component={Feedback} />} />
        <Route
          path="admin-feedback"
          element={
            <ProtectedAdminRoute>
              <LazyRoute component={AdminFeedbackPage} />
            </ProtectedAdminRoute>
          }
        />
        <Route path="profile" element={<LazyRoute component={Profile} />} />
        <Route path="settings" element={<LazyRoute component={Settings} />} />
        <Route path="statistics" element={<LazyRoute component={StatisticsPage} />} />
        <Route path="history" element={<LazyRoute component={HistoryPage} />} />
        <Route path="terms" element={<LazyRoute component={Terms} />} />
        <Route path="privacy" element={<LazyRoute component={Privacy} />} />
        <Route path="accessibility" element={<LazyRoute component={Accessibility} />} />
      </Route>
      <Route path="*" element={<AuthRedirect />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppSettingsProvider>
            <PrefetchProvider>
              <AppRoutes />
            </PrefetchProvider>
          </AppSettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
