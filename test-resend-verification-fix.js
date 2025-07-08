// Test script to verify the resend verification fix
const testResendVerificationFix = async () => {
  console.log('Testing resend verification fix...')
  
  try {
    // Test with a valid email that might not have a verification token
    console.log('\n1. Testing resend verification with email that might not have token...')
    const response = await fetch('http://localhost:3000/api/resend-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' })
    })
    
    const data = await response.json()
    console.log('Response:', data)
    console.log('Status:', response.status)
    
    if (response.ok) {
      console.log('✅ Resend verification worked!')
    } else if (response.status === 404) {
      console.log('✅ Correctly returned 404 for non-existent user')
    } else if (response.status === 200 && data.message === 'Email is already verified') {
      console.log('✅ Correctly detected already verified email')
    } else {
      console.log('❌ Unexpected response')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testResendVerificationFix() 