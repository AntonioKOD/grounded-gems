// Test script for mobile events API

const BASE_URL = 'http://localhost:3000';

async function testEventsAPI() {
    console.log('🧪 Testing Mobile Events API...\n');
    
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
        console.log('✅ Login successful\n');
        
        // Step 2: Test mobile events API
        console.log('📋 Step 2: Testing mobile events API...');
        const eventsResponse = await fetch(`${BASE_URL}/api/mobile/events?limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Response status:', eventsResponse.status);
        const eventsData = await eventsResponse.json();
        console.log('Response data:', JSON.stringify(eventsData, null, 2));
        
        if (eventsData.success) {
            console.log('✅ Mobile events API successful');
            console.log(`   - Total events: ${eventsData.data?.events?.length || 0}`);
            if (eventsData.data?.events) {
                eventsData.data.events.forEach((event, index) => {
                    console.log(`   ${index + 1}. ${event.name} (${event.id})`);
                });
            }
        } else {
            console.log('❌ Mobile events API failed:', eventsData.error || eventsData.message);
        }
        console.log('');
        
        // Step 3: Test regular events API for comparison
        console.log('📋 Step 3: Testing regular events API for comparison...');
        const regularEventsResponse = await fetch(`${BASE_URL}/api/events?limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Regular API Response status:', regularEventsResponse.status);
        const regularEventsData = await regularEventsResponse.json();
        console.log('Regular API Response data:', JSON.stringify(regularEventsData, null, 2));
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Run the test
testEventsAPI(); 