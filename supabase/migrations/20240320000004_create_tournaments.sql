-- Create tournaments table
create table if not exists tournaments (
  id uuid primary key default uuid_generate_v4(),
  discord_message_id text unique,
  title text not null,
  description text,
  date timestamp with time zone,
  registration_deadline timestamp with time zone,
  max_participants integer,
  current_participants integer default 0,
  status text default 'upcoming',
  discord_channel_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
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
alter table tournaments enable row level security;
alter table tournament_participants enable row level security;

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

-- Create indexes
create index if not exists tournaments_date_idx on tournaments(date);
create index if not exists tournaments_status_idx on tournaments(status);
create index if not exists tournament_participants_tournament_id_idx on tournament_participants(tournament_id);
create index if not exists tournament_participants_user_id_idx on tournament_participants(user_id); 