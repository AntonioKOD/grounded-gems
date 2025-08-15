import fetch from 'node-fetch';

const API_BASE = 'https://sacavia.com/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MWJjZTNiOTE3Y2I1ODA2ZjViYjlkNyIsImNvbGxlY3Rpb24iOiJ1c2VycyIsImVtYWlsIjoiYW50b25pb19rb2RoZWxpQGljbG91ZC5jb20iLCJpYXQiOjE3NTUxNDI4ODksImV4cCI6MTc1NTc0NzY4OX0.cdKKuJUlRgM1bo71YQYwrADxY2Rnj2bPFQU5SAj5uVM';

async function debugFollowingState() {
  const currentUserId = '681bce3b917cb5806f5bb9d7'; // Antonio
  const targetUserId = '6867252814aef3f2ed4c1db7'; // Eric
  
  console.log('🔍 Debugging following state...');
  console.log(`🔍 Current user ID: ${currentUserId}`);
  console.log(`🔍 Target user ID: ${targetUserId}`);
  
  try {
    // Check current user's profile
    console.log('\n📊 Checking current user profile...');
    const profileResponse = await fetch(`${API_BASE}/mobile/users/profile?userId=${currentUserId}`, {
      headers: {
        'Cookie': `payload-token=${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const profileData = await profileResponse.json();
    console.log('📊 Current user following list:', profileData.data?.user?.following || []);
    console.log('📊 Current user following count:', profileData.data?.user?.following?.length || 0);
    
    // Check target user's profile
    console.log('\n📊 Checking target user profile...');
    const targetProfileResponse = await fetch(`${API_BASE}/mobile/users/profile?userId=${targetUserId}`, {
      headers: {
        'Cookie': `payload-token=${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const targetProfileData = await targetProfileResponse.json();
    console.log('📊 Target user followers list:', targetProfileData.data?.user?.followers || []);
    console.log('📊 Target user followers count:', targetProfileData.data?.user?.followers?.length || 0);
    
    // Check if current user is in target user's followers
    const isInFollowers = targetProfileData.data?.user?.followers?.includes(currentUserId);
    console.log('📊 Is current user in target user\'s followers?', isInFollowers);
    
    // Check if target user is in current user's following
    const isInFollowing = profileData.data?.user?.following?.includes(targetUserId);
    console.log('📊 Is target user in current user\'s following?', isInFollowing);
    
    // Check target user's followers API
    console.log('\n📊 Checking target user followers API...');
    const followersResponse = await fetch(`${API_BASE}/mobile/users/${targetUserId}/followers`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const followersData = await followersResponse.json();
    console.log('📊 Followers API response:', JSON.stringify(followersData, null, 2));
    
    // Check current user's following API
    console.log('\n📊 Checking current user following API...');
    const followingResponse = await fetch(`${API_BASE}/mobile/users/${currentUserId}/following`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const followingData = await followingResponse.json();
    console.log('📊 Following API response:', JSON.stringify(followingData, null, 2));
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('📋 Current user following list (from profile):', profileData.data?.user?.following || []);
    console.log('📋 Target user followers list (from profile):', targetProfileData.data?.user?.followers || []);
    console.log('📋 Current user following list (from API):', followingData.data?.following?.map(f => f.id) || []);
    console.log('📋 Target user followers list (from API):', followersData.data?.followers?.map(f => f.id) || []);
    
    // Check for inconsistencies
    const profileFollowing = profileData.data?.user?.following || [];
    const apiFollowing = followingData.data?.following?.map(f => f.id) || [];
    const profileFollowers = targetProfileData.data?.user?.followers || [];
    const apiFollowers = followersData.data?.followers?.map(f => f.id) || [];
    
    console.log('\n🔍 INCONSISTENCIES:');
    console.log('🔍 Profile vs API Following lists match?', JSON.stringify(profileFollowing.sort()) === JSON.stringify(apiFollowing.sort()));
    console.log('🔍 Profile vs API Followers lists match?', JSON.stringify(profileFollowers.sort()) === JSON.stringify(apiFollowers.sort()));
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugFollowingState();
