// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Only create admin client if service role key is available
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null

// Helper function to get admin client (with error handling)
export const getSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
  }
  return supabaseAdmin
}