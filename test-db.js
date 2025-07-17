const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabase() {
  console.log('Testing database connection...');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Present' : 'Missing');
  console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing');
  
  try {
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('tournaments')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('Database connection error:', testError);
      return;
    }

    console.log('✅ Database connection successful');

    // Get all tournaments
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tournaments:', error);
      return;
    }

    console.log(`\nFound ${tournaments.length} tournaments:`);
    tournaments.forEach((tournament, index) => {
      console.log(`${index + 1}. ${tournament.title}`);
      console.log(`   ID: ${tournament.id}`);
      console.log(`   Discord Message ID: ${tournament.discord_message_id}`);
      console.log(`   Created: ${tournament.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDatabase(); 