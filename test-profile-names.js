require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function testProfileNames() {
  console.log('=== Testing Profile Names ===')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Get all profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('email, name')
    .order('name')

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
    return
  }

  console.log('\n=== All Profiles in Database ===')
  profiles.forEach(profile => {
    console.log(`Email: ${profile.email} | Name: ${profile.name}`)
  })

  // Get all player ratings
  const { data: ratings, error: ratingsError } = await supabase
    .from('player_ratings')
    .select('*')
    .order('rating', { ascending: false })

  if (ratingsError) {
    console.error('Error fetching ratings:', ratingsError)
    return
  }

  console.log('\n=== All Player Ratings ===')
  ratings.forEach(rating => {
    console.log(`Player ID: ${rating.player_id} | Rating: ${rating.rating}`)
  })

  // Test the same logic as the API
  console.log('\n=== Testing API Logic ===')
  const playersWithNames = await Promise.all(
    ratings.map(async (player) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('email', player.player_id)
        .single()

      console.log(`Looking up profile for ${player.player_id}:`, profile)

      return {
        ...player,
        display_name: profile?.name || player.player_id
      }
    })
  )

  console.log('\n=== Final Result (what API should return) ===')
  playersWithNames.forEach(player => {
    console.log(`Player ID: ${player.player_id} | Display Name: ${player.display_name} | Rating: ${player.rating}`)
  })
}

testProfileNames().catch(console.error) 