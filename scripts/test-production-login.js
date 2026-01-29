/**
 * Test the production login endpoint
 */

const testLogin = async () => {
  const url = 'https://reverse-turing-aljm.vercel.app/api/auth/callback/credentials';
  
  console.log('Testing Production Login');
  console.log('========================\n');
  console.log('URL:', url);
  console.log('Credentials: ray@gmail.com / ray\n');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'ray@gmail.com',
        password: 'ray',
        callbackUrl: 'https://reverse-turing-aljm.vercel.app',
        json: 'true'
      }),
      redirect: 'manual'
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Status Text:', response.statusText);
    
    const location = response.headers.get('location');
    if (location) {
      console.log('Redirect Location:', location);
    }
    
    // Try to read response body
    const text = await response.text();
    console.log('\nResponse Body:');
    if (text) {
      try {
        const json = JSON.parse(text);
        console.log(JSON.stringify(json, null, 2));
      } catch {
        console.log(text.substring(0, 500));
      }
    } else {
      console.log('(empty)');
    }
    
    // Check if successful
    if (response.status === 302 || response.status === 200) {
      console.log('\n✅ Login appears to be working!');
    } else {
      console.log('\n❌ Login may have failed');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
};

testLogin();
