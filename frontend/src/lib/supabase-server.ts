import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '@/config'

export async function createSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        const val = cookieStore.get(name)?.value
        if (name.includes('pkce')) {
          console.log(`[Supabase SSR] GET cookie: ${name} = ${val ? 'FOUND' : 'NOT FOUND'}`);
        }
        return val
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          if (name.includes('pkce')) {
            console.log(`[Supabase SSR] SET cookie: ${name} (options: ${JSON.stringify(options)})`);
          }
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
          // console.error(`[Supabase SSR] Error setting cookie ${name}:`, error)
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          if (name.includes('pkce')) {
            console.log(`[Supabase SSR] REMOVE cookie: ${name}`);
          }
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // The `remove` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
          // console.error(`[Supabase SSR] Error removing cookie ${name}:`, error)
        }
      }
    }
  })
}

export async function createSupabaseAdminClient() {
  // Ensure the service role key is available
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  })
}