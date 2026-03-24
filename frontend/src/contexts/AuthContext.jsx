import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

// Session timeout: 30 minutes of inactivity (in milliseconds)
const SESSION_TIMEOUT = 30 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const lastActivityRef = useRef(Date.now())
  const inactivityTimerRef = useRef(null)
  const tokenCheckIntervalRef = useRef(null)

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  // Check for session expiration due to inactivity
  const checkSessionExpiration = useCallback(() => {
    const timeSinceLastActivity = Date.now() - lastActivityRef.current
    if (timeSinceLastActivity > SESSION_TIMEOUT && user) {
      console.log('Session expired due to inactivity')
      setSessionExpired(true)
      handleSignOut()
    }
  }, [user])

  // Handle sign out with cleanup
  const handleSignOut = useCallback(async () => {
    try {
      // Clear all timers
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current)
        tokenCheckIntervalRef.current = null
      }

      // Clear session storage
      try {
        sessionStorage.clear()
      } catch (e) {
        console.warn('Failed to clear sessionStorage:', e)
      }

      // Sign out from Supabase (this clears auth state)
      if (supabase) {
        await supabase.auth.signOut()
      }
      
      // Clear user state
      setUser(null)
      setSessionExpired(false)
      lastActivityRef.current = Date.now()
    } catch (err) {
      console.error('Sign out error:', err)
      // Still clear local state even if Supabase signOut fails
      setUser(null)
      setSessionExpired(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Initial user load
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.warn('Supabase getUser error:', error)
        setUser(null)
        setSessionExpired(false)
      } else {
        const u = data?.user || null
        // Normalize shape so existing code can keep using user.uid
        const normalized = u ? { ...u, uid: u.id } : null
        setUser(normalized)
        setSessionExpired(false)
        lastActivityRef.current = Date.now()
      }
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null
      const normalized = u ? { ...u, uid: u.id } : null
      setUser(normalized)
      setSessionExpired(false)
      lastActivityRef.current = Date.now()
    })

    // Set up activity tracking
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    activityEvents.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true })
    })

    // Set up inactivity check
    inactivityTimerRef.current = setInterval(checkSessionExpiration, 60000) // Check every minute

    return () => {
      sub?.subscription?.unsubscribe()
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateActivity)
      })
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current)
      }
    }
  }, [user, updateActivity, checkSessionExpiration, handleSignOut])

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signOut: handleSignOut, 
      showLocationPrompt, 
      setShowLocationPrompt,
      sessionExpired,
      updateActivity 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
