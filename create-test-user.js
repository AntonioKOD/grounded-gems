const fs = require('fs');

async function createTestUser() {
  console.log('👤 Creating test user for mobile API testing...');
  
  try {
    // Create a test user
    const signupResponse = await fetch('http://localhost:3000/api/mobile/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123',
        confirmPassword: 'TestPassword123',
        username: 'testuser',
        termsAccepted: true,
        privacyAccepted: true,
        deviceInfo: {
          deviceId: 'test-device',
          platform: 'ios',
          appVersion: '1.0.0'
        }
      })
    });
    
    console.log('Signup response status:', signupResponse.status);
    const signupResult = await signupResponse.json();
    console.log('Signup result:', signupResult);
    
    if (signupResult.success) {
      console.log('✅ Test user created successfully');
      console.log('User ID:', signupResult.data?.user?.id);
      console.log('Token:', signupResult.data?.token?.substring(0, 30) + '...');
    } else {
      console.log('❌ Failed to create test user:', signupResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
}

createTestUser(); 