const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testBookmarkFunctionality() {
  console.log('🧪 Testing bookmark functionality...');
  
  try {
    // Test map page access
    const mapResponse = await fetch(`${BASE_URL}/map`, {
      method: 'GET',
      redirect: 'manual',
    });
    
    console.log(`📍 Map page response: ${mapResponse.status}`);
    
    if (mapResponse.status === 307 || mapResponse.status === 302) {
      const location = mapResponse.headers.get('location');
      console.log(`🔄 Redirected to: ${location}`);
      
      if (location === '/login') {
        console.log('✅ Authentication required - this is expected behavior');
        console.log('💡 To test bookmark functionality, you need to:');
        console.log('   1. Visit http://localhost:3000/login');
        console.log('   2. Log in with your credentials');
        console.log('   3. Go to the map page');
        console.log('   4. Try clicking the heart button on any location');
        console.log('   5. Check the browser console and server logs for debug output');
      }
    } else if (mapResponse.status === 200) {
      console.log('✅ Map page accessible without authentication');
    } else {
      console.log(`❌ Unexpected response: ${mapResponse.status}`);
    }
    
    // Test server is responding
    const healthResponse = await fetch(`${BASE_URL}/api`, {
      method: 'HEAD',
    });
    
    console.log(`🔧 API server response: ${healthResponse.status}`);
    
  } catch (error) {
    console.error('❌ Error testing bookmark functionality:', error.message);
    console.log('💡 Make sure the development server is running with: npm run dev');
  }
}

testBookmarkFunctionality(); 