import fetch from 'node-fetch'

async function testLoginWithRealUser() {
  console.log('🧪 [Test] Starting login API test with real user...')
  
  try {
    // First, get a real user from the test profile endpoint
    console.log('🧪 [Test] Getting real user from test profile...')
    const profileResponse = await fetch('http://localhost:3000/api/mobile/test-profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!profileResponse.ok) {
      console.log('❌ [Test] Failed to get test profile:', profileResponse.status)
      const errorData = await profileResponse.text()
      console.log('❌ [Test] Error data:', errorData)
      return
    }
    
    const profileData = await profileResponse.json()
    console.log('✅ [Test] Got profile data:', {
      success: profileData.success,
      hasUser: !!profileData.data?.user,
      userEmail: profileData.data?.user?.email
    })
    
    if (!profileData.data?.user?.email) {
      console.log('❌ [Test] No user email found in profile data')
      return
    }
    
    const userEmail = profileData.data.user.email
    console.log('🧪 [Test] Using email:', userEmail)
    
    // Now test login with this email (we'll use a test password)
    const loginData = {
      email: userEmail,
      password: 'password123', // This might not work, but let's test the API structure
      rememberMe: true,
      deviceInfo: {
        deviceId: 'test-device-123',
        platform: 'ios',
        appVersion: '1.0.0'
      }
    }
    
    console.log('🧪 [Test] Testing login with real user email...')
    const loginResponse = await fetch('http://localhost:3000/api/mobile/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    })
    
    const data = await loginResponse.text()
    console.log('🧪 [Test] Response status:', loginResponse.status)
    console.log('🧪 [Test] Response headers:', Object.fromEntries(loginResponse.headers.entries()))
    console.log('🧪 [Test] Response data:', data)
    
    if (loginResponse.ok) {
      const jsonData = JSON.parse(data)
      console.log('✅ [Test] Login successful!')
      console.log('  - Success:', jsonData.success)
      console.log('  - Message:', jsonData.message)
      console.log('  - Has user data:', !!jsonData.data?.user)
      if (jsonData.data?.user) {
        console.log('  - User fields:', Object.keys(jsonData.data.user))
        console.log('  - User name:', jsonData.data.user.name)
        console.log('  - User email:', jsonData.data.user.email)
        console.log('  - User isVerified:', jsonData.data.user.isVerified)
        console.log('  - User followerCount:', jsonData.data.user.followerCount)
        console.log('  - User bio:', jsonData.data.user.bio)
        console.log('  - User username:', jsonData.data.user.username)
        console.log('  - User profileImage:', jsonData.data.user.profileImage)
        console.log('  - Token length:', jsonData.data.token?.length || 0)
      }
    } else {
      console.log('❌ [Test] Login failed')
      if (data) {
        try {
          const errorData = JSON.parse(data)
          console.log('  - Error message:', errorData.message)
          console.log('  - Error code:', errorData.code)
          console.log('  - Error type:', errorData.errorType)
        } catch (e) {
          console.log('  - Raw error response:', data)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ [Test] Test failed:', error)
  }
}

testLoginWithRealUser() 