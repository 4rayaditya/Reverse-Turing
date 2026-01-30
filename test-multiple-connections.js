// Test multiple socket connections to verify alternating issue is fixed
const io = require('socket.io-client');

const SOCKET_URL = 'https://reverse-turing-1.onrender.com';

console.log('🔍 Testing multiple socket connections to verify alternating issue is fixed...\n');

let connectionCount = 0;
const maxConnections = 5;
let successfulConnections = 0;
let failedConnections = 0;

function createConnection(connectionNumber) {
  console.log(`\n📡 Creating connection #${connectionNumber}...`);

  const socket = io(SOCKET_URL, {
    transports: ['polling', 'websocket'],
    timeout: 10000,
    auth: {
      token: '' // Guest mode for testing
    }
  });

  socket.on('connect', () => {
    console.log(`✅ Connection #${connectionNumber} successful (Socket ID: ${socket.id})`);
    successfulConnections++;

    // Keep connection alive briefly then disconnect
    setTimeout(() => {
      socket.disconnect();
    }, 2000);
  });

  socket.on('connect_error', (error) => {
    console.log(`❌ Connection #${connectionNumber} failed: ${error.message}`);
    failedConnections++;
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Connection #${connectionNumber} disconnected`);
    connectionCount++;

    if (connectionCount < maxConnections) {
      // Create next connection after a short delay
      setTimeout(() => createConnection(connectionCount + 1), 1000);
    } else {
      // All connections attempted
      console.log('\n📊 TEST RESULTS:');
      console.log(`   ✅ Successful: ${successfulConnections}`);
      console.log(`   ❌ Failed: ${failedConnections}`);
      console.log(`   📈 Success Rate: ${((successfulConnections / maxConnections) * 100).toFixed(1)}%`);

      if (failedConnections === 0) {
        console.log('\n🎉 SUCCESS! No alternating connection issues detected.');
        console.log('The Prisma reconnection bug fix appears to be working.');
      } else if (failedConnections < successfulConnections) {
        console.log('\n⚠️ PARTIAL SUCCESS: Some connections failed but not alternating.');
        console.log('Check Render logs for any remaining issues.');
      } else {
        console.log('\n❌ ISSUE PERSISTS: High failure rate detected.');
        console.log('The alternating connection issue may still exist.');
      }

      process.exit(failedConnections > 0 ? 1 : 0);
    }
  });
}

// Start the test
createConnection(1);

// Timeout after 60 seconds
setTimeout(() => {
  console.log('\n⏰ Test timed out after 60 seconds');
  console.log('This may indicate server responsiveness issues.');
  process.exit(1);
}, 60000);</content>
<parameter name="filePath">d:\Round 3 - reverse turing\SOCKET-CONNECTION-ANALYSIS.md