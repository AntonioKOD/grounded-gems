const { getPayload } = require('./dist/payload');
const path = require('path');

async function testRSVPCounts() {
  try {
    const payload = await getPayload({
      // Add your payload config here
    });

    console.log('🔍 Testing RSVP count updates...');

    // Get a test event
    const { docs: events } = await payload.find({
      collection: 'events',
      limit: 1
    });

    if (events.length === 0) {
      console.log('❌ No events found in database');
      return;
    }

    const testEvent = events[0];
    console.log(`📅 Testing with event: ${testEvent.name} (ID: ${testEvent.id})`);
    console.log(`📊 Current counts - Going: ${testEvent.goingCount || 0}, Interested: ${testEvent.interestedCount || 0}, Invited: ${testEvent.invitedCount || 0}`);

    // Get a test user
    const { docs: users } = await payload.find({
      collection: 'users',
      limit: 1
    });

    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }

    const testUser = users[0];
    console.log(`👤 Using test user: ${testUser.name} (ID: ${testUser.id})`);

    // Create an RSVP
    const rsvpData = {
      event: testEvent.id,
      user: testUser.id,
      status: 'going'
    };

    console.log('🔄 Creating RSVP...');
    const rsvp = await payload.create({
      collection: 'eventRSVPs',
      data: rsvpData
    });

    console.log(`✅ RSVP created: ${rsvp.id}`);

    // Manually update the event counts (simulating the RSVP API logic)
    const currentEvent = await payload.findByID({
      collection: 'events',
      id: testEvent.id,
      depth: 0
    });

    if (currentEvent) {
      let goingCount = currentEvent.goingCount || 0;
      let interestedCount = currentEvent.interestedCount || 0;
      let invitedCount = currentEvent.invitedCount || 0;

      // Add to going count
      goingCount += 1;

      console.log(`📊 Updating counts - Going: ${goingCount}, Interested: ${interestedCount}, Invited: ${invitedCount}`);

      // Update the event
      const updatedEvent = await payload.update({
        collection: 'events',
        id: testEvent.id,
        data: {
          goingCount,
          interestedCount,
          invitedCount
        }
      });

      console.log(`✅ Event updated successfully`);
      console.log(`📊 New counts - Going: ${updatedEvent.goingCount}, Interested: ${updatedEvent.interestedCount}, Invited: ${updatedEvent.invitedCount}`);
    }

    // Verify the counts were updated
    const verifyEvent = await payload.findByID({
      collection: 'events',
      id: testEvent.id,
      depth: 0
    });

    console.log(`🔍 Verification - Final counts:`);
    console.log(`   Going: ${verifyEvent.goingCount || 0}`);
    console.log(`   Interested: ${verifyEvent.interestedCount || 0}`);
    console.log(`   Invited: ${verifyEvent.invitedCount || 0}`);

    // Check if there are any RSVP records
    const { docs: rsvps } = await payload.find({
      collection: 'eventRSVPs',
      where: {
        event: { equals: testEvent.id }
      }
    });

    console.log(`📋 Found ${rsvps.length} RSVP records for this event`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing RSVP counts:', error);
    process.exit(1);
  }
}

testRSVPCounts();
