const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyRatingsMigration() {
  console.log('Applying ratings migration...')
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20240320000006_create_ratings_table.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('Migration SQL loaded, applying...')
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`)
        
        try {
          // Use the REST API to execute SQL
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey
            },
            body: JSON.stringify({
              sql: statement + ';'
            })
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            console.log(`Statement ${i + 1} result: ${response.status} - ${errorText}`)
          } else {
            console.log(`Statement ${i + 1} executed successfully`)
          }
        } catch (error) {
          console.log(`Statement ${i + 1} error:`, error.message)
        }
      }
    }
    
    console.log('✅ Migration applied!')
    
    // Verify the tables were created
    console.log('\nVerifying tables...')
    
    const { data: ratings, error: ratingsError } = await supabase
      .from('player_ratings')
      .select('count')
      .limit(1)
    
    if (ratingsError) {
      console.error('❌ player_ratings table still not accessible:', ratingsError.message)
    } else {
      console.log('✅ player_ratings table is accessible')
    }
    
    const { data: history, error: historyError } = await supabase
      .from('rating_history')
      .select('count')
      .limit(1)
    
    if (historyError) {
      console.error('❌ rating_history table still not accessible:', historyError.message)
    } else {
      console.log('✅ rating_history table is accessible')
    }
    
  } catch (error) {
    console.error('Error applying migration:', error)
  }
}

applyRatingsMigration() 