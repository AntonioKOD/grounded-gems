import fetch from 'node-fetch';

const API_BASE = 'https://sacavia.com/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MWJjZTNiOTE3Y2I1ODA2ZjViYjlkNyIsImNvbGxlY3Rpb24iOiJ1c2VycyIsImVtYWlsIjoiYW50b25pb19rb2RoZWxpQGljbG91ZC5jb20iLCJpYXQiOjE3NTUxNDI4ODksImV4cCI6MTc1NTc0NzY4OX0.cdKKuJUlRgM1bo71YQYwrADxY2Rnj2bPFQU5SAj5uVM';

async function testUnfollow() {
  const targetUserId = '6867252814aef3f2ed4c1db7'; // Eric's user ID
  
  console.log('🔍 Testing unfollow functionality...');
  console.log(`🔍 Target user ID: ${targetUserId}`);
  
  try {
    // First, let's check the current state
    console.log('\n📊 Checking current user profile...');
    const profileResponse = await fetch(`${API_BASE}/mobile/users/profile?userId=681bce3b917cb5806f5bb9d7`, {
      headers: {
        'Cookie': `payload-token=${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const profileData = await profileResponse.json();
    console.log('📊 Current user following list:', profileData.data?.user?.following || []);
    
    // Check target user's followers
    console.log('\n📊 Checking target user followers...');
    const followersResponse = await fetch(`${API_BASE}/mobile/users/${targetUserId}/followers`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const followersData = await followersResponse.json();
    console.log('📊 Target user followers:', followersData.data?.followers?.map(f => f.name) || []);
    
    // Now test the unfollow operation
    console.log('\n🔄 Testing unfollow operation...');
    const unfollowResponse = await fetch(`${API_BASE}/mobile/users/${targetUserId}/follow`, {
      method: 'DELETE',
      headers: {
        'Cookie': `payload-token=${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const unfollowData = await unfollowResponse.json();
    console.log('🔄 Unfollow response status:', unfollowResponse.status);
    console.log('🔄 Unfollow response:', JSON.stringify(unfollowData, null, 2));
    
    if (unfollowResponse.status === 200) {
      console.log('✅ Unfollow successful!');
      
      // Check the updated state
      console.log('\n📊 Checking updated user profile...');
      const updatedProfileResponse = await fetch(`${API_BASE}/mobile/users/profile?userId=681bce3b917cb5806f5bb9d7`, {
        headers: {
          'Cookie': `payload-token=${TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      const updatedProfileData = await updatedProfileResponse.json();
      console.log('📊 Updated following list:', updatedProfileData.data?.user?.following || []);
      
      // Check updated target user's followers
      console.log('\n📊 Checking updated target user followers...');
      const updatedFollowersResponse = await fetch(`${API_BASE}/mobile/users/${targetUserId}/followers`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      const updatedFollowersData = await updatedFollowersResponse.json();
      console.log('📊 Updated target user followers:', updatedFollowersData.data?.followers?.map(f => f.name) || []);
      
    } else {
      console.log('❌ Unfollow failed:', unfollowData.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUnfollow();
