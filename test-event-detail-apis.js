// Test script for event detail APIs

const BASE_URL = 'http://localhost:3000';

async function testEventDetailAPIs() {
    console.log('🧪 Testing Event Detail APIs...\n');
    
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
        
        // Step 2: Get events to find an event ID
        console.log('📋 Step 2: Getting events...');
        const eventsResponse = await fetch(`${BASE_URL}/api/mobile/events?type=created&limit=5`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const eventsData = await eventsResponse.json();
        
        console.log('Response status:', eventsResponse.status);
        console.log('Response data:', JSON.stringify(eventsData, null, 2));
        
        let eventId;
        
        if (!eventsData.success || !eventsData.data?.events || eventsData.data.events.length === 0) {
            console.log('❌ No events found, creating a test event...');
            
            // Create a test event
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
            
            const createEventResponse = await fetch(`${BASE_URL}/api/mobile/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: 'Test Event for API Testing',
                    description: 'This is a test event created to test the participant and invite APIs',
                    startDate: futureDate.toISOString(),
                    location: 'Different Test Location',
                    category: 'social',
                    eventType: 'meetup',
                    maxParticipants: 50
                })
            });
            
            const createEventData = await createEventResponse.json();
            
            if (createEventData.success && createEventData.data?.event) {
                eventId = createEventData.data.event.id;
                console.log(`✅ Created test event: ${createEventData.data.event.title} (ID: ${eventId})\n`);
            } else {
                console.log('❌ Failed to create test event:', createEventData.error || createEventData.message);
                return;
            }
        } else {
            eventId = eventsData.data.events[0].id;
            console.log(`✅ Found event: ${eventsData.data.events[0].title} (ID: ${eventId})\n`);
        }
        
        // Step 3: Test getting event participants
        console.log('👥 Step 3: Testing get event participants...');
        const participantsResponse = await fetch(`${BASE_URL}/api/mobile/events/${eventId}/participants`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const participantsData = await participantsResponse.json();
        
        if (participantsData.success) {
            console.log('✅ Get participants successful');
            console.log(`   - Total participants: ${participantsData.data.totalCount}`);
            console.log(`   - Participants:`, participantsData.data.participants);
        } else {
            console.log('❌ Get participants failed:', participantsData.error || participantsData.message);
        }
        console.log('');
        
        // Step 4: Test inviting users to event
        console.log('📨 Step 4: Testing invite users to event...');
        
        // First, get some users to invite
        const usersResponse = await fetch(`${BASE_URL}/api/mobile/users?limit=3`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const usersData = await usersResponse.json();
        
        if (usersData.success && usersData.data?.users && usersData.data.users.length > 0) {
            const userIdsToInvite = usersData.data.users.slice(0, 2).map(user => user.id);
            
            const inviteResponse = await fetch(`${BASE_URL}/api/mobile/events/${eventId}/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userIds: userIdsToInvite
                })
            });
            
            const inviteData = await inviteResponse.json();
            
            if (inviteData.success) {
                console.log('✅ Invite users successful');
                console.log(`   - Invited users: ${inviteData.data.totalInvited}`);
                console.log(`   - User IDs:`, inviteData.data.invitedUsers);
            } else {
                console.log('❌ Invite users failed:', inviteData.error || inviteData.message);
            }
        } else {
            console.log('⚠️  No users found to invite');
        }
        console.log('');
        
        // Step 5: Test RSVP functionality
        console.log('🎫 Step 5: Testing RSVP functionality...');
        const rsvpResponse = await fetch(`${BASE_URL}/api/mobile/events/${eventId}/rsvp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status: 'going'
            })
        });
        
        const rsvpData = await rsvpResponse.json();
        
        if (rsvpData.success) {
            console.log('✅ RSVP successful');
            console.log(`   - Status: ${rsvpData.data?.status || 'going'}`);
        } else {
            console.log('❌ RSVP failed:', rsvpData.error || rsvpData.message);
        }
        console.log('');
        
        // Step 6: Get participants again to see the new RSVP
        console.log('👥 Step 6: Getting participants again to verify RSVP...');
        const participantsResponse2 = await fetch(`${BASE_URL}/api/mobile/events/${eventId}/participants`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const participantsData2 = await participantsResponse2.json();
        
        if (participantsData2.success) {
            console.log('✅ Get participants successful');
            console.log(`   - Total participants: ${participantsData2.data.totalCount}`);
            
            // Find current user's participation
            const currentUserParticipation = participantsData2.data.participants.find(
                p => p.user?.id === loginData.data.user.id
            );
            
            if (currentUserParticipation) {
                console.log(`   - Current user status: ${currentUserParticipation.status}`);
            }
        } else {
            console.log('❌ Get participants failed:', participantsData2.error || participantsData2.message);
        }
        
        console.log('\n🎉 Event Detail APIs test completed!');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Run the test
testEventDetailAPIs(); 