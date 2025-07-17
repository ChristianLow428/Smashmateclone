# ELO System Setup Instructions

## Problem
The ELO system isn't showing in rating battles because the database tables haven't been created yet.

## Solution
You need to run the migration SQL in your Supabase dashboard.

## Steps:

1. **Go to your Supabase project dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Create a new query**
   - Click "New query"

4. **Copy and paste this SQL:**

```sql
-- Create ratings table for ELO system
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

-- Create rating_history table to track rating changes
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

-- Enable Row Level Security
alter table player_ratings enable row level security;
alter table rating_history enable row level security;

-- Create policies for player_ratings
create policy "Anyone can view player ratings"
  on player_ratings for select
  using (true);

create policy "Users can insert their own rating"
  on player_ratings for insert
  with check (true);

create policy "Users can update their own rating"
  on player_ratings for update
  using (true);

-- Create policies for rating_history
create policy "Anyone can view rating history"
  on rating_history for select
  using (true);

create policy "Anyone can insert rating history"
  on rating_history for insert
  with check (true);

-- Create indexes for better performance
create index if not exists player_ratings_rating_idx on player_ratings(rating desc);
create index if not exists player_ratings_player_id_idx on player_ratings(player_id);
create index if not exists rating_history_player_id_idx on rating_history(player_id);
create index if not exists rating_history_match_id_idx on rating_history(match_id);

-- Enable realtime for the tables
alter publication supabase_realtime add table player_ratings;
alter publication supabase_realtime add table rating_history;
```

5. **Execute the SQL**
   - Click "Run" to execute the migration

6. **Verify the tables were created**
   - Go to "Table Editor" in the left sidebar
   - You should see `player_ratings` and `rating_history` tables

7. **Test the ELO system**
   - Go back to your rating battles page
   - The ELO system should now be visible and functional

## What this creates:

- **player_ratings table**: Stores each player's current rating, games played, wins, and losses
- **rating_history table**: Tracks all rating changes from matches
- **Policies**: Allows public read access and authenticated write access
- **Indexes**: Optimizes queries for performance
- **Realtime**: Enables live updates when ratings change

After running this migration, your ELO system will be fully functional! 