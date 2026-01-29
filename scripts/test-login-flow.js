/**
 * Test production login with proper NextAuth flow
 */

const testLoginFlow = async () => {
  console.log('Testing Production NextAuth Flow');
  console.log('=================================\n');
  
  try {
    // Step 1: Get CSRF token
    console.log('1. Getting CSRF token...');
    const csrfResponse = await fetch('https://reverse-turing-aljm.vercel.app/api/auth/csrf');
    const csrfData = await csrfResponse.json();
    console.log('   CSRF Token:', csrfData.csrfToken ? 'Received ✅' : 'Missing ❌');
    
    if (!csrfData.csrfToken) {
      console.log('\n❌ Failed to get CSRF token');
      return;
    }
    
    // Step 2: Attempt signin
    console.log('\n2. Attempting signin with credentials...');
    const signinResponse = await fetch('https://reverse-turing-aljm.vercel.app/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'ray@gmail.com',
        password: 'ray',
        csrfToken: csrfData.csrfToken,
        callbackUrl: 'https://reverse-turing-aljm.vercel.app/game/lobby',
        json: 'true'
      }),
      redirect: 'manual'
    });
    
    console.log('   Response Status:', signinResponse.status);
    
    const location = signinResponse.headers.get('location');
    if (location) {
      console.log('   Redirect:', location);
      
      // Check for error parameter
      if (location.includes('error=')) {
        console.log('\n❌ Login FAILED - Error in redirect URL');
        console.log('   This means credentials were rejected');
      } else if (location.includes('/game/lobby')) {
        console.log('\n✅ Login SUCCESS! Redirecting to lobby');
      } else {
        console.log('\n⚠️  Unexpected redirect');
      }
    }
    
    // Try to get response body
    const text = await signinResponse.text();
    if (text) {
      try {
        const json = JSON.parse(text);
        console.log('\nResponse Data:', JSON.stringify(json, null, 2));
        
        if (json.url && json.url.includes('error=')) {
          console.log('\n❌ LOGIN FAILED - Invalid credentials');
        } else if (json.url && json.url.includes('/game/lobby')) {
          console.log('\n✅ LOGIN SUCCESS!');
        }
      } catch {
        // Not JSON
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
};

testLoginFlow();
