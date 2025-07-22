const WebSocket = require('ws');

// Test WebSocket server environment variables
const testWebSocketEnv = async () => {
  const wsUrl = 'wss://hawaiissbu-websocket-server.onrender.com';
  
  console.log('Testing WebSocket server environment variables...');
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', () => {
      console.log('✅ Connected to WebSocket server');
      
      // Send a test match result to trigger rating processing
      const testMessage = {
        type: 'test_env',
        message: 'Check environment variables'
      };
      
      console.log('Sending test message:', JSON.stringify(testMessage, null, 2));
      ws.send(JSON.stringify(testMessage));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Received message:', JSON.stringify(message, null, 2));
        
        if (message.type === 'env_status') {
          console.log('Environment status:', message.status);
          if (message.error) {
            console.error('Environment error:', message.error);
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      reject(error);
    });
    
    // Close after 10 seconds
    setTimeout(() => {
      ws.close(1000, 'Test completed');
      resolve();
    }, 10000);
  });
};

// Run the test
testWebSocketEnv()
  .then(() => {
    console.log('✅ WebSocket environment test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ WebSocket environment test failed:', error);
    process.exit(1);
  }); 