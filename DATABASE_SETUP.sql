-- Complete Database Setup for Smashmate Clone (NextAuth)
-- Run this entire script in your Supabase SQL Editor

-- ========================================
-- MATCHMAKING TABLES
-- ========================================

-- Drop existing tables if they exist (to avoid conflicts)
DROP TABLE IF EXISTS match_chat_messages CASCADE;
DROP TABLE IF EXISTS game_results CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS matchmaking_players CASCADE;

-- Players table to track who's searching
CREATE TABLE matchmaking_players (
  id TEXT PRIMARY KEY, -- NextAuth user ID (like "110871884416486397187")
  preferences JSONB NOT NULL,
  status TEXT DEFAULT 'searching' CHECK (status IN ('searching', 'in_match', 'offline')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches table for real-time matchmaking
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id TEXT REFERENCES matchmaking_players(id) ON DELETE CASCADE,
  player2_id TEXT REFERENCES matchmaking_players(id) ON DELETE CASCADE,
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
CREATE TABLE match_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL, -- NextAuth user ID
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX idx_matchmaking_players_status ON matchmaking_players(status);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_player1_id ON matches(player1_id);
CREATE INDEX idx_matches_player2_id ON matches(player2_id);
CREATE INDEX idx_match_chat_messages_match_id ON match_chat_messages(match_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE matchmaking_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (for development - you can make these more restrictive later)
CREATE POLICY "Allow all operations on matchmaking_players" ON matchmaking_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on matches" ON matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on match_chat_messages" ON match_chat_messages FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- ENABLE REALTIME
-- ========================================

-- Enable realtime for the tables
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_players;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_chat_messages;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT 'Database setup completed successfully! Matchmaking tables are ready.' as status; 