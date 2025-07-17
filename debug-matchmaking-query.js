require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function debugMatchmakingQuery() {
  console.log('=== Debugging Matchmaking Query ===')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const testUserId = '110871884416486397187' // The user ID from the error

  try {
    console.log('Testing the exact query that\'s failing...')
    
    // Test the exact query from the error
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .or(`player1_id.eq.${testUserId},player2_id.eq.${testUserId}`)
      .in('status', ['character_selection', 'stage_striking', 'active'])
    
    if (error) {
      console.log('❌ Query failed:', error)
      console.log('Error code:', error.code)
      console.log('Error message:', error.message)
      console.log('Error details:', error.details)
    } else {
      console.log('✅ Query succeeded')
      console.log('Found matches:', data)
    }

    console.log('\n=== Testing Alternative Queries ===')
    
    // Test simpler queries
    console.log('1. Testing basic select...')
    const { data: basicData, error: basicError } = await supabase
      .from('matches')
      .select('*')
      .limit(1)
    
    if (basicError) {
      console.log('❌ Basic select failed:', basicError)
    } else {
      console.log('✅ Basic select works, found:', basicData.length, 'matches')
    }

    console.log('2. Testing with single condition...')
    const { data: singleData, error: singleError } = await supabase
      .from('matches')
      .select('*')
      .eq('player1_id', testUserId)
    
    if (singleError) {
      console.log('❌ Single condition failed:', singleError)
    } else {
      console.log('✅ Single condition works, found:', singleData.length, 'matches')
    }

    console.log('3. Testing status filter...')
    const { data: statusData, error: statusError } = await supabase
      .from('matches')
      .select('*')
      .in('status', ['character_selection', 'stage_striking', 'active'])
    
    if (statusError) {
      console.log('❌ Status filter failed:', statusError)
    } else {
      console.log('✅ Status filter works, found:', statusData.length, 'matches')
    }

    console.log('\n=== Checking RLS Policies ===')
    
    // Check if RLS is enabled
    const { data: rlsData, error: rlsError } = await supabase
      .from('information_schema.tables')
      .select('table_name, row_security')
      .eq('table_schema', 'public')
      .eq('table_name', 'matches')
    
    if (rlsError) {
      console.log('❌ Could not check RLS status:', rlsError)
    } else {
      console.log('RLS status for matches table:', rlsData)
    }

  } catch (error) {
    console.error('Error in debug:', error)
  }
}

debugMatchmakingQuery().catch(console.error) 