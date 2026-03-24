import { createContext, useContext, useCallback, useRef } from 'react'
import { getUserProfile } from '../lib/supabase'
import { getAnalysisHistory } from '../lib/analysisStore'

const PrefetchContext = createContext(null)

export function PrefetchProvider({ children }) {
  const profileCache = useRef(new Map())
  const historyCache = useRef(new Map())

  const prefetchProfile = useCallback((uid) => {
    if (!uid) return
    getUserProfile(uid).then((p) => {
      profileCache.current.set(uid, p)
    }).catch(() => {})
  }, [])

  const prefetchHistory = useCallback((uid) => {
    if (!uid) return
    getAnalysisHistory(uid).then((list) => {
      historyCache.current.set(uid, list)
    }).catch(() => {})
  }, [])

  const getCachedProfile = useCallback((uid) => profileCache.current.get(uid), [])
  const getCachedHistory = useCallback((uid) => historyCache.current.get(uid), [])

  const setCachedProfile = useCallback((uid, data) => {
    if (uid) profileCache.current.set(uid, data)
  }, [])
  const setCachedHistory = useCallback((uid, data) => {
    if (uid) historyCache.current.set(uid, data)
  }, [])

  const invalidateProfile = useCallback((uid) => {
    if (uid) profileCache.current.delete(uid)
  }, [])
  const invalidateHistory = useCallback((uid) => {
    if (uid) historyCache.current.delete(uid)
  }, [])

  return (
    <PrefetchContext.Provider
      value={{
        prefetchProfile,
        prefetchHistory,
        getCachedProfile,
        getCachedHistory,
        setCachedProfile,
        setCachedHistory,
        invalidateProfile,
        invalidateHistory,
      }}
    >
      {children}
    </PrefetchContext.Provider>
  )
}

export function usePrefetch() {
  const ctx = useContext(PrefetchContext)
  if (!ctx) return {}
  return ctx
}
