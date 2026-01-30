// Test socket connection locally
const io = require('socket.io-client');

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://reverse-turing-1.onrender.com';

console.log(`\n🔌 Testing socket connection to: ${SOCKET_URL}\n`);

const socket = io(SOCKET_URL, {
  transports: ['polling', 'websocket'],
  timeout: 10000,
  auth: {
    token: '' // Empty for guest mode
  }
});

socket.on('connect', () => {
  console.log('✅ Connected successfully!');
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Transport: ${socket.io.engine.transport.name}`);
  console.log('\n✅ Socket server is working!\n');
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection failed:', error.message);
  console.error('\n📋 Diagnostic Info:');
  console.error(`   URL: ${SOCKET_URL}`);
  console.error(`   Error type: ${error.type || 'unknown'}`);
  console.error(`   Error code: ${error.code || 'N/A'}`);
  console.error('\n🔍 Possible causes:');
  
  if (error.message.includes('Authentication')) {
    console.error('  ❗ Auth middleware is blocking (server code not updated yet)');
    console.error('     → Wait for Render auto-deploy to complete');
    console.error('     → Or manually deploy latest commit on Render');
  } else if (error.message.includes('CORS') || error.message.includes('origin')) {
    console.error('  ❗ CORS/origin mismatch');
    console.error('     → Update ALLOWED_ORIGINS on Render dashboard');
  } else if (error.message.includes('timeout')) {
    console.error('  ❗ Server not responding');
    console.error('     → Check if Render service is running');
    console.error('     → Check Render logs for errors');
  } else {
    console.error('  1. Socket server not running on Render');
    console.error('  2. CORS/origin mismatch (check ALLOWED_ORIGINS on Render)');
    console.error('  3. Auth middleware blocking connection');
    console.error('  4. Network/firewall issue');
  }
  console.error('\n💡 Next steps:');
  console.error('  1. Go to https://dashboard.render.com');
  console.error('  2. Check "Events" tab for deploy status');
  console.error('  3. Update ALLOWED_ORIGINS in Environment tab');
  console.error('  4. Check "Logs" tab for server errors\n');
  process.exit(1);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error.message);
});

setTimeout(() => {
  console.error('❌ Connection timeout after 10 seconds');
  process.exit(1);
}, 10000);
