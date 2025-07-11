"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = require("dotenv");
const path_1 = require("path");
// Load environment variables from the root .env.local file
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, '../.env.local') });
// Validate required environment variables
const requiredEnvVars = [
    'DISCORD_BOT_TOKEN',
    'DISCORD_TOURNAMENTS_CHANNEL_ID',
    'NEXT_PUBLIC_APP_URL'
];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}
exports.config = {
    discord: {
        token: process.env.DISCORD_BOT_TOKEN,
        tournamentChannelId: process.env.DISCORD_TOURNAMENTS_CHANNEL_ID,
        rankingsChannelId: process.env.DISCORD_RANKINGS_CHANNEL_ID,
    },
    app: {
        url: process.env.NEXT_PUBLIC_APP_URL,
    },
};
