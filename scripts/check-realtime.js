const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRealtimeSetup() {
  console.log('Checking real-time setup...')

  try {
    // Check if the publication exists
    const { data: publications, error: pubError } = await supabase
      .rpc('get_publications')

    if (pubError) {
      console.error('Error checking publications:', pubError)
      return
    }

    console.log('Available publications:', publications)

    // Check if supabase_realtime publication exists
    const realtimePub = publications?.find(p => p.pubname === 'supabase_realtime')
    
    if (!realtimePub) {
      console.log('supabase_realtime publication not found, creating it...')
      
      const { error: createError } = await supabase
        .rpc('create_publication', { 
          publication_name: 'supabase_realtime',
          publish_insert: true,
          publish_update: true,
          publish_delete: true
        })

      if (createError) {
        console.error('Error creating publication:', createError)
        return
      }
      
      console.log('supabase_realtime publication created successfully')
    } else {
      console.log('supabase_realtime publication exists')
    }

    // Check which tables are in the publication
    const { data: pubTables, error: tableError } = await supabase
      .rpc('get_publication_tables', { publication_name: 'supabase_realtime' })

    if (tableError) {
      console.error('Error checking publication tables:', tableError)
      return
    }

    console.log('Tables in supabase_realtime publication:', pubTables)

    // Add tables to publication if they're not there
    const requiredTables = ['matchmaking_players', 'matches', 'match_chat_messages']
    
    for (const table of requiredTables) {
      const tableExists = pubTables?.some(t => t.tablename === table)
      
      if (!tableExists) {
        console.log(`Adding ${table} to supabase_realtime publication...`)
        
        const { error: addError } = await supabase
          .rpc('add_table_to_publication', {
            publication_name: 'supabase_realtime',
            table_name: table
          })

        if (addError) {
          console.error(`Error adding ${table} to publication:`, addError)
        } else {
          console.log(`${table} added to publication successfully`)
        }
      } else {
        console.log(`${table} is already in publication`)
      }
    }

    // Test real-time connection
    console.log('Testing real-time connection...')
    
    const channel = supabase
      .channel('test')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_chat_messages'
      }, (payload) => {
        console.log('Real-time test message received:', payload)
      })
      .subscribe((status) => {
        console.log('Real-time test subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time connection working!')
          
          // Send a test message
          supabase
            .from('match_chat_messages')
            .insert({
              match_id: '00000000-0000-0000-0000-000000000000',
              sender_id: 'test',
              content: 'Real-time test message'
            })
            .then(({ error }) => {
              if (error) {
                console.error('Error sending test message:', error)
              } else {
                console.log('Test message sent successfully')
              }
              
              // Clean up
              setTimeout(() => {
                supabase.removeChannel(channel)
                process.exit(0)
              }, 2000)
            })
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('❌ Real-time connection failed:', status)
          process.exit(1)
        }
      })

  } catch (error) {
    console.error('Error checking real-time setup:', error)
    process.exit(1)
  }
}

checkRealtimeSetup() 