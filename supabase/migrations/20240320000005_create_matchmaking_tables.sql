-- Create matchmaking tables for real-time functionality

-- Players table to track who's searching
CREATE TABLE IF NOT EXISTS matchmaking_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL,
  status TEXT DEFAULT 'searching' CHECK (status IN ('searching', 'in_match', 'offline')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matchmaking_players_status ON matchmaking_players(status);
CREATE INDEX IF NOT EXISTS idx_matchmaking_players_user_id ON matchmaking_players(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_player1_id ON matches(player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2_id ON matches(player2_id);
CREATE INDEX IF NOT EXISTS idx_match_chat_messages_match_id ON match_chat_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_game_results_match_id ON game_results(match_id);

-- Enable Row Level Security
ALTER TABLE matchmaking_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for matchmaking_players
CREATE POLICY "Users can view all players" ON matchmaking_players
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own player record" ON matchmaking_players
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own player record" ON matchmaking_players
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own player record" ON matchmaking_players
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for matches
CREATE POLICY "Players can view their matches" ON matches
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM matchmaking_players WHERE id = player1_id OR id = player2_id
    )
  );

CREATE POLICY "Players can update their matches" ON matches
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM matchmaking_players WHERE id = player1_id OR id = player2_id
    )
  );

-- RLS Policies for match_chat_messages
CREATE POLICY "Players can view match chat" ON match_chat_messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT mp.user_id 
      FROM matchmaking_players mp
      JOIN matches m ON (mp.id = m.player1_id OR mp.id = m.player2_id)
      WHERE m.id = match_id
    )
  );

CREATE POLICY "Players can send messages to their matches" ON match_chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    auth.uid() IN (
      SELECT mp.user_id 
      FROM matchmaking_players mp
      JOIN matches m ON (mp.id = m.player1_id OR mp.id = m.player2_id)
      WHERE m.id = match_id
    )
  );

-- RLS Policies for game_results
CREATE POLICY "Players can view game results" ON game_results
  FOR SELECT USING (
    auth.uid() IN (
      SELECT mp.user_id 
      FROM matchmaking_players mp
      JOIN matches m ON (mp.id = m.player1_id OR mp.id = m.player2_id)
      WHERE m.id = match_id
    )
  );

CREATE POLICY "Players can insert game results" ON game_results
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT mp.user_id 
      FROM matchmaking_players mp
      JOIN matches m ON (mp.id = m.player1_id OR mp.id = m.player2_id)
      WHERE m.id = match_id
    )
  );

-- Create functions for real-time updates
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

-- Create triggers for real-time notifications
CREATE TRIGGER match_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON matches
  FOR EACH ROW EXECUTE FUNCTION notify_match_update();

CREATE TRIGGER chat_update_trigger
  AFTER INSERT ON match_chat_messages
  FOR EACH ROW EXECUTE FUNCTION notify_match_update(); 