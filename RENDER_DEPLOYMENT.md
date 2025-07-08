# Render Deployment Guide for HawaiiSSBU

## Overview
This guide will help you deploy your HawaiiSSBU app on Render, which provides excellent WebSocket support.

## Prerequisites
- A Render account (free at render.com)
- Your code pushed to a GitHub repository

## Step 1: Deploy WebSocket Server

### 1.1 Create New Web Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository containing your HawaiiSSBU code

### 1.2 Configure WebSocket Server
- **Name**: `hawaiissbu-websocket-server`
- **Environment**: `Node`
- **Root Directory**: `server`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free (or choose paid for better performance)

### 1.3 Environment Variables
Add these environment variables:
- `NODE_ENV`: `production`
- `PORT`: `3001`

### 1.4 Deploy
Click "Create Web Service" and wait for deployment to complete.

## Step 2: Deploy Next.js Frontend

### 2.1 Create Another Web Service
1. Go back to Render Dashboard
2. Click "New +" → "Web Service"
3. Select the same GitHub repository

### 2.2 Configure Frontend
- **Name**: `hawaiissbu-frontend`
- **Environment**: `Node`
- **Root Directory**: Leave empty (root of repo)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free (or choose paid for better performance)

### 2.3 Environment Variables
Add these environment variables:
- `NODE_ENV`: `production`
- `PORT`: `3000`
- `NEXT_PUBLIC_WEBSOCKET_URL`: `wss://hawaiissbu-websocket-server.onrender.com`

**Important**: Replace `hawaiissbu-websocket-server` with the actual name you used in Step 1.

### 2.4 Deploy
Click "Create Web Service" and wait for deployment to complete.

## Step 3: Update WebSocket URL

After both services are deployed:

1. Go to your frontend service settings
2. Update the `NEXT_PUBLIC_WEBSOCKET_URL` environment variable with the actual WebSocket server URL
3. Redeploy the frontend service

## Step 4: Test Your Deployment

1. Visit your frontend URL (e.g., `https://hawaiissbu-frontend.onrender.com`)
2. Test the matchmaking functionality
3. Verify WebSocket connections are working

## Troubleshooting

### WebSocket Connection Issues
- Check that the WebSocket server URL is correct
- Ensure both services are running
- Check Render logs for any errors

### Build Issues
- Verify all dependencies are in package.json
- Check that TypeScript compilation succeeds
- Ensure build commands are correct

### Performance Issues
- Consider upgrading to a paid plan for better performance
- Monitor resource usage in Render dashboard

## Environment Variables Reference

### WebSocket Server
```env
NODE_ENV=production
PORT=3001
```

### Frontend
```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-websocket-server-url.onrender.com
```

## URLs
- **Frontend**: `https://hawaiissbu-frontend.onrender.com`
- **WebSocket Server**: `wss://hawaiissbu-websocket-server.onrender.com`

## Support
- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com) 