require('dotenv').config({ path: '.env.local' })

async function testRatingAPI() {
  console.log('=== Testing Rating Processing API ===')
  
  const testData = {
    player1Id: 'test-player-1@example.com',
    player2Id: 'test-player-2@example.com',
    matchId: 'test-match-123',
    winner: 0 // Player 1 wins
  }
  
  const apiUrl = 'https://hawaiissbu.onrender.com/api/matchmaking/process-rating-result'
  
  console.log('Testing API URL:', apiUrl)
  console.log('Test data:', testData)
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ API call successful:', result)
    } else {
      const errorText = await response.text()
      console.log('❌ API call failed:', errorText)
    }
  } catch (error) {
    console.error('❌ Error calling API:', error)
  }
}

testRatingAPI().catch(console.error) 