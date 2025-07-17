const WebSocket = require('ws')

async function testWebSocketServer() {
  console.log('=== Testing WebSocket Server Connection ===')
  
  const wsUrl = 'wss://hawaiissbu-websocket-server.onrender.com'
  console.log('Attempting to connect to:', wsUrl)
  
  try {
    const ws = new WebSocket(wsUrl)
    
    ws.on('open', () => {
      console.log('✅ WebSocket server is running and accessible!')
      ws.close()
    })
    
    ws.on('error', (error) => {
      console.log('❌ WebSocket server connection failed:', error.message)
      console.log('This means the WebSocket server is not deployed or not running.')
    })
    
    ws.on('close', () => {
      console.log('Connection closed')
    })
    
    // Timeout after 10 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.log('❌ Connection timeout - WebSocket server is not responding')
        ws.close()
      }
    }, 10000)
    
  } catch (error) {
    console.log('❌ Error creating WebSocket connection:', error.message)
  }
}

testWebSocketServer() 