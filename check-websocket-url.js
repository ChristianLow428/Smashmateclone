// This script simulates what the frontend would do to determine the WebSocket URL
console.log('=== Checking WebSocket URL Configuration ===')

// Simulate the same logic as the frontend services
const isDevelopment = process.env.NODE_ENV === 'development'
const websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'wss://hawaiissbu-websocket-server.onrender.com'

console.log('Environment variables:')
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set')
console.log('- NEXT_PUBLIC_WEBSOCKET_URL:', process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'not set')

console.log('\nWebSocket URL logic:')
console.log('- isDevelopment:', isDevelopment)
console.log('- Final WebSocket URL:', websocketUrl)

console.log('\nExpected behavior:')
if (isDevelopment) {
  console.log('- Development: Would connect to ws://localhost:3001')
} else {
  console.log('- Production: Would connect to', websocketUrl)
}

console.log('\nTo check what URL is actually being used in production:')
console.log('1. Open your browser console on https://hawaiissbu.onrender.com/free-battle')
console.log('2. Look for WebSocket connection attempts')
console.log('3. Check if there are any environment variables set in Render dashboard') 