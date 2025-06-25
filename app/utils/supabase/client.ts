import { createClient } from '@supabase/supabase-js'

let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  // Only create a new client if one doesn't exist or if env vars have changed
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      console.error('NEXT_PUBLIC_SUPABASE_URL is not defined')
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
    }

    if (!supabaseAnonKey) {
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })

    console.log('Supabase client created')
  }

  return supabaseClient
}

// Test the connection only once
if (typeof window !== 'undefined') {
  getSupabaseClient().auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('Supabase auth error:', error)
    } else {
      console.log('Supabase client initialized successfully')
    }
  })
} 