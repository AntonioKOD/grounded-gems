import fetch from 'node-fetch';

async function testProfileAPI() {
  try {
    console.log('🧪 [Test] Starting profile API test...');
    
    // Test the profile API endpoint
    const baseURL = 'http://localhost:3000';
    const profileURL = `${baseURL}/api/mobile/users/profile?includeFullData=true&includePosts=true&postsLimit=20`;
    
    console.log('🧪 [Test] Testing URL:', profileURL);
    
    const response = await fetch(profileURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without authentication, but we can see the response structure
      }
    });
    
    console.log('🧪 [Test] Response status:', response.status);
    console.log('🧪 [Test] Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('🧪 [Test] Response data:', data);
    
    if (response.ok) {
      const jsonData = JSON.parse(data);
      console.log('🧪 [Test] Parsed response:');
      console.log('  - Success:', jsonData.success);
      console.log('  - Message:', jsonData.message);
      console.log('  - Has data:', !!jsonData.data);
      
      if (jsonData.data) {
        console.log('  - User name:', jsonData.data.user?.name);
        console.log('  - Posts count:', jsonData.data.recentPosts?.length || 0);
        console.log('  - User interests:', jsonData.data.user?.interests?.length || 0);
        console.log('  - User social links:', jsonData.data.user?.socialLinks?.length || 0);
        console.log('  - User bio:', jsonData.data.user?.bio);
        console.log('  - User stats:', jsonData.data.user?.stats);
      }
    } else {
      console.log('🧪 [Test] API request failed');
    }
    
    // Test the test-profile endpoint
    console.log('\n🧪 [Test] Testing test-profile endpoint...');
    const testProfileURL = `${baseURL}/api/mobile/test-profile`;
    
    const testResponse = await fetch(testProfileURL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('🧪 [Test] Test profile response status:', testResponse.status);
    
    const testData = await testResponse.text();
    console.log('🧪 [Test] Test profile response data:', testData);
    
    if (testResponse.ok) {
      const testJsonData = JSON.parse(testData);
      console.log('🧪 [Test] Test profile parsed response:');
      console.log('  - Success:', testJsonData.success);
      console.log('  - Message:', testJsonData.message);
      console.log('  - Has data:', !!testJsonData.data);
      
      if (testJsonData.data) {
        console.log('  - User name:', testJsonData.data.user?.name);
        console.log('  - Posts count:', testJsonData.data.recentPosts?.length || 0);
        console.log('  - User interests:', testJsonData.data.user?.interests?.length || 0);
        console.log('  - User social links:', testJsonData.data.user?.socialLinks?.length || 0);
        console.log('  - Debug info:', testJsonData.data.debug);
      }
    }
    
    console.log('✅ [Test] Profile API test completed');
    
  } catch (error) {
    console.error('❌ [Test] Profile API test failed:', error);
    console.error('❌ [Test] Error stack:', error.stack);
  }
}

// Run the test
testProfileAPI(); 