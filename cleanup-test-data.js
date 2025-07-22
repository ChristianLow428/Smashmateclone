import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanupTestData() {
  try {
    console.log('Starting cleanup of test data...')

    // Delete test entries
    const { error: deleteError } = await supabase
      .from('player_ratings')
      .delete()
      .in('player_id', ['test', 'Player', 'Greetings'])

    if (deleteError) {
      console.error('Error deleting test data:', deleteError)
      return
    }

    console.log('Successfully cleaned up test data')
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
}

cleanupTestData() 