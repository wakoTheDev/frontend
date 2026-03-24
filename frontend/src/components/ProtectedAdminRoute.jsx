import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedAdminRoute({ children }) {
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!user?.uid) {
        setIsAdmin(false)
        return
      }

      try {
        if (!supabase) {
          setIsAdmin(false)
          return
        }
        // Assumes `profiles` has `is_admin boolean` (see schema setup docs).
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.uid)
          .maybeSingle()

        if (cancelled) return

        if (error) {
          console.warn('Admin check failed:', error)
          setIsAdmin(false)
          return
        }

        setIsAdmin(!!data?.is_admin)
      } catch (err) {
        if (cancelled) return
        console.warn('Admin check error:', err)
        setIsAdmin(false)
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [user?.uid])

  if (loading || isAdmin === null) {
    return <LoadingSpinner />
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-card dark:glass-card-dark rounded-2xl p-8">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access denied</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Admin privileges are required to view this page.
          </p>
        </div>
      </div>
    )
  }

  return children
}

