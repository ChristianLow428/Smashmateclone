import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Cache the client instance
let cachedClient: any = null

export const createClient = () => {
  if (cachedClient) {
    return cachedClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    console.error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL')
    throw new Error('Missing Supabase URL')
  }

  if (!supabaseAnonKey) {
    console.error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
    throw new Error('Missing Supabase anon key')
  }

  console.log('Creating new Supabase client with URL:', supabaseUrl)
  
  cachedClient = createSupabaseClient(supabaseUrl, supabaseAnonKey)
  return cachedClient
} 