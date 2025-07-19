// Test script to debug authentication issues

const BASE_URL = 'http://localhost:3000';

async function testAuthDebug() {
    console.log('🔍 Testing Authentication Debug...\n');
    
    try {
        // Step 1: Login to get authentication token
        console.log('🔐 Step 1: Logging in...');
        const loginResponse = await fetch(`${BASE_URL}/api/mobile/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'antonio_kodheli@icloud.com',
                password: 'Antoniokodheli78!'
            })
        });
        
        const loginData = await loginResponse.json();
        
        if (!loginData.success || !loginData.data?.token) {
            console.log('❌ Login failed:', loginData.error || loginData.message);
            return;
        }
        
        const token = loginData.data.token;
        console.log('✅ Login successful');
        console.log('Token:', token.substring(0, 20) + '...');
        
        // Step 2: Test the mobile users/me endpoint
        console.log('\n🔐 Step 2: Testing mobile users/me endpoint...');
        const meResponse = await fetch(`${BASE_URL}/api/mobile/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Response status:', meResponse.status);
        const meData = await meResponse.json();
        console.log('Response data:', JSON.stringify(meData, null, 2));
        
        if (meData.success) {
            console.log('✅ Mobile users/me successful');
        } else {
            console.log('❌ Mobile users/me failed:', meData.error || meData.message);
        }
        
        // Step 3: Test the regular users/me endpoint for comparison
        console.log('\n🔐 Step 3: Testing regular users/me endpoint...');
        const regularMeResponse = await fetch(`${BASE_URL}/api/users/me`, {
            headers: {
                'Cookie': `payload-token=${token}`
            }
        });
        
        console.log('Response status:', regularMeResponse.status);
        const regularMeData = await regularMeResponse.json();
        console.log('Response data:', JSON.stringify(regularMeData, null, 2));
        
        if (regularMeData.user) {
            console.log('✅ Regular users/me successful');
        } else {
            console.log('❌ Regular users/me failed');
        }
        
        // Step 4: Test mobile events POST with detailed logging
        console.log('\n📝 Step 4: Testing mobile events POST...');
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        
        const createEventResponse = await fetch(`${BASE_URL}/api/mobile/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Auth Debug Test Event',
                description: 'Testing authentication in mobile events API',
                startDate: futureDate.toISOString(),
                location: 'Debug Location',
                category: 'social',
                eventType: 'meetup',
                maxParticipants: 10
            })
        });
        
        console.log('Response status:', createEventResponse.status);
        const createEventData = await createEventResponse.json();
        console.log('Response data:', JSON.stringify(createEventData, null, 2));
        
        if (createEventData.success) {
            console.log('✅ Mobile events POST successful');
        } else {
            console.log('❌ Mobile events POST failed:', createEventData.error || createEventData.message);
        }
        
        console.log('\n🎉 Auth Debug test completed!');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Run the test
testAuthDebug(); 