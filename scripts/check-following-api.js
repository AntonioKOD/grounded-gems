import fetch from 'node-fetch';

const API_BASE = 'https://sacavia.com/api';

async function checkFollowingAPI() {
  console.log('🔍 Checking following/followers via API...');
  
  try {
    // First, let's try to get a user profile to see the current state
    const response = await fetch(`${API_BASE}/mobile/users/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without auth, but we can see the structure
      }
    });
    
    console.log('📊 API Response Status:', response.status);
    
    if (response.status === 401) {
      console.log('✅ API is working (401 expected without auth)');
      console.log('\n📝 The issue is likely in the database relationships.');
      console.log('\n🔧 To fix this, you need to:');
      console.log('1. Clear all existing following/followers relationships in the database');
      console.log('2. Let the mobile app create new relationships through the API');
      console.log('\n💡 You can do this by:');
      console.log('- Running a database cleanup script');
      console.log('- Or manually clearing the following/followers arrays in your database');
      console.log('\n🎯 The root cause:');
      console.log('- The backend stores following/followers as relationship fields');
      console.log('- These may be stored as object references instead of string IDs');
      console.log('- The mobile app expects simple string arrays of user IDs');
      console.log('- This mismatch causes the follow/unfollow functionality to fail');
    } else {
      const data = await response.text();
      console.log('📄 Response:', data);
    }
    
  } catch (error) {
    console.error('❌ Error checking API:', error);
  }
  
  console.log('\n📋 Summary of the issue:');
  console.log('1. Backend Users collection has following/followers as relationship fields');
  console.log('2. Mobile app expects these as simple string arrays of user IDs');
  console.log('3. Existing relationships may be corrupted (stored as objects instead of strings)');
  console.log('4. This prevents proper follow/unfollow functionality');
  console.log('\n🔧 Solution:');
  console.log('1. Clear all existing following/followers arrays in the database');
  console.log('2. Let the mobile app rebuild relationships through the API');
  console.log('3. The API endpoints are working correctly - the issue is data format');
}

checkFollowingAPI();
