require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixDuplicateRatings() {
  console.log('=== Checking for Duplicate Player Ratings ===')
  
  try {
    // Get all player ratings
    const { data: allRatings, error } = await supabase
      .from('player_ratings')
      .select('*')
      .order('player_id')
    
    if (error) {
      console.error('Error fetching ratings:', error)
      return
    }
    
    console.log(`Found ${allRatings.length} total ratings`)
    
    // Group by player_id to find duplicates
    const grouped = {}
    allRatings.forEach(rating => {
      if (!grouped[rating.player_id]) {
        grouped[rating.player_id] = []
      }
      grouped[rating.player_id].push(rating)
    })
    
    // Find players with multiple ratings
    const duplicates = Object.entries(grouped).filter(([playerId, ratings]) => ratings.length > 1)
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate player ratings found')
      return
    }
    
    console.log(`Found ${duplicates.length} players with duplicate ratings:`)
    
    for (const [playerId, ratings] of duplicates) {
      console.log(`\n${playerId}:`)
      ratings.forEach(rating => {
        console.log(`  - ID: ${rating.id}, Rating: ${rating.rating}, Games: ${rating.games_played}, Updated: ${rating.updated_at}`)
      })
      
      // Keep the most recent rating (highest updated_at)
      const sortedRatings = ratings.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      const keepRating = sortedRatings[0]
      const deleteRatings = sortedRatings.slice(1)
      
      console.log(`  Keeping: ID ${keepRating.id} (most recent)`)
      console.log(`  Deleting: ${deleteRatings.length} duplicate(s)`)
      
      // Delete duplicate ratings
      for (const deleteRating of deleteRatings) {
        const { error: deleteError } = await supabase
          .from('player_ratings')
          .delete()
          .eq('id', deleteRating.id)
        
        if (deleteError) {
          console.error(`Error deleting rating ${deleteRating.id}:`, deleteError)
        } else {
          console.log(`  ✅ Deleted rating ${deleteRating.id}`)
        }
      }
    }
    
    console.log('\n=== Final State ===')
    const { data: finalRatings } = await supabase
      .from('player_ratings')
      .select('*')
      .order('rating', { ascending: false })
    
    console.log('Final ratings:')
    finalRatings.forEach(rating => {
      console.log(`  - ${rating.player_id}: ${rating.rating} (${rating.games_played} games, ${rating.wins}W/${rating.losses}L)`)
    })
    
  } catch (error) {
    console.error('Error fixing duplicates:', error)
  }
}

fixDuplicateRatings() 