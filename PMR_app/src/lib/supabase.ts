import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''

// During build time, env vars might not be available
// Create a dummy client that will be replaced at runtime
if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables. Using placeholder for build.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
)
