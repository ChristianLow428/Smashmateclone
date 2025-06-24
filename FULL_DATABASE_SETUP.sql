-- Complete Database Setup for Smashmate Clone
-- Run this entire script in your Supabase SQL Editor

-- ========================================
-- EXISTING TABLES (if you already have these, skip them)
-- ========================================

-- Users table (if not using Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
  discord_message_id TEXT,
  discord_channel_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament participants
CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'checked_in', 'eliminated', 'winner')),
  seed INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

-- Tournament matches
CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  player1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- NEW MATCHMAKING TABLES
-- ========================================

-- Players table to track who's searching
CREATE TABLE IF NOT EXISTS matchmaking_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL,
  status TEXT DEFAULT 'searching' CHECK (status IN ('searching', 'in_match', 'offline')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table for real-time matchmaking
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID REFERENCES matchmaking_players(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES matchmaking_players(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'character_selection' CHECK (status IN ('character_selection', 'stage_striking', 'active', 'completed')),
  current_game INTEGER DEFAULT 1,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  stage_striking JSONB DEFAULT '{"currentPlayer": 0, "strikesRemaining": 1, "availableStages": ["Battlefield", "Final Destination", "Hollow Bastion", "Pokemon Stadium 2", "Small Battlefield"], "bannedStages": []}'::jsonb,
  character_selection JSONB DEFAULT '{"player1Character": null, "player2Character": null, "bothReady": false}'::jsonb,
  game_result_validation JSONB DEFAULT '{"player1Reported": null, "player2Reported": null, "bothReported": false}'::jsonb,
  selected_stage TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Match chat messages
CREATE TABLE IF NOT EXISTS match_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game results table
CREATE TABLE IF NOT EXISTS game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL,
  winner INTEGER NOT NULL CHECK (winner IN (0, 1)),
  stage TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Existing table indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_date ON tournaments(date);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_player1_id ON tournament_matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_player2_id ON tournament_matches(player2_id);

-- New matchmaking indexes
CREATE INDEX IF NOT EXISTS idx_matchmaking_players_status ON matchmaking_players(status);
CREATE INDEX IF NOT EXISTS idx_matchmaking_players_user_id ON matchmaking_players(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_player1_id ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2_id ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_match_chat_messages_match_id ON match_chat_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_game_results_match_id ON game_results(match_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES
-- ========================================

-- Users policies
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Tournaments policies
CREATE POLICY "Anyone can view tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tournaments" ON tournaments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Tournament creators can update tournaments" ON tournaments FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Tournament participants policies
CREATE POLICY "Anyone can view tournament participants" ON tournament_participants FOR SELECT USING (true);
CREATE POLICY "Users can register themselves" ON tournament_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own participation" ON tournament_participants FOR UPDATE USING (auth.uid() = user_id);

-- Tournament matches policies
CREATE POLICY "Anyone can view tournament matches" ON tournament_matches FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tournament matches" ON tournament_matches FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update tournament matches" ON tournament_matches FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Matchmaking players policies
CREATE POLICY "Users can view all players" ON matchmaking_players FOR SELECT USING (true);
CREATE POLICY "Users can insert their own player record" ON matchmaking_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own player record" ON matchmaking_players FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own player record" ON matchmaking_players FOR DELETE USING (auth.uid() = user_id);

-- Matches policies
CREATE POLICY "Players can view their matches" ON matches FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM matchmaking_players WHERE id = player1_id OR id = player2_id
  )
);
CREATE POLICY "Players can update their matches" ON matches FOR UPDATE USING (
  auth.uid() IN (
    SELECT user_id FROM matchmaking_players WHERE id = player1_id OR id = player2_id
  )
);

-- Match chat messages policies
CREATE POLICY "Players can view match chat" ON match_chat_messages FOR SELECT USING (
  auth.uid() IN (
    SELECT mp.user_id 
    FROM matchmaking_players mp
    JOIN matches m ON (mp.id = m.player1_id OR mp.id = m.player2_id)
    WHERE m.id = match_id
  )
);
CREATE POLICY "Players can send messages to their matches" ON match_chat_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  auth.uid() IN (
    SELECT mp.user_id 
    FROM matchmaking_players mp
    JOIN matches m ON (mp.id = m.player1_id OR mp.id = m.player2_id)
    WHERE m.id = match_id
  )
);

-- Game results policies
CREATE POLICY "Players can view game results" ON game_results FOR SELECT USING (
  auth.uid() IN (
    SELECT mp.user_id 
    FROM matchmaking_players mp
    JOIN matches m ON (mp.id = m.player1_id OR mp.id = m.player2_id)
    WHERE m.id = match_id
  )
);
CREATE POLICY "Players can insert game results" ON game_results FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT mp.user_id 
    FROM matchmaking_players mp
    JOIN matches m ON (mp.id = m.player1_id OR mp.id = m.player2_id)
    WHERE m.id = match_id
  )
);

-- ========================================
-- REAL-TIME FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to notify about match updates
CREATE OR REPLACE FUNCTION notify_match_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('match_update', json_build_object(
    'table', TG_TABLE_NAME,
    'type', TG_OP,
    'record', row_to_json(NEW)
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify about chat updates
CREATE OR REPLACE FUNCTION notify_chat_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('chat_update', json_build_object(
    'table', TG_TABLE_NAME,
    'type', TG_OP,
    'record', row_to_json(NEW)
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify about matchmaking updates
CREATE OR REPLACE FUNCTION notify_matchmaking_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify('matchmaking_update', json_build_object(
    'table', TG_TABLE_NAME,
    'type', TG_OP,
    'record', row_to_json(NEW)
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS
-- ========================================

-- Match update triggers
CREATE TRIGGER match_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON matches
  FOR EACH ROW EXECUTE FUNCTION notify_match_update();

-- Chat update triggers
CREATE TRIGGER chat_update_trigger
  AFTER INSERT ON match_chat_messages
  FOR EACH ROW EXECUTE FUNCTION notify_chat_update();

-- Matchmaking update triggers
CREATE TRIGGER matchmaking_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON matchmaking_players
  FOR EACH ROW EXECUTE FUNCTION notify_matchmaking_update();

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get user's current match
CREATE OR REPLACE FUNCTION get_user_current_match(user_uuid UUID)
RETURNS TABLE (
  match_id UUID,
  player_index INTEGER,
  opponent_id UUID,
  opponent_username TEXT,
  match_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as match_id,
    CASE 
      WHEN mp1.user_id = user_uuid THEN 0
      ELSE 1
    END as player_index,
    CASE 
      WHEN mp1.user_id = user_uuid THEN mp2.user_id
      ELSE mp1.user_id
    END as opponent_id,
    u.username as opponent_username,
    m.status as match_status
  FROM matches m
  JOIN matchmaking_players mp1 ON m.player1_id = mp1.id
  JOIN matchmaking_players mp2 ON m.player2_id = mp2.id
  JOIN auth.users u ON (
    CASE 
      WHEN mp1.user_id = user_uuid THEN mp2.user_id
      ELSE mp1.user_id
    END = u.id
  )
  WHERE (mp1.user_id = user_uuid OR mp2.user_id = user_uuid)
    AND m.status != 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old matchmaking records
CREATE OR REPLACE FUNCTION cleanup_old_matchmaking()
RETURNS void AS $$
BEGIN
  -- Remove players who have been offline for more than 1 hour
  DELETE FROM matchmaking_players 
  WHERE status = 'offline' 
    AND updated_at < NOW() - INTERVAL '1 hour';
  
  -- Remove completed matches older than 24 hours
  DELETE FROM matches 
  WHERE status = 'completed' 
    AND updated_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SAMPLE DATA (OPTIONAL)
-- ========================================

-- Insert sample tournament (uncomment if you want sample data)
/*
INSERT INTO tournaments (title, description, date, max_participants, status) VALUES 
(
  'Hawaii Smash Ultimate Monthly',
  'Monthly tournament for Hawaii Smash Ultimate players. Best of 3 sets, double elimination bracket.',
  NOW() + INTERVAL '7 days',
  32,
  'upcoming'
);
*/

-- ========================================
-- FINAL SETUP
-- ========================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_players;
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_participants;

-- Success message
SELECT 'Database setup completed successfully!' as status; 