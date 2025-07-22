import { Client, GatewayIntentBits, Message } from 'discord.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { config } from './config';

dotenv.config();

// Define types for API responses
interface ApiResponse {
  success?: boolean;
  error?: string;
  tournament?: {
    id: string;
    title: string;
    description: string;
    tournament_link: string;
    discord_message_id: string;
    discord_channel_id: string;
    created_at: string;
  };
}

// Function to find the first URL in text
function findFirstUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

// Function to find URLs in text (more comprehensive)
function findUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

// Function to clean up the description
function cleanDescription(text: string): string {
  if (!text) return '';
  
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
function extractTitle(description: string): string {
  if (!description) return 'Untitled Tournament';
  
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
console.log('DISCORD_BOT_TOKEN:', config.discord.token ? 'Present' : 'Missing');
console.log('DISCORD_TOURNAMENT_CHANNEL_ID:', config.discord.tournamentChannelId ? 'Present' : 'Missing');
console.log('NEXT_PUBLIC_APP_URL:', config.app.url ? 'Present' : 'Missing');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Function to process a message
async function processMessage(message: Message) {
  if (message.author.bot) return;

  // Rankings channel logic
  if (message.channelId === config.discord.rankingsChannelId) {
    console.log('Processing rankings message:', message.content);
    try {
      const response = await fetch(`${config.app.url}/api/webhook/ranking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message.content,
          timestamp: message.createdAt.toISOString(),
          discord_message_id: message.id,
          discord_channel_id: message.channelId,
        }),
      });
      
      // Check if response is ok
      if (!response.ok) {
        console.error(`Ranking API error: ${response.status} ${response.statusText}`);
        return;
      }
      
      // Check if response has content
      const responseText = await response.text();
      if (!responseText) {
        console.error('Ranking API returned empty response');
        return;
      }
      
      // Try to parse JSON
      try {
        const result = JSON.parse(responseText);
      console.log('Ranking API response:', result);
      } catch (parseError) {
        console.error('Failed to parse ranking API response as JSON:', responseText);
      }
    } catch (err) {
      console.error('Error sending ranking to API:', err);
    }
    return;
  }

  // Only process messages from the tournament channel
  if (message.channelId === config.discord.tournamentChannelId) {
    console.log('Processing tournament message:', message.content);

    // Find URLs in the message content
    let tournamentUrl = findUrls(message.content).find(url => url.includes('start.gg/tournament/'));
    
    // Also check if there are any embeds with URLs
    if (!tournamentUrl && message.embeds.length > 0) {
      for (const embed of message.embeds) {
        if (embed.url && embed.url.includes('start.gg/tournament/')) {
          tournamentUrl = embed.url;
        }
      }
    }
    
    if (!tournamentUrl) {
      console.log('No valid start.gg tournament URL found in message or embeds');
      return;
    }

    try {
      // Wait for Discord to generate the embed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the message with embeds
      const messageWithEmbeds = await message.channel.messages.fetch(message.id);
      const embed = messageWithEmbeds.embeds[0];
      
      // Use embed title if available, but always use the original message content for description
      const title = embed?.title || extractTitle(message.content);
      
      // Always use the original message content as description to preserve URLs and details
      const finalTitle = title || extractTitle(message.content);
      const finalDescription = message.content;

      console.log('Extracted title:', finalTitle);
      console.log('Extracted description:', finalDescription);

      // Send to your API
      const apiResponse = await fetch(`${config.app.url}/api/webhook/tournament`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message.content,
          timestamp: message.createdAt.toISOString(),
          discord_message_id: message.id,
          discord_channel_id: message.channelId,
          title: finalTitle,
          description: finalDescription,
        }),
      });

      // Check if response is ok
      if (!apiResponse.ok) {
        console.error(`Tournament API error: ${apiResponse.status} ${apiResponse.statusText}`);
        return;
      }
      
      // Check if response has content
      const responseText = await apiResponse.text();
      if (!responseText) {
        console.error('Tournament API returned empty response');
        return;
      }
      
      // Try to parse JSON
      try {
        const data = JSON.parse(responseText);
      console.log('Tournament saved:', data);
      } catch (parseError) {
        console.error('Failed to parse tournament API response as JSON:', responseText);
      }
    } catch (error) {
      console.error('Error processing tournament:', error);
    }
  }
}

// Function to handle message deletion
async function handleMessageDelete(messageId: string, channelId: string) {
  console.log(`Message deleted: ${messageId} from channel: ${channelId}`);
  
  // Only handle tournament channel deletions
  if (channelId === config.discord.tournamentChannelId) {
    try {
      // Call the DELETE endpoint to remove the tournament
      const response = await fetch(`${config.app.url}/api/webhook/tournament?messageId=${messageId}`, {
        method: 'DELETE',
      });
      
      // Check if response is ok
      if (!response.ok) {
        console.error(`Tournament deletion API error: ${response.status} ${response.statusText}`);
        return;
      }
      
      // Check if response has content
      const responseText = await response.text();
      if (!responseText) {
        console.error('Tournament deletion API returned empty response');
        return;
      }
      
      // Try to parse JSON
      try {
        const result = JSON.parse(responseText);
        if (result.success) {
        console.log(`Tournament deleted from database: ${messageId}`);
      } else {
          console.error(`Failed to delete tournament: ${messageId}`, result.error);
        }
      } catch (parseError) {
        console.error('Failed to parse tournament deletion API response as JSON:', responseText);
      }
    } catch (error) {
      console.error('Error deleting tournament:', error);
    }
  }
}

// Function to sync tournaments with Discord
async function syncTournaments() {
  console.log('Syncing tournaments with Discord...');
  
  const tournamentChannel = await client.channels.fetch(config.discord.tournamentChannelId);
  if (tournamentChannel && tournamentChannel.isTextBased()) {
    const tournamentMessages = await tournamentChannel.messages.fetch({ limit: 100 });
    
    // Include message IDs that contain valid tournament URLs
    const validTournamentMessageIds: string[] = [];
    
    for (const [messageId, message] of tournamentMessages) {
      // Check if message content has valid tournament URL
      const urls = findUrls(message.content);
      const hasValidUrl = urls.some(url => url.includes('start.gg/tournament/'));
      
      // Also check embeds
      const hasValidEmbed = message.embeds.some(embed => 
        embed.url && embed.url.includes('start.gg/tournament/')
      );
      
      if (hasValidUrl || hasValidEmbed) {
        validTournamentMessageIds.push(messageId);
      }
    }
    
    console.log(`Found ${validTournamentMessageIds.length} valid tournament messages out of ${tournamentMessages.size} total messages`);
    
    // Call the cleanup endpoint to remove tournaments that no longer exist in Discord
    try {
      const response = await fetch(`${config.app.url}/api/webhook/tournament?messageIds=${validTournamentMessageIds.join(',')}`, {
        method: 'DELETE',
      });
      
      // Check if response is ok
      if (!response.ok) {
        console.error(`Tournament sync API error: ${response.status} ${response.statusText}`);
        return;
      }
      
      // Check if response has content
      const responseText = await response.text();
      if (!responseText) {
        console.error('Tournament sync API returned empty response');
        return;
      }
      
      // Try to parse JSON
      try {
        const result = JSON.parse(responseText);
        if (result.success) {
        console.log('Tournament sync completed');
      } else {
          console.error('Tournament sync failed:', result.error);
        }
      } catch (parseError) {
        console.error('Failed to parse tournament sync API response as JSON:', responseText);
      }
    } catch (error) {
      console.error('Error syncing tournaments:', error);
    }
  }
}

// When the client is ready, run this code (only once)
client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);

  // --- Process tournaments channel ---
  const tournamentChannel = await client.channels.fetch(config.discord.tournamentChannelId);
  if (tournamentChannel && tournamentChannel.isTextBased()) {
    const tournamentMessages = await tournamentChannel.messages.fetch({ limit: 100 });
    
    console.log(`Processing ${tournamentMessages.size} messages from tournament channel`);
    
    tournamentMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    tournamentMessages.forEach(async (message) => {
      await processMessage(message);
    });
  }

  // --- NEW: Process rankings channel ---
  const rankingsChannel = await client.channels.fetch(config.discord.rankingsChannelId);
  if (rankingsChannel && rankingsChannel.isTextBased()) {
    const rankingsMessages = await rankingsChannel.messages.fetch({ limit: 1 }); // Only the most recent
    rankingsMessages.sort((a, b) => b.createdTimestamp - a.createdTimestamp); // Most recent first
    for (const message of rankingsMessages.values()) {
      await processMessage(message);
      break; // Only process the most recent
    }
  }

  // Initial sync to clean up any orphaned tournaments
  await syncTournaments(); // Clean up old tournaments on startup
});

// Listen for new messages
client.on('messageCreate', async (message: Message) => {
  await processMessage(message);
});

// Listen for message deletions
client.on('messageDelete', async (message) => {
  await handleMessageDelete(message.id, message.channelId);
});

// Listen for bulk message deletions
client.on('messageDeleteBulk', async (messages) => {
  for (const [messageId, message] of messages) {
    await handleMessageDelete(messageId, message.channelId);
  }
});

// Log in to Discord with your client's token
client.login(config.discord.token);