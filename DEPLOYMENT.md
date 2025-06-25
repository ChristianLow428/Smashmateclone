# Deployment Instructions

## WebSocket Server Deployment

### Option A: Railway (Recommended)
1. Go to [Railway](https://railway.app/)
2. Create a new project
3. Connect your GitHub repository
4. Set the root directory to `/server`
5. Railway will automatically detect the Dockerfile and deploy
6. Get the deployment URL (e.g., `https://your-app.railway.app`)
7. The WebSocket URL will be `wss://your-app.railway.app`

### Option B: Render
1. Go to [Render](https://render.com/)
2. Create a new Web Service
3. Connect your GitHub repository
4. Set the root directory to `/server`
5. Build command: `npm run build`
6. Start command: `npm start`
7. Get the deployment URL and use `wss://your-app.onrender.com`

### Option C: Fly.io
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Navigate to server directory: `cd server`
3. Deploy: `fly launch`
4. Follow the prompts and deploy
5. Get the deployment URL and use `wss://your-app.fly.dev`

## Vercel Frontend Deployment

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com/)
3. Import your repository
4. Set the root directory to `/` (main project directory)
5. Add environment variable:
   - Name: `NEXT_PUBLIC_WEBSOCKET_URL`
   - Value: Your WebSocket server URL (e.g., `wss://your-app.railway.app`)
6. Deploy

## Environment Variables

### Vercel Environment Variables
- `NEXT_PUBLIC_WEBSOCKET_URL`: Your deployed WebSocket server URL
- `DISCORD_CLIENT_ID`: Your Discord OAuth2 client ID
- `DISCORD_CLIENT_SECRET`: Your Discord OAuth2 client secret
- `DISCORD_BOT_TOKEN`: Your Discord bot token
- `DISCORD_RANKINGS_CHANNEL_ID`: Discord channel ID for rankings
- `DISCORD_TOURNAMENTS_CHANNEL_ID`: Discord channel ID for tournaments
- `NEXTAUTH_SECRET`: Random string for NextAuth
- `NEXTAUTH_URL`: Your Vercel deployment URL
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### WebSocket Server Environment Variables (if needed)
- `PORT`: Port to run on (default: 3001)
- `CORS_ORIGIN`: Allowed origins for CORS (your Vercel domain)

## Testing Deployment

1. Deploy WebSocket server first
2. Test WebSocket connection: `wscat -c wss://your-websocket-url`
3. Deploy Vercel frontend
4. Test the full application

## Troubleshooting

### WebSocket Connection Issues
- Check if WebSocket server is running: `curl https://your-websocket-url`
- Verify CORS settings if needed
- Check browser console for connection errors

### Environment Variables
- Ensure `NEXT_PUBLIC_WEBSOCKET_URL` is set correctly in Vercel
- Verify all Discord and Supabase variables are set
- Redeploy after changing environment variables

### Port Issues
- WebSocket server should run on port 3001 or the port specified by your hosting platform
- Vercel will handle the frontend port automatically 

# Vercel Deployment Guide with Supabase Real-time

## Overview
This guide shows how to deploy your Smashmate clone on Vercel using Supabase for real-time matchmaking. This approach solves the WebSocket limitation on Vercel by using Supabase's real-time features.

## Prerequisites
- Vercel account
- Supabase account and project
- GitHub repository with your code

## Step 1: Set Up Supabase Database

1. **Go to your Supabase project dashboard**
2. **Open the SQL Editor**
3. **Run the database setup script:**

```sql
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
```

## Step 2: Configure Environment Variables

1. **Get your Supabase credentials:**
   - Go to your Supabase project settings
   - Copy the Project URL and anon/public key

2. **Set up environment variables in Vercel:**
   - Go to your Vercel project settings
   - Add the following environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-vercel-domain.vercel.app
```

## Step 3: Deploy to Vercel

1. **Connect your GitHub repository to Vercel**
2. **Deploy the project**
3. **Verify the deployment**

## Step 4: Test Real-time Features

1. **Open your deployed app**
2. **Test matchmaking functionality**
3. **Verify real-time updates work**

## How It Works

### Local Development
- Uses WebSocket server for real-time communication
- Faster development experience
- No external dependencies

### Production (Vercel)
- Uses Supabase real-time subscriptions
- Works with serverless architecture
- Automatic fallback to polling if real-time fails

### Key Features

1. **Automatic Environment Detection**
   - Detects localhost vs production
   - Switches between WebSocket and Supabase automatically

2. **Robust Error Handling**
   - Fallback to polling if real-time fails
   - Graceful degradation

3. **Real-time Matchmaking**
   - Instant match creation
   - Live status updates
   - Chat functionality

## Troubleshooting

### Common Issues

1. **"400 Bad Request" errors**
   - Check your Supabase database setup
   - Verify environment variables
   - Ensure RLS policies are correct

2. **Real-time not working**
   - Check Supabase real-time is enabled
   - Verify table subscriptions
   - Check browser console for errors

3. **Matchmaking not finding opponents**
   - Check the JSONB query syntax
   - Verify player data is being inserted correctly
   - Check the polling fallback is working

### Debug Steps

1. **Check browser console for errors**
2. **Verify Supabase connection**
3. **Test database queries directly**
4. **Check Vercel function logs**

## Performance Optimization

1. **Database Indexes**
   - Already included in the setup script
   - Optimize for matchmaking queries

2. **Connection Pooling**
   - Supabase handles this automatically
   - No additional configuration needed

3. **Real-time Efficiency**
   - Uses Supabase's optimized real-time
   - Automatic reconnection handling

## Security Considerations

1. **Row Level Security (RLS)**
   - Currently set to permissive for development
   - Implement proper policies for production

2. **Environment Variables**
   - Never commit secrets to git
   - Use Vercel's environment variable system

3. **API Rate Limiting**
   - Consider implementing rate limits
   - Monitor for abuse

## Monitoring

1. **Vercel Analytics**
   - Monitor function performance
   - Track error rates

2. **Supabase Dashboard**
   - Monitor database performance
   - Track real-time connections

3. **Application Logs**
   - Check browser console
   - Monitor server-side logs

## Next Steps

1. **Implement proper RLS policies**
2. **Add rate limiting**
3. **Set up monitoring and alerts**
4. **Optimize for scale**

This setup provides a robust, scalable solution that works perfectly on Vercel while maintaining the real-time functionality your app needs. 