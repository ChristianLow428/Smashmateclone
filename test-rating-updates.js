const WebSocket = require('ws');

// Test WebSocket connection to verify rating updates
async function testRatingUpdates() {
  console.log('Testing rating updates...');
  
  const ws = new WebSocket('wss://hawaiissbu-websocket.onrender.com');
  
  ws.on('open', () => {
    console.log('Connected to WebSocket server');
    
    // Send a test rating search to trigger the flow
    const testMessage = {
      type: 'rating_search',
      preferences: {
        island: 'Oahu',
        connection: 'wired',
        rules: {
          stock: 3,
          time: 7,
          items: false,
          stageHazards: false
        }
      },
      userEmail: 'test@example.com'
    };
    
    console.log('Sending test rating search:', testMessage);
    ws.send(JSON.stringify(testMessage));
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', message);
      
      if (message.type === 'rating_update') {
        console.log('✅ Rating update received!');
        console.log('Player ID:', message.playerId);
        console.log('New Rating:', message.newRating);
        console.log('Rating Change:', message.ratingChange);
      } else if (message.type === 'match_result_processed') {
        console.log('✅ Match result processed received!');
        console.log('Player 1 ID:', message.player1Id);
        console.log('Player 2 ID:', message.player2Id);
        console.log('Player 1 New Rating:', message.player1NewRating);
        console.log('Player 2 New Rating:', message.player2NewRating);
        console.log('Player 1 Rating Change:', message.player1RatingChange);
        console.log('Player 2 Rating Change:', message.player2RatingChange);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  ws.on('close', (code, reason) => {
    console.log('WebSocket closed:', code, reason);
  });
  
  // Close after 10 seconds
  setTimeout(() => {
    console.log('Closing test connection...');
    ws.close();
  }, 10000);
}

testRatingUpdates().catch(console.error); 