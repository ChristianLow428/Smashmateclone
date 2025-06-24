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