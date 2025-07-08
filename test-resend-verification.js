// Simple test script to verify resend verification functionality
const testResendVerification = async () => {
  console.log('Testing resend verification functionality...')
  
  try {
    // Test 1: Missing email
    console.log('\n1. Testing missing email...')
    const response1 = await fetch('http://localhost:3000/api/resend-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const data1 = await response1.json()
    console.log('Response:', data1)
    console.log('Status:', response1.status)
    
    // Test 2: Invalid email
    console.log('\n2. Testing invalid email...')
    const response2 = await fetch('http://localhost:3000/api/resend-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email' })
    })
    const data2 = await response2.json()
    console.log('Response:', data2)
    console.log('Status:', response2.status)
    
    // Test 3: Non-existent user
    console.log('\n3. Testing non-existent user...')
    const response3 = await fetch('http://localhost:3000/api/resend-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@example.com' })
    })
    const data3 = await response3.json()
    console.log('Response:', data3)
    console.log('Status:', response3.status)
    
    console.log('\n✅ Test completed! Check the responses above.')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testResendVerification() 