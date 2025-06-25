-- Check if supabase_realtime publication exists
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- Create supabase_realtime publication if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
        RAISE NOTICE 'Created supabase_realtime publication';
    ELSE
        RAISE NOTICE 'supabase_realtime publication already exists';
    END IF;
END $$;

-- Check which tables are in the publication
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Add our tables to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_players;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_chat_messages;

-- Verify the tables are now in the publication
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('matchmaking_players', 'matches', 'match_chat_messages');

-- Check if realtime is enabled for the database
SHOW rls.realtime_enabled;

-- Enable realtime if not already enabled
ALTER DATABASE postgres SET rls.realtime_enabled = true; 