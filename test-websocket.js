const WebSocket = require('ws');

// Test WebSocket connection and rating search
const testWebSocket = async () => {
  const wsUrl = 'wss://hawaiissbu-websocket-server.onrender.com';
  
  console.log('Testing WebSocket connection to:', wsUrl);
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log('✅ WebSocket connection opened');
      
      // Send a rating search message
      const ratingSearchMessage = {
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
      
      console.log('Sending rating search message:', JSON.stringify(ratingSearchMessage, null, 2));
      ws.send(JSON.stringify(ratingSearchMessage));
      
      // Set a timeout to close the connection
      setTimeout(() => {
        console.log('Closing WebSocket connection after 10 seconds');
        ws.close(1000, 'Test completed');
      }, 10000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Received message:', JSON.stringify(message, null, 2));
        
        if (message.type === 'connected') {
          console.log('✅ Connected to WebSocket server');
        } else if (message.type === 'match') {
          console.log('✅ Match found!');
        } else if (message.type === 'error') {
          console.log('❌ Error received:', message.error);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
        console.log('Raw message:', data.toString());
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      reject(error);
    });
    
    ws.on('close', (code, reason) => {
      console.log(`WebSocket connection closed: ${code} - ${reason}`);
      resolve();
    });
  });
};

// Run the test
testWebSocket()
  .then(() => {
    console.log('✅ WebSocket test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ WebSocket test failed:', error);
    process.exit(1);
  }); 