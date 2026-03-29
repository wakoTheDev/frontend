import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Ensure backend/.env is loaded before reading env vars
dotenv.config()

const url =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL // fallback if using same var name as frontend

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error(
    'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_URL/VITE_SUPABASE_SERVICE_ROLE_KEY) must be set in backend/.env'
  )
}

export const supabaseAdmin = createClient(url, serviceKey)


