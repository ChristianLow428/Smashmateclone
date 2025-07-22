const WebSocket = require('ws');

// Test WebSocket matchmaking with two players
const testWebSocketMatchmaking = async () => {
  const wsUrl = 'wss://hawaiissbu-websocket-server.onrender.com';
  
  console.log('Testing WebSocket matchmaking with two players...');
  
  return new Promise((resolve, reject) => {
    let player1Connected = false;
    let player2Connected = false;
    let player1MatchFound = false;
    let player2MatchFound = false;
    
    // Create first player
    const ws1 = new WebSocket(wsUrl);
    
    ws1.on('open', () => {
      console.log('✅ Player 1 connected');
      player1Connected = true;
      
      // Send rating search message for player 1
      const ratingSearchMessage1 = {
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
        userEmail: 'player1@test.com'
      };
      
      console.log('Player 1 sending rating search message');
      ws1.send(JSON.stringify(ratingSearchMessage1));
      
      // Create second player after a short delay
      setTimeout(() => {
        const ws2 = new WebSocket(wsUrl);
        
        ws2.on('open', () => {
          console.log('✅ Player 2 connected');
          player2Connected = true;
          
          // Send rating search message for player 2
          const ratingSearchMessage2 = {
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
            userEmail: 'player2@test.com'
          };
          
          console.log('Player 2 sending rating search message');
          ws2.send(JSON.stringify(ratingSearchMessage2));
        });
        
        ws2.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log('📨 Player 2 received:', JSON.stringify(message, null, 2));
            
            if (message.type === 'connected') {
              console.log('✅ Player 2 connected to WebSocket server');
            } else if (message.type === 'match') {
              console.log('✅ Player 2 match found!');
              player2MatchFound = true;
            }
          } catch (error) {
            console.error('Error parsing Player 2 message:', error);
          }
        });
        
        ws2.on('error', (error) => {
          console.error('❌ Player 2 WebSocket error:', error);
        });
        
        ws2.on('close', (code, reason) => {
          console.log(`Player 2 WebSocket connection closed: ${code} - ${reason}`);
        });
        
        // Close player 2 after 15 seconds
        setTimeout(() => {
          ws2.close(1000, 'Test completed');
        }, 15000);
      }, 2000);
    });
    
    ws1.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Player 1 received:', JSON.stringify(message, null, 2));
        
        if (message.type === 'connected') {
          console.log('✅ Player 1 connected to WebSocket server');
        } else if (message.type === 'match') {
          console.log('✅ Player 1 match found!');
          player1MatchFound = true;
        }
      } catch (error) {
        console.error('Error parsing Player 1 message:', error);
      }
    });
    
    ws1.on('error', (error) => {
      console.error('❌ Player 1 WebSocket error:', error);
    });
    
    ws1.on('close', (code, reason) => {
      console.log(`Player 1 WebSocket connection closed: ${code} - ${reason}`);
    });
    
    // Close player 1 after 20 seconds
    setTimeout(() => {
      ws1.close(1000, 'Test completed');
      
      // Check results
      console.log('\n=== TEST RESULTS ===');
      console.log('Player 1 connected:', player1Connected);
      console.log('Player 2 connected:', player2Connected);
      console.log('Player 1 match found:', player1MatchFound);
      console.log('Player 2 match found:', player2MatchFound);
      
      if (player1MatchFound && player2MatchFound) {
        console.log('✅ SUCCESS: Both players found matches!');
      } else {
        console.log('❌ FAILURE: Not all players found matches');
      }
      
      resolve();
    }, 20000);
  });
};

// Run the test
testWebSocketMatchmaking()
  .then(() => {
    console.log('✅ WebSocket matchmaking test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ WebSocket matchmaking test failed:', error);
    process.exit(1);
  }); 