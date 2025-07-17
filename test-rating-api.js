async function testRatingAPI() {
  try {
    console.log('Testing rating API...');
    
    const response = await fetch('http://localhost:3000/api/test-rating', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player1Id: 'christian@purplemaia.org',
        player2Id: 'komekkotime@gmail.com',
        matchId: 'test-match-123',
        winner: 0
      })
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Success:', result);
    } else {
      const error = await response.text();
      console.error('Error:', error);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testRatingAPI(); 