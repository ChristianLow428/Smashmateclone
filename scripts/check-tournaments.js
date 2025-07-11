const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTournaments() {
  console.log('Checking tournaments in database...');
  
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tournaments:', error);
    return;
  }

  console.log(`Found ${tournaments.length} tournaments:`);
  tournaments.forEach((tournament, index) => {
    console.log(`${index + 1}. ${tournament.title} (ID: ${tournament.id})`);
    console.log(`   Discord Message ID: ${tournament.discord_message_id}`);
    console.log(`   Created: ${tournament.created_at}`);
    console.log(`   Description: ${tournament.description?.substring(0, 100)}...`);
    console.log('');
  });
}

checkTournaments().catch(console.error); 