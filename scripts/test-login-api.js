import fetch from 'node-fetch';

async function testLoginAPI() {
  try {
    console.log('🧪 [Test] Starting login API test...');

    const baseURL = 'http://localhost:3000';
    const loginURL = `${baseURL}/api/mobile/auth/login`;

    console.log('🧪 [Test] Testing URL:', loginURL);

    // Test with a sample login request
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true,
      deviceInfo: {
        deviceId: 'test-device-123',
        platform: 'ios',
        appVersion: '1.0.0'
      }
    };

    console.log('🧪 [Test] Login request data:', loginData);

    const response = await fetch(loginURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
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
        console.log('  - User email:', jsonData.data.user?.email);
        console.log('  - Profile image:', jsonData.data.user?.profileImage);
        console.log('  - Token length:', jsonData.data.token?.length || 0);
        console.log('  - Expires in:', jsonData.data.expiresIn);
      }
    } else {
      console.log('🧪 [Test] API request failed');
      if (data) {
        try {
          const errorData = JSON.parse(data);
          console.log('  - Error message:', errorData.message);
          console.log('  - Error code:', errorData.code);
          console.log('  - Error type:', errorData.errorType);
        } catch (e) {
          console.log('  - Raw error response:', data);
        }
      }
    }

    console.log('✅ [Test] Login API test completed');

  } catch (error) {
    console.error('❌ [Test] Login API test failed:', error);
    console.error('❌ [Test] Error stack:', error.stack);
  }
}

testLoginAPI(); 