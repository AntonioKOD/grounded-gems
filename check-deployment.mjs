import fetch from 'node-fetch';

const API_BASE = 'https://sacavia.com/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MWJjZTNiOTE3Y2I1ODA2ZjViYjlkNyIsImNvbGxlY3Rpb24iOiJ1c2VycyIsImVtYWlsIjoiYW50b25pb19rb2RoZWxpQGljbG91ZC5jb20iLCJpYXQiOjE3NTUxNDI4ODksImV4cCI6MTc1NTc0NzY4OX0.cdKKuJUlRgM1bo71YQYwrADxY2Rnj2bPFQU5SAj5uVM';

async function checkDeployment() {
  const targetUserId = '6867252814aef3f2ed4c1db7'; // Eric
  
  console.log('🔍 Checking deployment status...');
  console.log(`🔍 Testing unfollow API for user: ${targetUserId}`);
  
  try {
    // Test the unfollow operation
    const unfollowResponse = await fetch(`${API_BASE}/mobile/users/${targetUserId}/follow`, {
      method: 'DELETE',
      headers: {
        'Cookie': `payload-token=${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🔄 Response status:', unfollowResponse.status);
    
    if (unfollowResponse.status === 200) {
      console.log('✅ DEPLOYMENT SUCCESSFUL! Unfollow operation is working.');
      const data = await unfollowResponse.json();
      console.log('✅ Response:', JSON.stringify(data, null, 2));
    } else if (unfollowResponse.status === 409) {
      console.log('⏳ Deployment might still be in progress...');
      console.log('⏳ Still getting 409 error, which means old logic is running');
      
      // Check if we can see any of our new logging messages
      const data = await unfollowResponse.json();
      console.log('⏳ Response:', JSON.stringify(data, null, 2));
      
      console.log('⏳ Waiting for deployment to complete...');
      console.log('⏳ This usually takes 2-5 minutes after pushing to main branch');
    } else {
      console.log('❌ Unexpected response status:', unfollowResponse.status);
      const data = await unfollowResponse.json();
      console.log('❌ Response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkDeployment();

