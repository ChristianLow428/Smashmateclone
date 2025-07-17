require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Use the exact same environment variables as the API
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Environment variables:')
console.log('SUPABASE_URL:', supabaseUrl)
console.log('SERVICE_KEY length:', supabaseServiceKey?.length || 0)

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testApiConnection() {
  console.log('\n=== Testing API Connection ===')
  
  try {
    // Test the exact same query as the API
    const { data: ratings, error: ratingsError } = await supabase
      .from('player_ratings')
      .select('*')
      .order('rating', { ascending: false })
      .limit(10)

    console.log('API-style query result:')
    console.log('Number of ratings:', ratings?.length || 0)
    ratings?.forEach(rating => {
      console.log(`  - ${rating.player_id}: ${rating.rating} (${rating.games_played} games, ${rating.wins}W/${rating.losses}L)`)
    })

    // Also get all ratings
    const { data: allRatings, error: allRatingsError } = await supabase
      .from('player_ratings')
      .select('*')
      .order('rating', { ascending: false })
    
    console.log('\nAll ratings:')
    console.log('Number of all ratings:', allRatings?.length || 0)
    allRatings?.forEach(rating => {
      console.log(`  - ${rating.player_id}: ${rating.rating} (${rating.games_played} games, ${rating.wins}W/${rating.losses}L)`)
    })

    // Test profiles query
    console.log('\nProfiles:')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, name')
      .order('email')
    
    profiles?.forEach(profile => {
      console.log(`  - ${profile.email} (name: ${profile.name || 'NULL'})`)
    })

  } catch (error) {
    console.error('Error testing API connection:', error)
  }
}

testApiConnection() 