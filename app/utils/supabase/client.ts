import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization to ensure environment variables are available at runtime
let supabaseClient: SupabaseClient | null = null

const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Validate environment variables
    if (!supabaseUrl) {
      console.error('NEXT_PUBLIC_SUPABASE_URL is not defined')
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
    }

    if (!supabaseAnonKey) {
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
    }

    console.log('Initializing Supabase client with URL:', supabaseUrl)
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })

    // Test the connection
    supabaseClient.auth.getSession().then(({ data, error }: { data: any; error: any }) => {
      if (error) {
        console.error('Supabase auth error:', error)
      } else {
        console.log('Supabase client initialized successfully')
      }
    })
  }

  return supabaseClient
}

// Export the client with proper typing
export const supabase = getSupabaseClient() 