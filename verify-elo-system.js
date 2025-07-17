const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyEloSystem() {
  console.log('🔍 Verifying ELO system setup...')
  
  try {
    // Test player_ratings table
    console.log('\n1. Testing player_ratings table...')
    const { data: ratings, error: ratingsError } = await supabase
      .from('player_ratings')
      .select('*')
      .limit(5)
    
    if (ratingsError) {
      console.error('❌ player_ratings table error:', ratingsError.message)
      return false
    } else {
      console.log('✅ player_ratings table is accessible')
      console.log(`   Found ${ratings.length} existing ratings`)
    }
    
    // Test rating_history table
    console.log('\n2. Testing rating_history table...')
    const { data: history, error: historyError } = await supabase
      .from('rating_history')
      .select('*')
      .limit(5)
    
    if (historyError) {
      console.error('❌ rating_history table error:', historyError.message)
      return false
    } else {
      console.log('✅ rating_history table is accessible')
      console.log(`   Found ${history.length} existing history records`)
    }
    
    // Test inserting a sample rating
    console.log('\n3. Testing rating insertion...')
    const testEmail = 'test@example.com'
    const { data: insertData, error: insertError } = await supabase
      .from('player_ratings')
      .upsert({
        player_id: testEmail,
        rating: 1200,
        games_played: 0,
        wins: 0,
        losses: 0
      }, { onConflict: 'player_id' })
    
    if (insertError) {
      console.error('❌ Rating insertion error:', insertError.message)
      return false
    } else {
      console.log('✅ Rating insertion works')
    }
    
    // Test updating a rating
    console.log('\n4. Testing rating update...')
    const { data: updateData, error: updateError } = await supabase
      .from('player_ratings')
      .update({
        rating: 1250,
        games_played: 1,
        wins: 1,
        losses: 0
      })
      .eq('player_id', testEmail)
    
    if (updateError) {
      console.error('❌ Rating update error:', updateError.message)
      return false
    } else {
      console.log('✅ Rating update works')
    }
    
    // Test rating history insertion
    console.log('\n5. Testing rating history insertion...')
    const { data: historyData, error: historyInsertError } = await supabase
      .from('rating_history')
      .insert({
        player_id: testEmail,
        match_id: '00000000-0000-0000-0000-000000000000',
        old_rating: 1200,
        new_rating: 1250,
        rating_change: 50,
        opponent_id: 'opponent@example.com',
        opponent_old_rating: 1200,
        opponent_new_rating: 1150,
        result: 'win'
      })
    
    if (historyInsertError) {
      console.error('❌ Rating history insertion error:', historyInsertError.message)
      return false
    } else {
      console.log('✅ Rating history insertion works')
    }
    
    // Check available users
    console.log('\n6. Checking available users...')
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, name')
      .limit(10)
    
    if (profilesError) {
      console.error('❌ Error querying profiles:', profilesError)
    } else {
      console.log(`✅ Found ${profiles.length} user profiles`)
      profiles.forEach(profile => {
        console.log(`   - ${profile.email} (${profile.name || 'No name'})`)
      })
    }
    
    console.log('\n🎉 ELO system verification complete!')
    console.log('✅ All database operations are working correctly')
    console.log('✅ Your ELO system is ready for rating battles!')
    
    return true
    
  } catch (error) {
    console.error('❌ Error during verification:', error)
    return false
  }
}

verifyEloSystem() 