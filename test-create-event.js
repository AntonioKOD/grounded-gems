// Using built-in fetch (Node.js 18+)

const BASE_URL = 'http://localhost:3000';

async function testCreateEvent() {
    console.log('🧪 Testing Create Event API...\n');
    
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
        
        console.log('✅ Login successful');
        console.log('Token:', loginData.data.token.substring(0, 20) + '...');
        console.log('');
        
        // Step 2: Create a test event
        console.log('📅 Step 2: Creating test event...');
        
        const eventData = {
            title: "Test iOS Event 4",
            description: "This is a fourth test event created from the iOS app testing with full validation",
            startDate: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(), // 4 days from now
            endDate: new Date(Date.now() + 97 * 60 * 60 * 1000).toISOString(), // 4 days from now + 1 hour
            location: "Test Location 4",
            maxParticipants: 50,
            eventType: "social_event",
            category: "social",
            durationMinutes: 120,
            status: "published",
            privacy: "public",
            tags: ["test", "mobile", "ios"],
            meta: {
                title: "Test iOS Event 4",
                description: "A comprehensive test event for mobile validation"
            }
        };
        
        console.log('Event data:', eventData);
        
        const createEventResponse = await fetch(`${BASE_URL}/api/mobile/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `payload-token=${loginData.data.token}`
            },
            body: JSON.stringify(eventData)
        });
        
        const createEventData = await createEventResponse.json();
        
        console.log('Status:', createEventResponse.status);
        console.log('Success:', createEventData.success);
        
        if (createEventData.success) {
            console.log('✅ Event created successfully!');
            console.log('Event ID:', createEventData.data?.event?.id);
            console.log('Event Title:', createEventData.data?.event?.name); // Events collection uses 'name' field
        } else {
            console.log('❌ Event creation failed:', createEventData.error || createEventData.message);
        }
        console.log('');
        
        // Step 3: Verify the event was created by fetching user's events
        console.log('🔍 Step 3: Verifying event was created...');
        
        const userEventsResponse = await fetch(`${BASE_URL}/api/mobile/events?type=created&limit=10`, {
            headers: {
                'Cookie': `payload-token=${loginData.data.token}`
            }
        });
        
        const userEventsData = await userEventsResponse.json();
        
        console.log('Status:', userEventsResponse.status);
        console.log('Success:', userEventsData.success);
        console.log('User events count:', userEventsData.data?.events?.length || 0);
        
        if (userEventsData.data?.events?.length > 0) {
            console.log('✅ Found user events:');
            userEventsData.data.events.forEach((event, index) => {
                console.log(`  ${index + 1}. ${event.title} (${event.id})`); // Mobile API returns 'title' field
            });
        } else {
            console.log('❌ No user events found');
        }
        
        console.log('\n✅ Create Event API tests completed!');
        
    } catch (error) {
        console.error('❌ Error testing create event API:', error.message);
    }
}

testCreateEvent(); 