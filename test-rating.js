async function testRatingAPI() {
  try {
    console.log('Testing rating API...');
    
    const response = await fetch('http://localhost:3000/api/matchmaking/process-rating-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player1Id: 'test1@example.com',
        player2Id: 'test2@example.com',
        matchId: 'test-match-123',
        winner: 0 // Player 1 wins
      })
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response:', result);
    
  } catch (error) {
    console.error('Error testing rating API:', error);
  }
}

testRatingAPI(); 