import fetch from 'node-fetch';

const API_BASE = 'https://sacavia.com/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MWJjZTNiOTE3Y2I1ODA2ZjViYjlkNyIsImNvbGxlY3Rpb24iOiJ1c2VycyIsImVtYWlsIjoiYW50b25pb19rb2RoZWxpQGljbG91ZC5jb20iLCJpYXQiOjE3NTUxNDI4ODksImV4cCI6MTc1NTc0NzY4OX0.cdKKuJUlRgM1bo71YQYwrADxY2Rnj2bPFQU5SAj5uVM';

async function fixFollowingData() {
  const currentUserId = '681bce3b917cb5806f5bb9d7'; // Antonio
  const targetUserId = '6867252814aef3f2ed4c1db7'; // Eric
  
  console.log('🔧 Fixing following data inconsistency...');
  console.log(`🔧 Current user ID: ${currentUserId}`);
  console.log(`🔧 Target user ID: ${targetUserId}`);
  
  try {
    // First, let's check the current state
    console.log('\n📊 Checking current state...');
    const debugResponse = await fetch(`${API_BASE}/debug-following-state`, {
      method: 'POST',
      headers: {
        'Cookie': `payload-token=${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        currentUserId,
        targetUserId
      })
    });
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.json();
      console.log('📊 Debug data:', JSON.stringify(debugData, null, 2));
    } else {
      console.log('📊 No debug endpoint available, proceeding with manual fix');
    }
    
    // Try to follow the user first to ensure the relationship is properly established
    console.log('\n🔄 Attempting to follow user to establish proper relationship...');
    const followResponse = await fetch(`${API_BASE}/mobile/users/${targetUserId}/follow`, {
      method: 'POST',
      headers: {
        'Cookie': `payload-token=${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const followData = await followResponse.json();
    console.log('🔄 Follow response status:', followResponse.status);
    console.log('🔄 Follow response:', JSON.stringify(followData, null, 2));
    
    if (followResponse.status === 200) {
      console.log('✅ Follow successful, relationship established');
      
      // Now try to unfollow
      console.log('\n🔄 Now attempting to unfollow...');
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
        
        // Check the final state
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
        
      } else {
        console.log('❌ Unfollow failed:', unfollowData.message);
      }
      
    } else {
      console.log('❌ Follow failed:', followData.message);
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixFollowingData();

