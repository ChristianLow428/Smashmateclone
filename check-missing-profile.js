require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

async function checkMissingProfile() {
  console.log('=== Checking Missing Profile ===')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const missingEmail = 'cklow@hawaii.edu'

  // Check if profile exists
  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', missingEmail)
    .single()

  if (profileError && profileError.code === 'PGRST116') {
    console.log(`No profile found for ${missingEmail}`)
    
    // Create a profile for this user
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert([
        {
          email: missingEmail,
          name: 'Player', // Default name
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
    } else {
      console.log('Created profile:', newProfile)
    }
  } else if (profileError) {
    console.error('Error checking profile:', profileError)
  } else {
    console.log('Profile already exists:', existingProfile)
  }
}

checkMissingProfile().catch(console.error) 