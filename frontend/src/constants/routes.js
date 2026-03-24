/**
 * Authenticated app routes live under this prefix.
 * `/` redirects to /signin (guests) or /dashboard (signed in).
 */
export const DASHBOARD_BASE = '/dashboard'

/**
 * @param {string} [subpath] - e.g. 'about', '/profile', 'history'
 * @returns {string} e.g. '/dashboard/about'
 */
export function dashboardPath(subpath = '') {
  if (!subpath || subpath === '/') return DASHBOARD_BASE
  const clean = subpath.startsWith('/') ? subpath : `/${subpath}`
  return `${DASHBOARD_BASE}${clean}`
}

/**
 * Full URL where OAuth providers (Google, Apple) send the user after consent.
 *
 * Defaults to **site origin only** (e.g. `http://localhost:5173`) so `redirect_to` matches
 * Supabase **Site URL** and avoids HTTP 400 when `/dashboard` is not in Redirect URLs.
 * After login, `/` loads with the session in the URL hash; RootRedirect then sends users to /dashboard.
 *
 * Override with `VITE_AUTH_REDIRECT_URL` if you list a custom URL in Supabase (must match exactly).
 */
export function getOAuthRedirectTo() {
  if (typeof window === 'undefined') return ''
  const explicit = import.meta.env.VITE_AUTH_REDIRECT_URL
  if (explicit && String(explicit).trim()) return String(explicit).trim()
  return window.location.origin
}
