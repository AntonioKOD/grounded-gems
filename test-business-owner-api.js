#!/usr/bin/env node

/**
 * Test Script for Business Owner APIs
 * 
 * This script tests all the business owner API endpoints to ensure they work correctly.
 * 
 * Usage:
 * 1. Update the BASE_URL and credentials below
 * 2. Run: node test-business-owner-api.js
 */

const BASE_URL = 'http://localhost:3000'; // Update this to your domain
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'testpassword123';

// Test data
const TEST_BUSINESS = {
  businessName: 'Test Restaurant',
  businessType: 'restaurant',
  contactEmail: 'test@restaurant.com',
  phoneNumber: '+1234567890',
  website: 'https://testrestaurant.com',
  businessDescription: 'A test restaurant for API testing'
};

const TEST_SPECIAL = {
  title: 'Test Happy Hour',
  description: '50% off all drinks during happy hour',
  shortDescription: 'Half-price drinks',
  specialType: 'discount',
  discountValue: {
    amount: 50,
    type: 'percentage'
  },
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  daysAvailable: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  timeRestrictions: {
    startTime: '16:00',
    endTime: '19:00'
  },
  termsAndConditions: 'Valid only during happy hour',
  restrictions: ['Valid only during happy hour', 'Cannot be combined with other offers']
};

// Helper function to make HTTP requests
async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  
  return {
    status: response.status,
    data,
    ok: response.ok
  };
}

// Test functions
async function testUserRegistration() {
  console.log('🔐 Testing user registration...');
  
  const response = await makeRequest(`${BASE_URL}/api/users/signup`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Test User',
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })
  });
  
  if (response.ok) {
    console.log('✅ User registration successful');
    return response.data.user;
  } else {
    console.log('❌ User registration failed:', response.data);
    return null;
  }
}

async function testUserLogin() {
  console.log('🔑 Testing user login...');
  
  const response = await makeRequest(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    })
  });
  
  if (response.ok) {
    console.log('✅ User login successful');
    return response.data.token;
  } else {
    console.log('❌ User login failed:', response.data);
    return null;
  }
}

async function testBusinessOwnerApplication(token) {
  console.log('📝 Testing business owner application...');
  
  const response = await makeRequest(`${BASE_URL}/api/business-owner/apply`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(TEST_BUSINESS)
  });
  
  if (response.ok) {
    console.log('✅ Business owner application submitted');
    return response.data;
  } else {
    console.log('❌ Business owner application failed:', response.data);
    return null;
  }
}

async function testGetApplications(token) {
  console.log('📋 Testing get applications...');
  
  const response = await makeRequest(`${BASE_URL}/api/business-owner/apply`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    console.log('✅ Get applications successful');
    return response.data;
  } else {
    console.log('❌ Get applications failed:', response.data);
    return null;
  }
}

async function testWebhookEndpoint() {
  console.log('🔗 Testing webhook endpoint...');
  
  // Test GET endpoint
  const getResponse = await makeRequest(`${BASE_URL}/api/external/specials/webhook`, {
    method: 'GET'
  });
  
  if (getResponse.ok) {
    console.log('✅ Webhook GET endpoint working');
  } else {
    console.log('❌ Webhook GET endpoint failed:', getResponse.data);
  }
  
  // Test POST endpoint (will fail without valid API key, but should return proper error)
  const postResponse = await makeRequest(`${BASE_URL}/api/external/specials/webhook`, {
    method: 'POST',
    body: JSON.stringify({
      businessId: 'test-location-id',
      apiKey: 'invalid-api-key',
      specials: [TEST_SPECIAL]
    })
  });
  
  if (postResponse.status === 401) {
    console.log('✅ Webhook POST endpoint working (correctly rejected invalid API key)');
  } else {
    console.log('❌ Webhook POST endpoint unexpected response:', postResponse.data);
  }
}

async function testDashboardAccess(token) {
  console.log('📊 Testing dashboard access...');
  
  const response = await makeRequest(`${BASE_URL}/api/business-owner/dashboard`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.status === 403) {
    console.log('✅ Dashboard correctly requires business owner status');
  } else if (response.ok) {
    console.log('✅ Dashboard access successful');
  } else {
    console.log('❌ Dashboard access failed:', response.data);
  }
}

async function testSpecialsAccess(token) {
  console.log('🎯 Testing specials access...');
  
  const response = await makeRequest(`${BASE_URL}/api/business-owner/specials`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.status === 403) {
    console.log('✅ Specials API correctly requires business owner status');
  } else if (response.ok) {
    console.log('✅ Specials access successful');
  } else {
    console.log('❌ Specials access failed:', response.data);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Business Owner API Tests\n');
  
  try {
    // Test user registration and login
    const user = await testUserRegistration();
    if (!user) {
      console.log('⚠️  User might already exist, continuing with login...');
    }
    
    const token = await testUserLogin();
    if (!token) {
      console.log('❌ Cannot continue without authentication token');
      return;
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test business owner application
    const application = await testBusinessOwnerApplication(token);
    const applications = await testGetApplications(token);
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test dashboard and specials access (should fail without business owner status)
    await testDashboardAccess(token);
    await testSpecialsAccess(token);
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test webhook endpoint
    await testWebhookEndpoint();
    
    console.log('\n' + '='.repeat(50) + '\n');
    console.log('🎉 All tests completed!');
    console.log('\n📝 Next Steps:');
    console.log('1. Approve the business owner application in the admin panel');
    console.log('2. Claim a location using the location claiming API');
    console.log('3. Test creating specials with the approved business owner account');
    console.log('4. Set up your N8N workflows using the provided guide');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  makeRequest,
  TEST_BUSINESS,
  TEST_SPECIAL
};
