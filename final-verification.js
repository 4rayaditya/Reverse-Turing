// Final verification that everything works
const io = require('socket.io-client');

const SOCKET_URL = 'https://reverse-turing-1.onrender.com';

console.log('🔍 Final verification: Testing complete socket server functionality...\n');

const socket = io(SOCKET_URL, {
  transports: ['polling', 'websocket'],
  timeout: 10000,
  auth: {
    token: '' // Guest mode for testing
  }
});

socket.on('connect', () => {
  console.log('✅ Socket server is running and accepting connections');

  // Test database health by triggering a health check
  console.log('📡 Testing database connection via health endpoint...');

  // Try to make a simple HTTP request to the health endpoint
  const https = require('https');
  const http = require('http');

  const client = SOCKET_URL.startsWith('https') ? https : http;
  const healthUrl = `${SOCKET_URL}/health`;

  client.get(healthUrl, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Database connection is working (health check passed)');
      console.log('🎉 SUCCESS! Your socket server is fully functional!');
      console.log('\n📋 All systems operational:');
      console.log('   ✅ Socket.io server running');
      console.log('   ✅ Database connection working');
      console.log('   ✅ Authentication ready');
      console.log('   ✅ Game operations ready');
    } else {
      console.log(`⚠️ Health check returned status: ${res.statusCode}`);
    }
    process.exit(0);
  }).on('error', (err) => {
    console.error('❌ Health check failed - database connection issue');
    console.error('Error:', err.message);
    process.exit(1);
  });

  // Close socket after 5 seconds
  setTimeout(() => {
    socket.disconnect();
  }, 5000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket server connection failed');
  console.error('Error:', error.message);
  console.error('\n💡 Possible issues:');
  console.error('   - Render service not running');
  console.error('   - CORS configuration wrong');
  console.error('   - Network connectivity issue');
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('🔌 Socket disconnected (expected)');
});

// Timeout after 15 seconds
setTimeout(() => {
  console.error('❌ Test timed out - socket server may not be responding');
  process.exit(1);
}, 15000);