# HawaiiSSBU

A real-time Super Smash Bros Ultimate matchmaking platform for the Hawaii gaming community.

## Features

- **Real-time Matchmaking**: Find opponents instantly with WebSocket-powered matchmaking
- **Tournament-style Matches**: Character selection, stage striking, and best-of-3 format
- **Live Chat**: Communicate with opponents during matches
- **Hawaii-focused**: Island-based matchmaking preferences
- **Mobile Responsive**: Works great on all devices

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Node.js WebSocket server
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js
- **Deployment**: Render (WebSocket support)

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Start the development server: `npm run dev`
5. Start the WebSocket server: `cd server && npm run dev`

## Deployment

See [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) for detailed deployment instructions on Render.

## Contributing

This project is designed for the Hawaii Smash community. Feel free to contribute improvements!
