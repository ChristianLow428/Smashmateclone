"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const config_1 = require("./config");
dotenv_1.default.config();
// Function to find the first URL in text
function findFirstUrl(text) {
    const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
}
// Function to clean up the description
function cleanDescription(text) {
    if (!text)
        return '';
    // Split into lines and remove empty lines
    const lines = text.split('\n').filter(line => line.trim());
    // Remove lines that are just URLs
    const cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        return !trimmed.match(/^https?:\/\//);
    });
    // Join back together with proper spacing
    return cleanedLines.join('\n\n');
}
// Function to extract title from description
function extractTitle(description) {
    if (!description)
        return 'Untitled Tournament';
    const lines = description.split('\n');
    // Skip any URL lines at the start
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.match(/^https?:\/\//)) {
            return trimmed;
        }
    }
    return 'Untitled Tournament';
}
console.log('Configuration loaded:');
console.log('DISCORD_BOT_TOKEN:', config_1.config.discord.token ? 'Present' : 'Missing');
console.log('DISCORD_TOURNAMENT_CHANNEL_ID:', config_1.config.discord.tournamentChannelId ? 'Present' : 'Missing');
console.log('NEXT_PUBLIC_APP_URL:', config_1.config.app.url ? 'Present' : 'Missing');
// Create a new client instance
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
// Function to process a message
async function processMessage(message) {
    if (message.author.bot)
        return;
    // Rankings channel logic
    if (message.channelId === config_1.config.discord.rankingsChannelId) {
        console.log('Processing rankings message:', message.content);
        try {
            const response = await (0, node_fetch_1.default)(`${config_1.config.app.url}/api/webhook/ranking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: message.content,
                    timestamp: message.createdAt.toISOString(),
                    discord_message_id: message.id,
                    discord_channel_id: message.channelId,
                }),
            });
            const result = await response.json();
            console.log('Ranking API response:', result);
        }
        catch (err) {
            console.error('Error sending ranking to API:', err);
        }
        return;
    }
    // Only process messages from the tournament channel
    if (message.channelId === config_1.config.discord.tournamentChannelId) {
        console.log('Processing tournament message:', message.content);
        // Find the first URL in the message
        const url = findFirstUrl(message.content);
        if (!url) {
            console.log('No URL found in message');
            return;
        }
        try {
            // Wait for Discord to generate the embed
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Get the message with embeds
            const messageWithEmbeds = await message.channel.messages.fetch(message.id);
            const embed = messageWithEmbeds.embeds[0];
            // Use embed data if available, otherwise fall back to content
            const title = embed?.title || extractTitle(message.content);
            const description = embed?.description || cleanDescription(message.content);
            console.log('Extracted title:', title);
            console.log('Extracted description:', description);
            // Send to your API
            const apiResponse = await (0, node_fetch_1.default)(`${config_1.config.app.url}/api/webhook/tournament`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: message.content,
                    timestamp: message.createdAt.toISOString(),
                    discord_message_id: message.id,
                    discord_channel_id: message.channelId,
                    title: title,
                    description: description,
                }),
            });
            const data = await apiResponse.json();
            console.log('Tournament saved:', data);
        }
        catch (error) {
            console.error('Error processing tournament:', error);
        }
    }
}
// When the client is ready, run this code (only once)
client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    // --- Existing: Process tournaments channel ---
    const tournamentChannel = await client.channels.fetch(config_1.config.discord.tournamentChannelId);
    if (tournamentChannel && tournamentChannel.isTextBased()) {
        const tournamentMessages = await tournamentChannel.messages.fetch({ limit: 100 });
        tournamentMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        tournamentMessages.forEach(async (message) => {
            await processMessage(message);
        });
    }
    // --- NEW: Process rankings channel ---
    const rankingsChannel = await client.channels.fetch(config_1.config.discord.rankingsChannelId);
    if (rankingsChannel && rankingsChannel.isTextBased()) {
        const rankingsMessages = await rankingsChannel.messages.fetch({ limit: 1 }); // Only the most recent
        rankingsMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp); // Most recent first
        for (const message of rankingsMessages.values()) {
            await processMessage(message);
            break; // Only process the most recent
        }
    }
});
// Listen for new messages
client.on('messageCreate', async (message) => {
    await processMessage(message);
});
// Log in to Discord with your client's token
client.login(config_1.config.discord.token);
