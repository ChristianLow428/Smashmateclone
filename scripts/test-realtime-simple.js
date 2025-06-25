const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

console.log('Testing real-time connection...')

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

async function testRealtime() {
  console.log('1. Testing real-time subscription without auth...')
  
  const channel = supabase
    .channel('test-channel')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'match_chat_messages'
    }, (payload) => {
      console.log('📨 Real-time message received:', payload)
    })
    .subscribe((status) => {
      console.log('📡 Subscription status:', status)
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Real-time subscription successful!')
        
        // Test sending a message (this might fail due to RLS, but subscription should work)
        console.log('2. Testing message sending...')
        supabase
          .from('match_chat_messages')
          .insert({
            match_id: '00000000-0000-0000-0000-000000000000',
            sender_id: 'test-user',
            content: 'Test message from real-time test'
          })
          .then(({ data, error }) => {
            if (error) {
              console.log('⚠️  Message send failed (expected due to RLS):', error.message)
            } else {
              console.log('✅ Message sent successfully:', data)
            }
            
            // Clean up after 3 seconds
            setTimeout(() => {
              console.log('3. Cleaning up...')
              supabase.removeChannel(channel)
              process.exit(0)
            }, 3000)
          })
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Channel error occurred')
        process.exit(1)
      } else if (status === 'TIMED_OUT') {
        console.error('❌ Subscription timed out')
        process.exit(1)
      } else if (status === 'CLOSED') {
        console.error('❌ Subscription closed')
        process.exit(1)
      }
    })
}

testRealtime().catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
}) 