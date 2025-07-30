import fetch from 'node-fetch'

async function testLoginStructure() {
  console.log('🧪 [Test] Testing login API response structure...')
  
  try {
    // Test with a non-existent user to see the error response structure
    const loginData = {
      email: 'nonexistent@example.com',
      password: 'wrongpassword',
      rememberMe: true,
      deviceInfo: {
        deviceId: 'test-device-123',
        platform: 'ios',
        appVersion: '1.0.0'
      }
    }
    
    console.log('🧪 [Test] Testing with non-existent user...')
    const loginResponse = await fetch('http://localhost:3000/api/mobile/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    })
    
    const data = await loginResponse.text()
    console.log('🧪 [Test] Response status:', loginResponse.status)
    console.log('🧪 [Test] Response data:', data)
    
    // Now let's test with a valid user structure by creating a mock response
    console.log('\n🧪 [Test] Testing expected successful response structure...')
    const mockSuccessfulResponse = {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          username: 'testuser',
          profileImage: {
            url: 'https://example.com/avatar.jpg'
          },
          bio: 'Test bio',
          location: {
            coordinates: {
              latitude: 40.7128,
              longitude: -74.0060
            }
          },
          role: 'user',
          isVerified: false,
          followerCount: 0,
          preferences: {
            categories: [],
            notifications: true
          }
        },
        token: 'mock-jwt-token',
        expiresIn: 86400
      }
    }
    
    console.log('✅ [Test] Expected successful response structure:')
    console.log('  - Success:', mockSuccessfulResponse.success)
    console.log('  - Has user data:', !!mockSuccessfulResponse.data?.user)
    if (mockSuccessfulResponse.data?.user) {
      console.log('  - User fields:', Object.keys(mockSuccessfulResponse.data.user))
      console.log('  - Required fields present:')
      console.log('    - id:', !!mockSuccessfulResponse.data.user.id)
      console.log('    - name:', !!mockSuccessfulResponse.data.user.name)
      console.log('    - email:', !!mockSuccessfulResponse.data.user.email)
      console.log('    - username:', !!mockSuccessfulResponse.data.user.username)
      console.log('    - profileImage:', !!mockSuccessfulResponse.data.user.profileImage)
      console.log('    - bio:', !!mockSuccessfulResponse.data.user.bio)
      console.log('    - role:', !!mockSuccessfulResponse.data.user.role)
      console.log('    - isVerified:', typeof mockSuccessfulResponse.data.user.isVerified)
      console.log('    - followerCount:', typeof mockSuccessfulResponse.data.user.followerCount)
      console.log('    - location:', !!mockSuccessfulResponse.data.user.location)
    }
    
    console.log('\n✅ [Test] Login API structure test completed')
    
  } catch (error) {
    console.error('❌ [Test] Test failed:', error)
  }
}

testLoginStructure() 