// Test validation for mobile events API

const BASE_URL = 'http://localhost:3000';

async function testEventValidation() {
    console.log('🧪 Testing Event Validation...\n');
    
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
        
        // Test 1: Missing title
        console.log('📝 Test 1: Missing title...');
        const missingTitleData = {
            description: "This event has no title",
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            location: "Validation Test Location 3",
            eventType: "social_event",
            category: "social"
        };
        
        const missingTitleResponse = await fetch(`${BASE_URL}/api/mobile/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `payload-token=${loginData.data.token}`
            },
            body: JSON.stringify(missingTitleData)
        });
        
        const missingTitleResult = await missingTitleResponse.json();
        console.log('Status:', missingTitleResponse.status);
        console.log('Success:', missingTitleResult.success);
        if (!missingTitleResult.success) {
            console.log('✅ Validation working - Missing title error:', missingTitleResult.error);
        } else {
            console.log('❌ Validation failed - Should have rejected missing title');
        }
        console.log('');
        
        // Test 2: Missing description
        console.log('📝 Test 2: Missing description...');
        const missingDescData = {
            title: "Event with no description",
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            location: "Validation Test Location 4",
            eventType: "social_event",
            category: "social"
        };
        
        const missingDescResponse = await fetch(`${BASE_URL}/api/mobile/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `payload-token=${loginData.data.token}`
            },
            body: JSON.stringify(missingDescData)
        });
        
        const missingDescResult = await missingDescResponse.json();
        console.log('Status:', missingDescResponse.status);
        console.log('Success:', missingDescResult.success);
        if (!missingDescResult.success) {
            console.log('✅ Validation working - Missing description error:', missingDescResult.error);
        } else {
            console.log('❌ Validation failed - Should have rejected missing description');
        }
        console.log('');
        
        // Test 3: Missing start date
        console.log('📝 Test 3: Missing start date...');
        const missingDateData = {
            title: "Event with no start date",
            description: "This event has no start date",
            location: "Validation Test Location 5",
            eventType: "social_event",
            category: "social"
        };
        
        const missingDateResponse = await fetch(`${BASE_URL}/api/mobile/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `payload-token=${loginData.data.token}`
            },
            body: JSON.stringify(missingDateData)
        });
        
        const missingDateResult = await missingDateResponse.json();
        console.log('Status:', missingDateResponse.status);
        console.log('Success:', missingDateResult.success);
        if (!missingDateResult.success) {
            console.log('✅ Validation working - Missing start date error:', missingDateResult.error);
        } else {
            console.log('❌ Validation failed - Should have rejected missing start date');
        }
        console.log('');
        
        // Test 4: Invalid category
        console.log('📝 Test 4: Invalid category...');
        const invalidCategoryData = {
            title: "Event with invalid category",
            description: "This event has an invalid category",
            startDate: new Date(Date.now() + 144 * 60 * 60 * 1000).toISOString(), // 6 days from now
            location: "Validation Test Location 6",
            eventType: "social_event",
            category: "invalid_category"
        };
        
        const invalidCategoryResponse = await fetch(`${BASE_URL}/api/mobile/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `payload-token=${loginData.data.token}`
            },
            body: JSON.stringify(invalidCategoryData)
        });
        
        const invalidCategoryResult = await invalidCategoryResponse.json();
        console.log('Status:', invalidCategoryResponse.status);
        console.log('Success:', invalidCategoryResult.success);
        if (invalidCategoryResult.success) {
            console.log('✅ Validation working - Invalid category defaulted to "social"');
        } else {
            console.log('❌ Validation failed - Should have accepted with default category');
            console.log('Error details:', invalidCategoryResult.error);
        }
        console.log('');
        
        // Test 5: Valid event with all required fields
        console.log('📝 Test 5: Valid event with all required fields...');
        const validEventData = {
            title: "Valid Test Event",
            description: "This is a valid test event with all required fields",
            startDate: new Date(Date.now() + 168 * 60 * 60 * 1000).toISOString(), // 7 days from now
            endDate: new Date(Date.now() + 169 * 60 * 60 * 1000).toISOString(),
            location: "Validation Test Location 2",
            maxParticipants: 25,
            eventType: "workshop",
            category: "education",
            durationMinutes: 90,
            status: "published",
            privacy: "public",
            tags: ["validation", "test", "education"],
            meta: {
                title: "Valid Test Event",
                description: "A properly validated test event"
            }
        };
        
        const validEventResponse = await fetch(`${BASE_URL}/api/mobile/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `payload-token=${loginData.data.token}`
            },
            body: JSON.stringify(validEventData)
        });
        
        const validEventResult = await validEventResponse.json();
        console.log('Status:', validEventResponse.status);
        console.log('Success:', validEventResult.success);
        if (validEventResult.success) {
            console.log('✅ Validation working - Valid event created successfully');
            console.log('Event ID:', validEventResult.data?.event?.id);
        } else {
            console.log('❌ Validation failed - Should have accepted valid event');
            console.log('Error:', validEventResult.error);
        }
        
        console.log('\n✅ Event Validation tests completed!');
        
    } catch (error) {
        console.error('❌ Error testing event validation:', error.message);
    }
}

testEventValidation(); 