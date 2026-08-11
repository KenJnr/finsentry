// lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = async () => {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // In server components, we need to use the cookie store's set method
          // But it's not available in the same way
          // We'll handle this in middleware instead
        },
        remove(name: string, options: any) {
          // Handle remove in middleware
        },
      },
    }
  )
}