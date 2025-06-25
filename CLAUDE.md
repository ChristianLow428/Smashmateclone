# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmashMateClone is a Next.js 14 application for Super Smash Bros matchmaking in Hawaiʻi. It uses:
- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes + separate WebSocket server
- **Database**: PostgreSQL via Vercel Postgres/Supabase with Prisma ORM
- **Auth**: NextAuth.js with Discord OAuth
- **Real-time**: Supabase Realtime + custom WebSocket server

## Key Commands

```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)
npm run dev:server       # Build and run WebSocket server (port 8080)

# Build & Production
npm run build            # Build Next.js production bundle
npm run start            # Start Next.js production server
npm run build:server     # Build WebSocket server TypeScript
npm run start:server     # Start WebSocket server

# Code Quality
npm run lint             # Run ESLint

# Database
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema changes to database
npx prisma studio        # Open Prisma Studio GUI
```

## Architecture

### Directory Structure
```
/app                    # Next.js 14 App Router
  /api                  # API routes (auth, matchmaking, webhooks)
  /components           # React components
  /hooks                # Custom React hooks
  /services             # Business logic services
  /utils                # Utilities (Supabase client, etc.)
  /(routes)             # Page routes (chat, free-battle, profile, etc.)
/server                 # Standalone WebSocket server
/prisma                 # Database schema
/scripts                # Discord bot integration
/supabase              # Database migrations
```

### Database Schema

The application uses two database systems:
1. **Prisma** (via Vercel Postgres) - User authentication data
2. **Supabase** - Matchmaking data

Key tables in Supabase:
- `matchmaking_players`: Active players in matchmaking queue
- `matches`: Match records with player data and status
- `match_chat_messages`: In-match chat messages

**Important**: All user references use NextAuth user IDs (`user.id`), not email addresses.

### Real-time Communication

The app uses a hybrid approach:
- **Supabase Realtime**: Primary real-time updates for matchmaking
- **WebSocket Server**: Fallback when Supabase connection fails
- **Polling**: Secondary fallback (2-second intervals)

## Development Workflow

### Environment Setup
1. Copy `.env.example` to `.env.local`
2. Required environment variables:
   - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
   - `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
   - `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_WS_URL` (WebSocket server URL)

### Key Files to Understand
- `/app/api/auth/[...nextauth]/route.ts` - Authentication configuration
- `/app/services/matchmaking.ts` - Core matchmaking logic
- `/app/hooks/useMatchmaking.ts` - React hook for matchmaking UI
- `/server/src/index.ts` - WebSocket server implementation
- `/DATABASE_SETUP.sql` - Complete Supabase table setup

## Common Development Tasks

### Adding New Features
1. For UI components: Add to `/app/components`
2. For API endpoints: Add to `/app/api`
3. For real-time features: Update both Supabase listeners and WebSocket handlers
4. For database changes: Update Prisma schema AND Supabase tables

### Working with Matchmaking
- The matchmaking flow: Queue → Match Found → Character Selection → Stage Striking → In Game
- Always check `matchmaking_players` table for active players
- Use `user_id` field, not `id`, when querying matchmaking tables
- Handle both Supabase and WebSocket connections for reliability

### Debugging Real-time Issues
1. Check browser console for WebSocket connection errors
2. Verify Supabase Realtime is enabled for tables
3. Check if polling fallback is active (look for 2-second network requests)
4. Ensure RLS policies allow the operation

## Important Considerations

1. **Database Field Names**: Use `user_id` for matchmaking tables, not `id`
2. **Real-time Updates**: Always implement both Supabase and WebSocket handlers
3. **Authentication**: All API routes should verify NextAuth session
4. **Environment Detection**: Use `process.env.NODE_ENV` to detect production
5. **WebSocket Connection**: Lazy-load to prevent connection attempts during build

## Testing

### Manual Testing Flow
1. Start both Next.js and WebSocket servers
2. Log in with Discord OAuth
3. Test matchmaking queue functionality
4. Verify real-time updates work
5. Test character selection and stage striking
6. Check chat functionality

### Common Issues
- **400 Bad Request in matchmaking**: Check you're using `user_id` field
- **WebSocket connection fails**: Verify `NEXT_PUBLIC_WS_URL` is set
- **Real-time updates not working**: Check Supabase table has realtime enabled
- **Auth errors**: Ensure `NEXTAUTH_URL` matches your domain

## Deployment Notes

See `DEPLOYMENT.md` for detailed deployment instructions. Key points:
- Frontend deploys to Vercel
- WebSocket server needs separate hosting (Railway, Render, Fly.io)
- Database migrations in `/supabase` directory
- Environment variables differ between development and production

## Discord Bot Integration

The `/scripts` directory contains Discord bot code for:
- Announcing matches
- Updating player rankings
- Sending notifications

Bot requires `DISCORD_BOT_TOKEN` and appropriate Discord permissions.