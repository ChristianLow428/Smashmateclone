-- Fix Database RLS Issues
-- Run this in your Supabase SQL Editor

-- Disable RLS for matchmaking tables to fix authentication issues
ALTER TABLE matchmaking_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_chat_messages DISABLE ROW LEVEL SECURITY;

-- Verify the changes
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('matchmaking_players', 'matches', 'match_chat_messages')
AND schemaname = 'public';

-- Success message
SELECT 'RLS disabled for matchmaking tables. Authentication should now work!' as status; 