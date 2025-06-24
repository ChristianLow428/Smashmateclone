-- Disable RLS on matchmaking tables to allow the system to work
-- Run this in your Supabase SQL Editor

-- Disable RLS on matchmaking tables
ALTER TABLE matchmaking_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE match_chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_results DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on users table for now
ALTER TABLE users DISABLE ROW LEVEL SECURITY; 