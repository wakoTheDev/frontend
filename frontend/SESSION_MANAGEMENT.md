# Session Management & Authentication

## Overview

The AI-Powered-CropCare Dashboard uses **Supabase Auth** (`@supabase/supabase-js`) for sign-in, sessions, sign-out, and **password reset** (`ForgotPassword` → email link → `ResetPassword` with `updateUser`). App data (profiles, analysis history, feedback, weather alert history) is stored in **Supabase** (Postgres + Storage).

Configuration: `frontend/src/lib/supabaseClient.js` and `AuthContext`.

## Features

### 1. **Session persistence**
- Supabase stores the session (typically `localStorage` key `sb-<project>-auth-token`, depending on client config)
- Sessions survive page refreshes until logout or expiry

### 2. **Session expiration (in-app)**
- **Inactivity timeout**: 30 minutes without activity triggers sign-out (`AuthContext.jsx`)
- Activity: mouse, keyboard, scroll, touch, clicks

### 3. **Auth state**
- `supabase.auth.getUser()` on load
- `supabase.auth.onAuthStateChange` keeps React state in sync
- User objects are normalized with `uid: user.id` for existing components

### 4. **Secure logout**
- `supabase.auth.signOut()`
- Session storage cleared; timers and listeners cleaned up

### 5. **Route protection**
- `ProtectedRoute` redirects unauthenticated users to Sign In

## Implementation

### AuthContext (`frontend/src/contexts/AuthContext.jsx`)

- Listens with `onAuthStateChange`
- Inactivity check on an interval (every 60s) against `SESSION_TIMEOUT` (30 minutes)

### Supabase configuration

- Environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (see `.env`)

## Password reset (Supabase)

1. **Forgot password** calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: .../reset-password })`.
2. User opens the email link → Supabase redirects to `/reset-password` with either:
   - `?code=...` (PKCE) → `exchangeCodeForSession(code)`, or  
   - Hash tokens + `PASSWORD_RECOVERY` / `type=recovery` (implicit).
3. **Reset password** form calls `supabase.auth.updateUser({ password })`.

In **Supabase Dashboard → Authentication → URL Configuration**, add your app URLs to **Redirect URLs**, e.g.:

- `http://localhost:5173/reset-password`
- `https://your-production-domain.com/reset-password`

Without this, the email link may not return to your app correctly.

## Configuration

### Inactivity timeout

Edit `frontend/src/contexts/AuthContext.jsx`:

```javascript
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
```

## Troubleshooting

### Session not persisting
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
- Check browser console and Supabase Dashboard → Authentication

### Auto-logout too frequent
- Increase `SESSION_TIMEOUT`
- Ensure activity events are not blocked (extensions, iframes)

## Security practices

1. Use Row Level Security (RLS) on Supabase tables
2. Never expose service role keys in the frontend
3. Clear sensitive client state on logout
4. Keep dependencies updated
