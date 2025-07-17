const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testRatings() {
  console.log('Testing ratings tables...')
  
  try {
    // Check if player_ratings table exists and has data
    console.log('\n1. Checking player_ratings table...')
    const { data: ratings, error: ratingsError } = await supabase
      .from('player_ratings')
      .select('*')
      .limit(10)
    
    if (ratingsError) {
      console.error('Error querying player_ratings:', ratingsError)
    } else {
      console.log(`Found ${ratings.length} player ratings:`)
      ratings.forEach(rating => {
        console.log(`  - ${rating.player_id}: ${rating.rating} (${rating.games_played} games, ${rating.wins}W/${rating.losses}L)`)
      })
    }
    
    // Check if rating_history table exists and has data
    console.log('\n2. Checking rating_history table...')
    const { data: history, error: historyError } = await supabase
      .from('rating_history')
      .select('*')
      .limit(10)
    
    if (historyError) {
      console.error('Error querying rating_history:', historyError)
    } else {
      console.log(`Found ${history.length} rating history records:`)
      history.forEach(record => {
        console.log(`  - ${record.player_id} vs ${record.opponent_id}: ${record.old_rating} -> ${record.new_rating} (${record.rating_change >= 0 ? '+' : ''}${record.rating_change})`)
      })
    }
    
    // Check profiles table to see available users
    console.log('\n3. Checking profiles table...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, name')
      .limit(10)
    
    if (profilesError) {
      console.error('Error querying profiles:', profilesError)
    } else {
      console.log(`Found ${profiles.length} profiles:`)
      profiles.forEach(profile => {
        console.log(`  - ${profile.email} (${profile.name || 'No name'})`)
      })
    }
    
  } catch (error) {
    console.error('Error testing ratings:', error)
  }
}

testRatings() 