import { createClient } from '@supabase/supabase-js'
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
const projectId = import.meta.env.VITE_PROJECT_ID
const clientSecret = import.meta.env.VITE_CLIENT_SECRET
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Prefer explicit anon key, but fall back to Vercel/Supabase default publishable key name
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

