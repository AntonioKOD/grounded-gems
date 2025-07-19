const fs = require('fs');

async function createTestUserDirect() {
  console.log('👤 Creating test user directly in database...');
  
  try {
    // Create a test user directly using the web signup API
    const signupResponse = await fetch('http://localhost:3000/api/users/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'TestPassword123',
        coords: {
          latitude: 40.7128,
          longitude: -74.0060
        },
        preferences: {
          categories: ['restaurants', 'entertainment'],
          radius: 10,
          notifications: true
        }
      })
    });
    
    console.log('Signup response status:', signupResponse.status);
    const signupResult = await signupResponse.json();
    console.log('Signup result:', signupResult);
    
    if (signupResult.success) {
      console.log('✅ Test user created successfully');
      console.log('User ID:', signupResult.user?.id);
    } else {
      console.log('❌ Failed to create test user:', signupResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
}

createTestUserDirect(); 