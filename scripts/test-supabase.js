const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Test Supabase connection and queries
async function testSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  console.log('Testing Supabase connection...')

  try {
    // Test 1: Basic connection
    console.log('\n1. Testing basic connection...')
    const { data, error } = await supabase.from('matchmaking_players').select('count').limit(1)
    if (error) {
      console.error('Connection test failed:', error)
    } else {
      console.log('✅ Connection successful')
    }

    // Test 2: Insert a test player
    console.log('\n2. Testing player insertion...')
    const testPlayer = {
      id: 'test-player-' + Date.now(),
      preferences: {
        island: 'Oahu',
        connection: 'wired',
        rules: {
          stock: 3,
          time: 8,
          items: false,
          stageHazards: false
        }
      },
      status: 'searching'
    }

    const { data: insertData, error: insertError } = await supabase
      .from('matchmaking_players')
      .insert(testPlayer)
      .select()

    if (insertError) {
      console.error('❌ Insert test failed:', insertError)
    } else {
      console.log('✅ Insert successful:', insertData)
    }

    // Test 3: JSONB query (now using JavaScript filtering)
    console.log('\n3. Testing JSONB query with JavaScript filtering...')
    const { data: queryData, error: queryError } = await supabase
      .from('matchmaking_players')
      .select('*')
      .eq('status', 'searching')
      .limit(10)

    if (queryError) {
      console.error('❌ Query failed:', queryError)
    } else {
      // Filter in JavaScript
      const filteredData = queryData?.filter(player => 
        player.preferences?.island === 'Oahu'
      ) || []
      console.log('✅ JavaScript filtering successful:', filteredData)
    }

    // Test 4: Real-time subscription
    console.log('\n4. Testing real-time subscription...')
    const channel = supabase
      .channel('test-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matchmaking_players'
        },
        (payload) => {
          console.log('✅ Real-time event received:', payload)
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription successful')
        } else {
          console.log('❌ Real-time subscription failed')
        }
      })

    // Wait a bit for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Clean up test data
    console.log('\n5. Cleaning up test data...')
    await supabase
      .from('matchmaking_players')
      .delete()
      .eq('id', testPlayer.id)

    console.log('✅ Test data cleaned up')

    // Unsubscribe from real-time
    await supabase.removeChannel(channel)

    console.log('\n🎉 All tests completed!')

  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  }
}

testSupabase() 