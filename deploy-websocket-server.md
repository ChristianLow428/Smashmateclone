# WebSocket Server Deployment Instructions

## Manual Deployment on Render

Since Blueprint is not available, follow these steps to manually deploy the WebSocket server:

### Step 1: Create Web Service
1. Go to your Render dashboard
2. Click "New" → "Web Service"
3. Connect your GitHub repository (same as frontend)

### Step 2: Configure Service
- **Name**: `hawaiissbu-websocket-server`
- **Root Directory**: `server`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/`

### Step 3: Environment Variables
Add these environment variables:
- `NODE_ENV`: `production`
- `PORT`: `3001`

### Step 4: Deploy
Click "Create Web Service" and wait for deployment to complete.

### Step 5: Verify Deployment
Once deployed, the WebSocket server will be available at:
`wss://hawaiissbu-websocket-server.onrender.com`

### Step 6: Test Connection
Run this command to test if the server is working:
```bash
node test-websocket-server.js
```

## Expected Result
After successful deployment, both free battle and rating battle should work because they both connect to the same WebSocket server.

## Troubleshooting
- If deployment fails, check the build logs in Render
- Make sure the `server` directory contains all necessary files
- Verify that `package.json` and `tsconfig.json` are in the `server` directory 