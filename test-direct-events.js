// Direct test of mobile events API

const BASE_URL = 'http://localhost:3000';

async function testDirectEvents() {
    console.log('🎯 Testing Direct Mobile Events API...\n');
    
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
        
        // Step 2: Test mobile events GET (which should work)
        console.log('\n📋 Step 2: Testing mobile events GET...');
        const eventsResponse = await fetch(`${BASE_URL}/api/mobile/events?type=all&limit=1`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Events GET status:', eventsResponse.status);
        const eventsData = await eventsResponse.json();
        console.log('Events GET response:', JSON.stringify(eventsData, null, 2));
        
        // Step 3: Test mobile events POST with detailed headers
        console.log('\n📝 Step 3: Testing mobile events POST with detailed headers...');
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        
        console.log('Request headers:', headers);
        
        const createEventResponse = await fetch(`${BASE_URL}/api/mobile/events`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                title: 'Direct Test Event',
                description: 'Testing direct mobile events API call',
                startDate: futureDate.toISOString(),
                location: 'Direct Test Location',
                category: 'social',
                eventType: 'meetup',
                maxParticipants: 10
            })
        });
        
        console.log('Events POST status:', createEventResponse.status);
        console.log('Events POST headers:', Object.fromEntries(createEventResponse.headers.entries()));
        
        const createEventData = await createEventResponse.json();
        console.log('Events POST response:', JSON.stringify(createEventData, null, 2));
        
        if (createEventData.success) {
            console.log('✅ Mobile events POST successful');
        } else {
            console.log('❌ Mobile events POST failed:', createEventData.error || createEventData.message);
        }
        
        console.log('\n🎉 Direct Events test completed!');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Run the test
testDirectEvents(); 