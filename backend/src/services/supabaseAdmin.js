import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Resolve correct path to backend/.env regardless of where the file is called from
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: resolve(__dirname, '../../.env') })

const url =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL

const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error(
    'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env or Vercel environment variables'
  )
}

export const supabaseAdmin = createClient(url, serviceKey)