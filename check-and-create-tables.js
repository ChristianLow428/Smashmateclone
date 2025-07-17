require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function checkAndCreateTables() {
  console.log('=== Checking and Creating Matchmaking Tables ===')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Check if matchmaking_players table exists
    console.log('Checking if matchmaking_players table exists...')
    const { data: playersData, error: playersError } = await supabase
      .from('matchmaking_players')
      .select('count')
      .limit(1)
    
    if (playersError && playersError.code === '42P01') {
      console.log('❌ matchmaking_players table does not exist, creating...')
      
      // Create the table
      const { error: createPlayersError } = await supabase.rpc('create_matchmaking_players_table')
      if (createPlayersError) {
        console.log('Trying alternative creation method...')
        // Try direct SQL creation
        const { error } = await supabase
          .from('matchmaking_players')
          .insert({ id: 'test', status: 'offline', preferences: {} })
          .select()
        
        if (error && error.code === '42P01') {
          console.log('❌ Cannot create matchmaking_players table - table does not exist')
        }
      } else {
        console.log('✅ matchmaking_players table created')
      }
    } else {
      console.log('✅ matchmaking_players table exists')
    }

    // Check if matches table exists
    console.log('Checking if matches table exists...')
    const { data: matchesData, error: matchesError } = await supabase
      .from('matches')
      .select('count')
      .limit(1)
    
    if (matchesError && matchesError.code === '42P01') {
      console.log('❌ matches table does not exist')
    } else {
      console.log('✅ matches table exists')
    }

    // Check if match_chat_messages table exists
    console.log('Checking if match_chat_messages table exists...')
    const { data: chatData, error: chatError } = await supabase
      .from('match_chat_messages')
      .select('count')
      .limit(1)
    
    if (chatError && chatError.code === '42P01') {
      console.log('❌ match_chat_messages table does not exist')
    } else {
      console.log('✅ match_chat_messages table exists')
    }

    console.log('\n=== Summary ===')
    console.log('The 406 errors you\'re seeing are because these tables don\'t exist in your Supabase database.')
    console.log('You need to either:')
    console.log('1. Apply the migration manually in your Supabase dashboard')
    console.log('2. Switch to using the WebSocket server instead of Supabase matchmaking')
    
  } catch (error) {
    console.error('Error checking tables:', error)
  }
}

checkAndCreateTables().catch(console.error) 