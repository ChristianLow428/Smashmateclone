import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from the root .env.local file
dotenvConfig({ path: resolve(__dirname, '../.env.local') });

// Validate required environment variables
const requiredEnvVars = [
  'DISCORD_BOT_TOKEN',
  'DISCORD_TOURNAMENTS_CHANNEL_ID',
  'NEXT_PUBLIC_APP_URL'
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  discord: {
    token: process.env.DISCORD_BOT_TOKEN!,
    tournamentChannelId: process.env.DISCORD_TOURNAMENTS_CHANNEL_ID!,
    rankingsChannelId: process.env.DISCORD_RANKINGS_CHANNEL_ID!,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL!,
  },
} as const; 