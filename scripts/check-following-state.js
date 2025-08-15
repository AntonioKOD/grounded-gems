import { getPayload } from 'payload';
import config from '../payload.config.ts';

async function checkFollowingState() {
  console.log('🔍 Checking following/followers relationships state...');
  
  try {
    const payload = await getPayload({ config });
    
    // Get all users
    const allUsers = await payload.find({
      collection: 'users',
      limit: 100, // Limit for readability
    });
    
    console.log(`📊 Found ${allUsers.totalDocs} users to check`);
    
    let usersWithFollowing = 0;
    let usersWithFollowers = 0;
    let totalFollowingRelationships = 0;
    let totalFollowersRelationships = 0;
    
    for (const user of allUsers.docs) {
      const following = Array.isArray(user.following) ? user.following : [];
      const followers = Array.isArray(user.followers) ? user.followers : [];
      
      if (following.length > 0) {
        usersWithFollowing++;
        totalFollowingRelationships += following.length;
        console.log(`👤 ${user.name} (${user.id})`);
        console.log(`   Following: ${following.length} users`);
        console.log(`   Following IDs: ${following.map(id => typeof id === 'string' ? id : id?.id || 'invalid').join(', ')}`);
      }
      
      if (followers.length > 0) {
        usersWithFollowers++;
        totalFollowersRelationships += followers.length;
        console.log(`👤 ${user.name} (${user.id})`);
        console.log(`   Followers: ${followers.length} users`);
        console.log(`   Follower IDs: ${followers.map(id => typeof id === 'string' ? id : id?.id || 'invalid').join(', ')}`);
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`👥 Total users: ${allUsers.totalDocs}`);
    console.log(`👤 Users with following: ${usersWithFollowing}`);
    console.log(`👤 Users with followers: ${usersWithFollowers}`);
    console.log(`🔗 Total following relationships: ${totalFollowingRelationships}`);
    console.log(`🔗 Total followers relationships: ${totalFollowersRelationships}`);
    
    // Check for potential issues
    if (totalFollowingRelationships > 0 || totalFollowersRelationships > 0) {
      console.log(`\n⚠️  Issues detected:`);
      console.log(`- There are existing following/followers relationships that may be corrupted`);
      console.log(`- These relationships may be stored as object references instead of string IDs`);
      console.log(`- This could cause issues with the mobile app's follow/unfollow functionality`);
      console.log(`\n💡 Recommendation: Run the fix-following-relationships.js script to clear and rebuild relationships`);
    } else {
      console.log(`\n✅ No existing relationships found - database is clean!`);
    }
    
  } catch (error) {
    console.error('❌ Error checking following state:', error);
  }
  
  process.exit(0);
}

// Run the script
checkFollowingState();
