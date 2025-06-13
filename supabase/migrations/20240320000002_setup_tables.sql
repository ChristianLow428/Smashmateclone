-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table (if not exists)
create table if not exists profiles (
  id uuid references auth.users on delete cascade,
  email text unique not null,
  name text,
  image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

-- Create chat_rooms table (if not exists)
create table if not exists chat_rooms (
  id uuid primary key default uuid_generate_v4(),
  participants uuid[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create messages table (if not exists)
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  chat_room_id uuid references chat_rooms(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Drop tournaments table if it exists to ensure clean state
DROP TABLE IF EXISTS tournaments CASCADE;

-- Create tournaments table
create table tournaments (
  id uuid primary key default uuid_generate_v4(),
  discord_message_id text unique,
  discord_channel_id text not null,
  title text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create tournament_participants table
create table if not exists tournament_participants (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid references tournaments(id) on delete cascade,
  user_id uuid not null,
  discord_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(tournament_id, user_id)
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table chat_rooms enable row level security;
alter table messages enable row level security;
alter table tournaments enable row level security;
alter table tournament_participants enable row level security;

-- Create policies for profiles
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Create policies for chat_rooms
create policy "Users can view their own chat rooms"
  on chat_rooms for select
  using (auth.uid() = any(participants));

create policy "Users can create chat rooms they are part of"
  on chat_rooms for insert
  with check (auth.uid() = any(participants));

-- Create policies for messages
create policy "Users can view messages in their chat rooms"
  on messages for select
  using (
    exists (
      select 1 from chat_rooms
      where id = messages.chat_room_id
      and auth.uid() = any(participants)
    )
  );

create policy "Users can send messages to their chat rooms"
  on messages for insert
  with check (
    exists (
      select 1 from chat_rooms
      where id = messages.chat_room_id
      and auth.uid() = any(participants)
    )
  );

-- Create policies for tournaments
create policy "Anyone can view tournaments"
  on tournaments for select
  using (true);

create policy "Only admins can insert tournaments"
  on tournaments for insert
  with check (auth.uid() in (select id from profiles where email = 'admin@example.com'));

create policy "Only admins can update tournaments"
  on tournaments for update
  using (auth.uid() in (select id from profiles where email = 'admin@example.com'));

-- Create policies for tournament_participants
create policy "Anyone can view tournament participants"
  on tournament_participants for select
  using (true);

create policy "Users can join tournaments"
  on tournament_participants for insert
  with check (auth.uid() = user_id);

create policy "Users can leave tournaments"
  on tournament_participants for delete
  using (auth.uid() = user_id);

-- Create indexes for better performance
create index if not exists messages_chat_room_id_idx on messages(chat_room_id);
create index if not exists messages_sender_id_idx on messages(sender_id);
create index if not exists chat_rooms_participants_idx on chat_rooms using gin(participants);
create index if not exists tournament_participants_tournament_id_idx on tournament_participants(tournament_id);
create index if not exists tournament_participants_user_id_idx on tournament_participants(user_id);
create index if not exists idx_tournaments_discord_message_id on tournaments(discord_message_id);

-- Drop unnecessary columns
ALTER TABLE tournaments 
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS updated_at,
  DROP COLUMN IF EXISTS date,
  DROP COLUMN IF EXISTS registration_deadline,
  DROP COLUMN IF EXISTS max_participants,
  DROP COLUMN IF EXISTS current_participants,
  DROP COLUMN IF EXISTS tournament_link;

-- Drop unnecessary indexes
DROP INDEX IF EXISTS tournaments_status_idx;

-- Drop the tournament_link column if it exists
ALTER TABLE tournaments DROP COLUMN IF EXISTS tournament_link;

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read tournaments
CREATE POLICY "Allow public read access to tournaments"
ON tournaments FOR SELECT
TO public
USING (true);

-- Enable realtime for the tables
alter publication supabase_realtime add table chat_rooms;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table tournaments;
alter publication supabase_realtime add table tournament_participants;