const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createRatingsTables() {
  console.log('Creating ratings tables...')
  
  try {
    // First, let's check if we can access the database directly
    console.log('Testing database connection...')
    
    // Try to create a test table to see if we have permissions
    const testTableName = `test_table_${Date.now()}`
    
    // Since we can't use exec_sql, let's try to create the tables by attempting to insert data
    // This will fail if the table doesn't exist, but that's expected
    
    console.log('\n1. Testing player_ratings table...')
    try {
      const { data: testData, error: testError } = await supabase
        .from('player_ratings')
        .select('*')
        .limit(1)
      
      if (testError && testError.code === '42P01') {
        console.log('❌ player_ratings table does not exist')
        console.log('You need to run the migration manually in your Supabase dashboard')
        console.log('Go to your Supabase project > SQL Editor and run the migration from:')
        console.log('supabase/migrations/20240320000006_create_ratings_table.sql')
      } else if (testError) {
        console.log('❌ Error accessing player_ratings:', testError.message)
      } else {
        console.log('✅ player_ratings table exists and is accessible')
      }
    } catch (error) {
      console.log('❌ Error testing player_ratings:', error.message)
    }
    
    console.log('\n2. Testing rating_history table...')
    try {
      const { data: testData, error: testError } = await supabase
        .from('rating_history')
        .select('*')
        .limit(1)
      
      if (testError && testError.code === '42P01') {
        console.log('❌ rating_history table does not exist')
      } else if (testError) {
        console.log('❌ Error accessing rating_history:', testError.message)
      } else {
        console.log('✅ rating_history table exists and is accessible')
      }
    } catch (error) {
      console.log('❌ Error testing rating_history:', error.message)
    }
    
    // Check if we have any existing data
    console.log('\n3. Checking for existing ratings data...')
    try {
      const { data: ratings, error: ratingsError } = await supabase
        .from('player_ratings')
        .select('*')
        .limit(5)
      
      if (ratingsError) {
        console.log('Cannot check ratings data:', ratingsError.message)
      } else {
        console.log(`Found ${ratings.length} existing ratings`)
        if (ratings.length > 0) {
          ratings.forEach(rating => {
            console.log(`  - ${rating.player_id}: ${rating.rating} (${rating.games_played} games)`)
          })
        }
      }
    } catch (error) {
      console.log('Error checking ratings data:', error.message)
    }
    
    // Check available users
    console.log('\n4. Checking available users...')
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('email, name')
        .limit(10)
      
      if (profilesError) {
        console.error('Error querying profiles:', profilesError)
      } else {
        console.log(`Found ${profiles.length} user profiles`)
        profiles.forEach(profile => {
          console.log(`  - ${profile.email} (${profile.name || 'No name'})`)
        })
      }
    } catch (error) {
      console.log('Error checking profiles:', error.message)
    }
    
    console.log('\n📋 NEXT STEPS:')
    console.log('1. Go to your Supabase project dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the contents of: supabase/migrations/20240320000006_create_ratings_table.sql')
    console.log('4. Execute the SQL')
    console.log('5. Come back and test the rating battles!')
    
  } catch (error) {
    console.error('Error creating ratings tables:', error)
  }
}

createRatingsTables() 