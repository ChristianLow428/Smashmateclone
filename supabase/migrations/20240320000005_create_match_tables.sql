-- Create matchmaking_players table
create table if not exists matchmaking_players (
  id text primary key,
  status text not null check (status in ('searching', 'in_match', 'offline')),
  preferences jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create matches table
create table if not exists matches (
  id uuid primary key default uuid_generate_v4(),
  player1_id text not null,
  player2_id text not null,
  status text not null check (status in ('character_selection', 'stage_striking', 'active', 'completed')),
  current_game integer default 1,
  player1_score integer default 0,
  player2_score integer default 0,
  selected_stage text,
  stage_striking jsonb,
  character_selection jsonb,
  game_result_validation jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create match_chat_messages table
create table if not exists match_chat_messages (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references matches(id) on delete cascade,
  sender_id text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table matchmaking_players enable row level security;
alter table matches enable row level security;
alter table match_chat_messages enable row level security;

-- Create policies for matchmaking_players
create policy "Anyone can view matchmaking players"
  on matchmaking_players for select
  using (true);

create policy "Users can update their own matchmaking status"
  on matchmaking_players for insert
  with check (true);

create policy "Users can update their own matchmaking status"
  on matchmaking_players for update
  using (true);

-- Create policies for matches
create policy "Anyone can view matches"
  on matches for select
  using (true);

create policy "Anyone can insert matches"
  on matches for insert
  with check (true);

create policy "Anyone can update matches"
  on matches for update
  using (true);

-- Create policies for match_chat_messages
create policy "Anyone can view match chat messages"
  on match_chat_messages for select
  using (true);

create policy "Anyone can insert match chat messages"
  on match_chat_messages for insert
  with check (true);

-- Create indexes for better performance
create index if not exists matchmaking_players_status_idx on matchmaking_players(status);
create index if not exists matches_player1_id_idx on matches(player1_id);
create index if not exists matches_player2_id_idx on matches(player2_id);
create index if not exists matches_status_idx on matches(status);
create index if not exists match_chat_messages_match_id_idx on match_chat_messages(match_id);
create index if not exists match_chat_messages_created_at_idx on match_chat_messages(created_at);

-- Enable realtime for the tables
alter publication supabase_realtime add table matchmaking_players;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table match_chat_messages; 