const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Clean up stale matchmaking data
async function cleanupDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  console.log('Cleaning up stale matchmaking data...')

  try {
    // 1. Reset all players to offline status
    console.log('\n1. Resetting all players to offline status...')
    const { data: resetPlayers, error: resetError } = await supabase
      .from('matchmaking_players')
      .update({ status: 'offline' })
      .neq('id', 'dummy') // Update all rows

    if (resetError) {
      console.error('Error resetting players:', resetError)
    } else {
      console.log('✅ All players reset to offline')
    }

    // 2. Complete any active matches
    console.log('\n2. Completing any active matches...')
    const { data: completeMatches, error: completeError } = await supabase
      .from('matches')
      .update({ status: 'completed' })
      .in('status', ['character_selection', 'stage_striking', 'active'])

    if (completeError) {
      console.error('Error completing matches:', completeError)
    } else {
      console.log('✅ All active matches completed')
    }

    // 3. Show current state
    console.log('\n3. Current database state:')
    
    const { data: players } = await supabase
      .from('matchmaking_players')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('Recent players:', players?.length || 0)

    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('Recent matches:', matches?.length || 0)

    console.log('\n🎉 Database cleanup completed!')
    console.log('You can now start fresh matchmaking.')

  } catch (error) {
    console.error('Cleanup failed:', error)
    process.exit(1)
  }
}

cleanupDatabase() 