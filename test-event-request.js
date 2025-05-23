// Test script for event request functionality
const testEventRequest = async () => {
  const testData = {
    eventTitle: "Test Event Title",
    eventDescription: "This is a detailed description of the test event. We want to host a community gathering with local food and music.",
    eventType: "event_request",
    locationId: "68294311383cfd48bfc6ad78", // Use the location ID from the logs
    requestedDate: "2025-01-20",
    requestedTime: "18:00",
    expectedAttendees: 25,
    specialRequests: "We would like to set up some tables outside if possible.",
    contactEmail: "test@example.com"
  };

  try {
    console.log('Testing event request with data:', testData);
    
    const response = await fetch('http://localhost:3000/api/locations/event-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You would need to add auth headers here for a real test
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', result);
    
    if (response.ok) {
      console.log('✅ Event request submitted successfully!');
    } else {
      console.log('❌ Event request failed:', result.error);
      if (result.missingFields) {
        console.log('Missing fields:', result.missingFields);
      }
    }
  } catch (error) {
    console.error('Error testing event request:', error);
  }
};

// Run the test
testEventRequest(); 