require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCurrentData() {
  console.log('=== Checking Current Database State ===')
  
  try {
    // Check all player ratings
    console.log('\n1. All Player Ratings:')
    const { data: allRatings, error: ratingsError } = await supabase
      .from('player_ratings')
      .select('*')
      .order('rating', { ascending: false })
    
    if (ratingsError) {
      console.error('Error querying player_ratings:', ratingsError)
    } else {
      console.log(`Found ${allRatings.length} player ratings:`)
      allRatings.forEach(rating => {
        console.log(`  - ${rating.player_id}: ${rating.rating} (${rating.games_played} games, ${rating.wins}W/${rating.losses}L)`)
      })
    }
    
    // Check all profiles
    console.log('\n2. All Profiles:')
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, name')
      .order('email')
    
    if (profilesError) {
      console.error('Error querying profiles:', profilesError)
    } else {
      console.log(`Found ${allProfiles.length} profiles:`)
      allProfiles.forEach(profile => {
        console.log(`  - ${profile.email} (name: ${profile.name || 'NULL'})`)
      })
    }
    
    // Check for any duplicate player_ids
    console.log('\n3. Checking for duplicates:')
    if (allRatings) {
      const playerIds = allRatings.map(r => r.player_id)
      const uniqueIds = [...new Set(playerIds)]
      if (playerIds.length !== uniqueIds.length) {
        console.log('❌ Found duplicate player_ids!')
        const duplicates = playerIds.filter((id, index) => playerIds.indexOf(id) !== index)
        console.log('Duplicate IDs:', duplicates)
      } else {
        console.log('✅ No duplicate player_ids found')
      }
    }
    
    // Test the exact API query
    console.log('\n4. Testing API Query (top 10):')
    const { data: top10, error: top10Error } = await supabase
      .from('player_ratings')
      .select('*')
      .order('rating', { ascending: false })
      .limit(10)
    
    if (top10Error) {
      console.error('Error in top 10 query:', top10Error)
    } else {
      console.log(`Top 10 players:`)
      top10.forEach((player, index) => {
        console.log(`  ${index + 1}. ${player.player_id}: ${player.rating} (${player.games_played} games)`)
      })
    }
    
  } catch (error) {
    console.error('Error in check:', error)
  }
}

checkCurrentData() 