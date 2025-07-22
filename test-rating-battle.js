const WebSocket = require('ws');

// Test rating battle system end-to-end
const testRatingBattle = async () => {
  const wsUrl = 'wss://hawaiissbu-websocket-server.onrender.com';
  
  console.log('Testing rating battle system...');
  console.log('Connecting two players and simulating a match...\n');
  
  return new Promise((resolve, reject) => {
    let player1Connected = false;
    let player2Connected = false;
    let matchCreated = false;
    let matchCompleted = false;
    let ratingUpdated = false;
    
    // Create first player
    const ws1 = new WebSocket(wsUrl);
    
    ws1.on('open', () => {
      console.log('Player 1 connected');
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
        userEmail: 'test1@example.com'
      };
      
      console.log('Player 1 searching for match...');
      ws1.send(JSON.stringify(ratingSearchMessage1));
      
      // Create second player after a short delay
      setTimeout(() => {
        const ws2 = new WebSocket(wsUrl);
        
        ws2.on('open', () => {
          console.log('Player 2 connected');
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
            userEmail: 'test2@example.com'
          };
          
          console.log('Player 2 searching for match...');
          ws2.send(JSON.stringify(ratingSearchMessage2));
        });
        
        ws2.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log('\nPlayer 2 received:', message.type);
            
            if (message.type === 'match') {
              console.log('✅ Match created');
              matchCreated = true;
              
              // Select character
              ws2.send(JSON.stringify({
                type: 'select_character',
                matchId: message.matchId,
                character: 'Mario'
              }));
            } else if (message.type === 'match_complete') {
              console.log('✅ Match completed');
              matchCompleted = true;
            } else if (message.type === 'rating_update') {
              console.log('✅ Rating updated');
              console.log('New rating:', message.newRating);
              console.log('Rating change:', message.ratingChange);
              ratingUpdated = true;
            }
          } catch (error) {
            console.error('Error parsing Player 2 message:', error);
          }
        });
      }, 1000);
    });
    
    ws1.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('\nPlayer 1 received:', message.type);
        
        if (message.type === 'match') {
          console.log('✅ Match created');
          matchCreated = true;
          
          // Select character
          ws1.send(JSON.stringify({
            type: 'select_character',
            matchId: message.matchId,
            character: 'Luigi'
          }));
          
          // Report game result after a delay
          setTimeout(() => {
            console.log('\nReporting game result...');
            ws1.send(JSON.stringify({
              type: 'report_game_result',
              matchId: message.matchId,
              winner: 0 // Player 1 wins
            }));
          }, 5000);
        } else if (message.type === 'match_complete') {
          console.log('✅ Match completed');
          matchCompleted = true;
        } else if (message.type === 'rating_update') {
          console.log('✅ Rating updated');
          console.log('New rating:', message.newRating);
          console.log('Rating change:', message.ratingChange);
          ratingUpdated = true;
        }
      } catch (error) {
        console.error('Error parsing Player 1 message:', error);
      }
    });
    
    // Check results after 20 seconds
    setTimeout(() => {
      console.log('\n=== TEST RESULTS ===');
      console.log('Players connected:', player1Connected && player2Connected ? '✅' : '❌');
      console.log('Match created:', matchCreated ? '✅' : '❌');
      console.log('Match completed:', matchCompleted ? '✅' : '❌');
      console.log('Rating updated:', ratingUpdated ? '✅' : '❌');
      
      if (matchCreated && matchCompleted && ratingUpdated) {
        console.log('\n✅ Rating battle system is working correctly!');
      } else {
        console.log('\n❌ Rating battle system is not fully functional');
        console.log('Missing steps:', {
          matchCreation: !matchCreated,
          matchCompletion: !matchCompleted,
          ratingUpdate: !ratingUpdated
        });
      }
      
      resolve();
    }, 20000);
  });
};

// Run the test
testRatingBattle()
  .then(() => {
    console.log('\nTest completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTest failed:', error);
    process.exit(1);
  }); 