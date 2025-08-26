import fetch from 'node-fetch';

const API_BASE = 'https://sacavia.com/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MWJjZTNiOTE3Y2I1ODA2ZjViYjlkNyIsImNvbGxlY3Rpb24iOiJ1c2VycyIsImVtYWlsIjoiYW50b25pb19rb2RoZWxpQGljbG91ZC5jb20iLCJpYXQiOjE3NTUxNDI4ODksImV4cCI6MTc1NTc0NzY4OX0.cdKKuJUlRgM1bo71YQYwrADxY2Rnj2bPFQU5SAj5uVM';

async function forceUnfollow() {
  const currentUserId = '681bce3b917cb5806f5bb9d7'; // Antonio
  const targetUserId = '6867252814aef3f2ed4c1db7'; // Eric
  
  console.log('🔧 Force unfollow operation...');
  console.log(`🔧 Current user ID: ${currentUserId}`);
  console.log(`🔧 Target user ID: ${targetUserId}`);
  
  try {
    // First, let's check the current state
    console.log('\n📊 Checking current state...');
    const profileResponse = await fetch(`${API_BASE}/mobile/users/profile?userId=${currentUserId}`, {
      headers: {
        'Cookie': `payload-token=${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const profileData = await profileResponse.json();
    console.log('📊 Current user following list:', profileData.data?.user?.following || []);
    
    const followersResponse = await fetch(`${API_BASE}/mobile/users/${targetUserId}/followers`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const followersData = await followersResponse.json();
    console.log('📊 Target user followers:', followersData.data?.followers?.map(f => f.name) || []);
    
    // Try multiple unfollow attempts with different approaches
    console.log('\n🔄 Attempting unfollow with different approaches...');
    
    // Approach 1: Direct DELETE request
    console.log('\n🔄 Approach 1: Direct DELETE request');
    const unfollow1Response = await fetch(`${API_BASE}/mobile/users/${targetUserId}/follow`, {
      method: 'DELETE',
      headers: {
        'Cookie': `payload-token=${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🔄 Response status:', unfollow1Response.status);
    const unfollow1Data = await unfollow1Response.json();
    console.log('🔄 Response:', JSON.stringify(unfollow1Data, null, 2));
    
    if (unfollow1Response.status === 200) {
      console.log('✅ Unfollow successful with approach 1!');
    } else {
      console.log('❌ Approach 1 failed, trying approach 2...');
      
      // Approach 2: Try with Authorization header instead of Cookie
      console.log('\n🔄 Approach 2: Using Authorization header');
      const unfollow2Response = await fetch(`${API_BASE}/mobile/users/${targetUserId}/follow`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('🔄 Response status:', unfollow2Response.status);
      const unfollow2Data = await unfollow2Response.json();
      console.log('🔄 Response:', JSON.stringify(unfollow2Data, null, 2));
      
      if (unfollow2Response.status === 200) {
        console.log('✅ Unfollow successful with approach 2!');
      } else {
        console.log('❌ Approach 2 failed, trying approach 3...');
        
        // Approach 3: Try with both headers
        console.log('\n🔄 Approach 3: Using both Cookie and Authorization headers');
        const unfollow3Response = await fetch(`${API_BASE}/mobile/users/${targetUserId}/follow`, {
          method: 'DELETE',
          headers: {
            'Cookie': `payload-token=${TOKEN}`,
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('🔄 Response status:', unfollow3Response.status);
        const unfollow3Data = await unfollow3Response.json();
        console.log('🔄 Response:', JSON.stringify(unfollow3Data, null, 2));
        
        if (unfollow3Response.status === 200) {
          console.log('✅ Unfollow successful with approach 3!');
        } else {
          console.log('❌ All approaches failed');
        }
      }
    }
    
    // Check final state
    console.log('\n📊 Checking final state...');
    const finalProfileResponse = await fetch(`${API_BASE}/mobile/users/profile?userId=${currentUserId}`, {
      headers: {
        'Cookie': `payload-token=${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const finalProfileData = await finalProfileResponse.json();
    console.log('📊 Final following list:', finalProfileData.data?.user?.following || []);
    
    const finalFollowersResponse = await fetch(`${API_BASE}/mobile/users/${targetUserId}/followers`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const finalFollowersData = await finalFollowersResponse.json();
    console.log('📊 Final followers list:', finalFollowersData.data?.followers?.map(f => f.name) || []);
    
  } catch (error) {
    console.error('❌ Force unfollow failed:', error);
  }
}

forceUnfollow();














