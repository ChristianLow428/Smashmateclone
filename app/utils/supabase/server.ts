import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialization for server-side client
let supabaseServerClient: SupabaseClient | null = null

const getSupabaseServerClient = (): SupabaseClient => {
  if (!supabaseServerClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      console.error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
      throw new Error('Missing Supabase URL')
    }

    if (!supabaseServiceKey) {
      console.error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY')
      throw new Error('Missing Supabase service role key')
    }

    console.log('Initializing server-side Supabase client')
    
    supabaseServerClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  return supabaseServerClient
}

// Export the client with proper typing
export const supabaseServer = getSupabaseServerClient() 