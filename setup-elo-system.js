const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupEloSystem() {
  console.log('Setting up ELO system in database...')
  
  try {
    // Check if player_ratings table exists
    console.log('\n1. Checking if player_ratings table exists...')
    const { data: tableCheck, error: tableError } = await supabase
      .from('player_ratings')
      .select('count')
      .limit(1)
    
    if (tableError) {
      console.log('player_ratings table does not exist, creating it...')
      await createRatingsTables()
    } else {
      console.log('✅ player_ratings table exists')
    }
    
    // Check if rating_history table exists
    console.log('\n2. Checking if rating_history table exists...')
    const { data: historyCheck, error: historyError } = await supabase
      .from('rating_history')
      .select('count')
      .limit(1)
    
    if (historyError) {
      console.log('rating_history table does not exist, creating it...')
      await createRatingsTables()
    } else {
      console.log('✅ rating_history table exists')
    }
    
    // Check current data
    console.log('\n3. Checking current ratings data...')
    const { data: ratings, error: ratingsError } = await supabase
      .from('player_ratings')
      .select('*')
      .limit(5)
    
    if (ratingsError) {
      console.error('Error querying player_ratings:', ratingsError)
    } else {
      console.log(`Found ${ratings.length} player ratings`)
      if (ratings.length === 0) {
        console.log('No ratings found. The ELO system is ready but needs players to start rating battles.')
      } else {
        ratings.forEach(rating => {
          console.log(`  - ${rating.player_id}: ${rating.rating} (${rating.games_played} games)`)
        })
      }
    }
    
    // Check profiles to see available users
    console.log('\n4. Checking available users...')
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
    
    console.log('\n✅ ELO system setup complete!')
    console.log('Players can now start rating battles and their ratings will be tracked.')
    
  } catch (error) {
    console.error('Error setting up ELO system:', error)
  }
}

async function createRatingsTables() {
  console.log('Creating ratings tables...')
  
  try {
    // Create player_ratings table
    const { error: ratingsError } = await supabase.rpc('exec_sql', {
      sql: `
        create table if not exists player_ratings (
          id uuid primary key default uuid_generate_v4(),
          player_id text not null unique,
          rating integer default 1200 not null,
          games_played integer default 0 not null,
          wins integer default 0 not null,
          losses integer default 0 not null,
          created_at timestamp with time zone default timezone('utc'::text, now()) not null,
          updated_at timestamp with time zone default timezone('utc'::text, now()) not null
        );
      `
    })
    
    if (ratingsError) {
      console.error('Error creating player_ratings table:', ratingsError)
      return
    }
    
    // Create rating_history table
    const { error: historyError } = await supabase.rpc('exec_sql', {
      sql: `
        create table if not exists rating_history (
          id uuid primary key default uuid_generate_v4(),
          player_id text not null,
          match_id uuid not null,
          old_rating integer not null,
          new_rating integer not null,
          rating_change integer not null,
          opponent_id text not null,
          opponent_old_rating integer not null,
          opponent_new_rating integer not null,
          result text not null check (result in ('win', 'loss')),
          created_at timestamp with time zone default timezone('utc'::text, now()) not null
        );
      `
    })
    
    if (historyError) {
      console.error('Error creating rating_history table:', historyError)
      return
    }
    
    // Enable RLS
    await supabase.rpc('exec_sql', {
      sql: `
        alter table player_ratings enable row level security;
        alter table rating_history enable row level security;
      `
    })
    
    // Create policies
    await supabase.rpc('exec_sql', {
      sql: `
        create policy "Anyone can view player ratings"
          on player_ratings for select
          using (true);

        create policy "Users can insert their own rating"
          on player_ratings for insert
          with check (true);

        create policy "Users can update their own rating"
          on player_ratings for update
          using (true);

        create policy "Anyone can view rating history"
          on rating_history for select
          using (true);

        create policy "Anyone can insert rating history"
          on rating_history for insert
          with check (true);
      `
    })
    
    // Create indexes
    await supabase.rpc('exec_sql', {
      sql: `
        create index if not exists player_ratings_rating_idx on player_ratings(rating desc);
        create index if not exists player_ratings_player_id_idx on player_ratings(player_id);
        create index if not exists rating_history_player_id_idx on rating_history(player_id);
        create index if not exists rating_history_match_id_idx on rating_history(match_id);
      `
    })
    
    // Enable realtime
    await supabase.rpc('exec_sql', {
      sql: `
        alter publication supabase_realtime add table player_ratings;
        alter publication supabase_realtime add table rating_history;
      `
    })
    
    console.log('✅ Ratings tables created successfully')
    
  } catch (error) {
    console.error('Error creating ratings tables:', error)
  }
}

setupEloSystem() 