# Supabase Deployment Guide

## Overview
This guide shows how to deploy your Smashmate clone using Supabase for real-time matchmaking instead of a custom WebSocket server. This approach works perfectly with Vercel deployment.

## Prerequisites
- Supabase account and project
- Vercel account
- GitHub repository with your code

## Step 1: Set Up Supabase Database

1. **Go to your Supabase project dashboard**
2. **Open the SQL Editor**
3. **Run the following SQL to create the necessary tables:**

```sql
-- Matchmaking Players
CREATE TABLE IF NOT EXISTS matchmaking_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL,
  status TEXT DEFAULT 'searching' CHECK (status IN ('searching', 'in_match', 'offline')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID REFERENCES matchmaking_players(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES matchmaking_players(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'character_selection' CHECK (status IN ('character_selection', 'stage_striking', 'active', 'completed')),
  current_game INTEGER DEFAULT 1,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  stage_striking JSONB,
  character_selection JSONB,
  game_result_validation JSONB,
  selected_stage TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Match Chat Messages
CREATE TABLE IF NOT EXISTS match_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE matchmaking_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Players can view all" ON matchmaking_players FOR SELECT USING (true);
CREATE POLICY "Players can insert" ON matchmaking_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players can update" ON matchmaking_players FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Players can delete" ON matchmaking_players FOR DELETE USING (auth.uid() = user_id);

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

CREATE POLICY "Players can view match chat" ON match_chat_messages FOR SELECT USING (
  auth.uid() IN (
    SELECT mp.user_id 
    FROM matchmaking_players mp
    JOIN matches m ON (mp.id = m.player1_id OR mp.id = m.player2_id)
    WHERE m.id = match_id
  )
);
CREATE POLICY "Players can send messages" ON match_chat_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  auth.uid() IN (
    SELECT mp.user_id 
    FROM matchmaking_players mp
    JOIN matches m ON (mp.id = m.player1_id OR mp.id = m.player2_id)
    WHERE m.id = match_id
  )
);

-- RLS Policies for game_results
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
```

## Step 2: Get Supabase Keys

1. **In your Supabase dashboard, go to Project Settings > API**
2. **Copy your Project URL and anon public key**

## Step 3: Add Environment Variables to Vercel

1. **Go to your Vercel project dashboard**
2. **Navigate to Settings > Environment Variables**
3. **Add the following variables:**

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Make sure to also add all your existing environment variables:**
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_RANKINGS_CHANNEL_ID`
   - `DISCORD_TOURNAMENTS_CHANNEL_ID`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Step 4: Deploy to Vercel

1. **Push your code to GitHub**
2. **Go to Vercel and import your repository**
3. **Set the root directory to `/` (main project directory)**
4. **Deploy**

## Step 5: Test the Deployment

1. **Visit your Vercel deployment URL**
2. **Log in with Discord**
3. **Go to Free Battle page**
4. **Test matchmaking with two different browsers/incognito windows**

## How It Works

### Real-time Updates
- **Supabase Realtime** handles all real-time communication
- **PostgreSQL triggers** notify clients of database changes
- **No custom WebSocket server needed**

### Matchmaking Flow
1. **Player searches** → Inserts row in `matchmaking_players`
2. **Opponent found** → Creates row in `matches`, updates both players
3. **Game state changes** → Updates `matches` table, triggers real-time notifications
4. **Chat messages** → Inserts in `match_chat_messages`, real-time delivery

### Benefits
- ✅ **Works on Vercel** (no serverless function limitations)
- ✅ **Scalable** (Supabase handles the backend)
- ✅ **Secure** (Row Level Security policies)
- ✅ **Real-time** (built-in pub/sub system)
- ✅ **No custom server maintenance**

## Troubleshooting

### Common Issues

1. **"Not authenticated" error**
   - Make sure NextAuth is properly configured
   - Check that user is logged in

2. **Real-time not working**
   - Verify Supabase keys are correct
   - Check browser console for connection errors
   - Ensure RLS policies are set up correctly

3. **Matchmaking not finding opponents**
   - Check that players are being inserted into `matchmaking_players`
   - Verify the matching logic in the service

4. **Environment variables not working**
   - Redeploy after adding environment variables
   - Check that variable names are correct

### Debug Tips

1. **Check browser console** for any errors
2. **Monitor Supabase logs** in the dashboard
3. **Use Supabase table viewer** to see data changes
4. **Test with multiple browsers** to simulate different users

## Next Steps

Once deployed, you can:
- Add more sophisticated matchmaking algorithms
- Implement player ratings and rankings
- Add tournament brackets
- Create persistent match history
- Add more game modes

All of these can be built on top of the existing Supabase infrastructure! 